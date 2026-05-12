import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";
import {
  authenticateJWT,
  requireUploadPermission,
  checkUploadQuota,
} from "../middlewares/auth";
import {
  validateFileFormat,
  validateStationSlug,
} from "../modules/validator/fileValidator";
import { FileUploadRepository } from "../repositories/fileUploadRepository";
import { StorageService } from "../services/storageService";
import { ProgressService } from "../services/progressService";
import { logUploadAction } from "../modules/logger/auditLogger";
import { ErrorCode } from "../shared/types/upload";
import type {
  DataCategory,
  UploadMetadata,
} from "../shared/types/upload";

const router = Router();

// multer 暫存至 uploads/tmp
const tmpDir = path.join(process.env.UPLOAD_DIR ?? "uploads", "tmp");
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({
  dest: tmpDir,
  fileFilter: (_req, file, cb) => {
    // multer 預設以 latin1 解讀檔名，這裡在最早階段修正為 UTF-8
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, true);
  },
});

const authMiddlewares = [
  authenticateJWT,
  requireUploadPermission,
  checkUploadQuota,
];

// POST /api/uploads
router.post(
  "/",
  ...authMiddlewares,
  upload.array("files"),
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const files = req.files as Express.Multer.File[];
    const dataCategory = req.body.dataCategory as DataCategory;
    let metadata: UploadMetadata;
    try {
      metadata = req.body.metadata
        ? JSON.parse(req.body.metadata)
        : {
            collectionDate: new Date().toISOString().slice(0, 10),
            locationDescription: "",
            equipmentModel: "",
            station: req.body.station,
          };
    } catch {
      res.status(400).json({ error: "INVALID_METADATA", message: "metadata 格式錯誤" });
      return;
    }

    if (!validateStationSlug(metadata.station)) {
      res.status(400).json({ error: "INVALID_STATION", message: "測站參數不合法" });
      return;
    }

    if (!files?.length) {
      res.status(400).json({ error: "NO_FILES", message: "未收到任何檔案" });
      return;
    }

    // 前置驗證所有檔案
    const validationErrors: {
      fileName: string;
      reason: string;
      detail: string;
    }[] = [];
    for (const f of files) {
      const fmtResult = validateFileFormat(f.originalname, dataCategory);
      if (!fmtResult.valid) {
        validationErrors.push({
          fileName: f.originalname,
          reason: "UNSUPPORTED_FORMAT",
          detail: fmtResult.error!,
        });
      }
    }

    if (validationErrors.length) {
      // 清除暫存
      files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      res.status(400).json({
        error: ErrorCode.FILE_VALIDATION_FAILED,
        details: validationErrors,
      });
      return;
    }

    // 逐檔建立記錄並非同步處理
    const uploadIds: number[] = [];

    for (const f of files) {
      const record = await FileUploadRepository.create({
        userId: user.userId,
        fileName: f.originalname,
        filePath: "",
        fileSize: f.size,
        dataCategory,
        station: metadata.station,
        metadata,
      });

      uploadIds.push(record.uploadId);
      ProgressService.set(record.uploadId, 0, "uploading");
      logUploadAction(
        user.userId,
        "UPLOAD_START",
        record.uploadId,
        req.ip ?? "",
      );

      // 非同步儲存
      (async () => {
        try {
          ProgressService.set(record.uploadId, 50, "uploading");
          const filePath = await StorageService.saveFile(
            f.path,
            f.originalname,
            dataCategory,
            metadata.station,
          );

          await FileUploadRepository.updateStatus(
            record.uploadId,
            "completed",
            "valid",
          );
          // 補寫 file_path（updateStatus 不含此欄，直接 query）
          await import("../db/pool").then(({ pool }) =>
            pool.query(
              "UPDATE file_uploads SET file_path = $1 WHERE upload_id = $2",
              [filePath, record.uploadId],
            ),
          );

          ProgressService.set(record.uploadId, 100, "completed");
          logUploadAction(
            user.userId,
            "UPLOAD_COMPLETE",
            record.uploadId,
            req.ip ?? "",
          );

          // 30 秒後清除進度快取
          setTimeout(() => ProgressService.delete(record.uploadId), 30_000);
        } catch (err) {
          // Always notify SSE first so UI does not get stuck in uploading state.
          ProgressService.set(record.uploadId, 0, "failed");
          try {
            await FileUploadRepository.updateStatus(
              record.uploadId,
              "failed",
              "invalid",
              { message: String(err) },
            );
            logUploadAction(
              user.userId,
              "UPLOAD_FAILED",
              record.uploadId,
              req.ip ?? "",
              { error: String(err) },
            );
          } catch (dbErr) {
            console.error("Failed to persist failed upload status:", dbErr);
          }
        }
      })();
    }

    res.status(202).json({ uploadIds, message: "上傳已開始處理" });
  },
);

// GET /api/uploads/progress/:uploadId  (SSE)
// SSE 不支援自訂 header，允許從 query string 取得 token
router.get(
  "/progress/:uploadId",
  (req: Request, res: Response, next) => {
    if (req.query.token)
      req.headers.authorization = `Bearer ${req.query.token}`;
    next();
  },
  authenticateJWT,
  (req: Request, res: Response) => {
    const uploadId = parseInt(req.params.uploadId, 10);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (data: object) =>
      res.write(`data: ${JSON.stringify(data)}\n\n`);

    const interval = setInterval(() => {
      const state = ProgressService.get(uploadId);
      if (!state) {
        send({ uploadId, progress: 0, status: "unknown" });
        return;
      }
      send(state);
      if (
        state.status === "completed" ||
        state.status === "failed" ||
        state.status === "cancelled"
      ) {
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    req.on("close", () => clearInterval(interval));
  },
);

// DELETE /api/uploads/history/:uploadId
router.delete(
  "/history/:uploadId",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const uploadId = parseInt(req.params.uploadId, 10);
    if (Number.isNaN(uploadId)) {
      res.status(400).json({ message: "無效的 uploadId" });
      return;
    }

    const record = await FileUploadRepository.findById(uploadId);
    if (!record) {
      res.status(404).json({ error: ErrorCode.UPLOAD_NOT_FOUND });
      return;
    }

    if (record.uploadStatus === "uploading") {
      res.status(409).json({ message: "上傳進行中，請先取消上傳" });
      return;
    }

    const canDelete =
      user.roleCode === "system_admin" ||
      user.roleCode === "data_manager" ||
      record.userId === user.userId;
    if (!canDelete) {
      res
        .status(403)
        .json({ error: ErrorCode.FORBIDDEN, message: "無刪除此資料的權限" });
      return;
    }

    if (record.filePath) {
      await StorageService.deleteFile(record.filePath);
    }

    const deleted = await FileUploadRepository.deleteById(uploadId);
    if (!deleted) {
      res.status(404).json({ error: ErrorCode.UPLOAD_NOT_FOUND });
      return;
    }

    ProgressService.delete(uploadId);
    logUploadAction(user.userId, "UPLOAD_DELETE", uploadId, req.ip ?? "", {
      fileName: record.fileName,
      ownerUserId: record.userId,
    });

    res.json({ message: "歷史資料已刪除" });
  },
);

// DELETE /api/uploads/:uploadId
router.delete(
  "/:uploadId",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const uploadId = parseInt(req.params.uploadId, 10);

    const record = await FileUploadRepository.findById(uploadId);
    if (!record) {
      res.status(404).json({ error: ErrorCode.UPLOAD_NOT_FOUND });
      return;
    }
    if (record.uploadStatus === "completed") {
      res.status(409).json({ error: ErrorCode.UPLOAD_ALREADY_COMPLETED });
      return;
    }

    await FileUploadRepository.updateStatus(uploadId, "cancelled");
    ProgressService.set(uploadId, 0, "cancelled");

    if (record.filePath) await StorageService.deleteFile(record.filePath);

    logUploadAction(user.userId, "UPLOAD_CANCEL", uploadId, req.ip ?? "");
    res.json({ message: "上傳已取消" });
  },
);

// GET /api/uploads/by-category/:category
router.get(
  "/by-category/:category",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const category = req.params.category;
    const page  = req.query.page  ? parseInt(req.query.page  as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const result = await FileUploadRepository.findAll({ dataCategory: category, page, limit });
    res.json({ total: result.total, page, limit, records: result.records });
  },
);

// GET /api/uploads/history
router.get(
  "/history",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const isAdmin = user.roleCode === "system_admin";

    const filter = {
      userId:
        isAdmin && req.query.userId
          ? parseInt(req.query.userId as string, 10)
          : isAdmin && req.query.all === "true"
            ? undefined
            : user.userId,
      station: req.query.station as string | undefined,
      status: req.query.status as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await FileUploadRepository.findAll(filter);
    res.json({
      total: result.total,
      page: filter.page,
      limit: filter.limit,
      records: result.records,
    });
  },
);

export default router;
