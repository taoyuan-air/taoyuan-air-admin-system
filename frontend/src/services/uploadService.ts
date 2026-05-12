import { apiUrl } from "../config/api";

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function asNetworkError(err: unknown): Error {
  if (err instanceof TypeError) {
    return new Error("無法連線到後端 API，請確認 backend 已啟動且可存取。");
  }
  return err instanceof Error ? err : new Error("網路連線異常");
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export interface UploadResponse {
  uploadIds: number[];
  message: string;
}

export interface UploadValidationError {
  fileName: string;
  reason: string;
  detail: string;
}

export interface HistoryRecord {
  uploadId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  dataCategory: string;
  station: string;
  uploadStatus: string;
  validationStatus: string;
  metadata?: object;
  createdAt: string;
  username?: string;
}

export interface HistoryResponse {
  total: number;
  page: number;
  limit: number;
  records: HistoryRecord[];
}

export const uploadService = {
  async uploadFiles(
    files: File[],
    dataCategory: string,
    token: string,
    metadata?: object,
  ): Promise<UploadResponse> {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("dataCategory", dataCategory);
    if (metadata) form.append("metadata", JSON.stringify(metadata));

    let res: Response;
    try {
      res = await fetch(apiUrl("/api/uploads"), {
        method: "POST",
        headers: authHeaders(token),
        body: form,
      });
    } catch (err) {
      throw asNetworkError(err);
    }

    if (!res.ok) {
      const body = await parseJsonSafe<{
        message?: string;
        details?: UploadValidationError[];
      }>(res);
      // 驗證失敗時把 details 帶出來
      const err = new Error(
        body?.message ?? `上傳失敗 (${res.status})`,
      ) as Error & { details?: UploadValidationError[] };
      err.details = body?.details;
      throw err;
    }

    const data = await parseJsonSafe<UploadResponse>(res);
    if (!data) throw new Error("後端回應格式錯誤：未收到 JSON 資料");
    return data;
  },

  async cancelUpload(uploadId: number, token: string): Promise<void> {
    try {
      await fetch(apiUrl(`/api/uploads/${uploadId}`), {
        method: "DELETE",
        headers: authHeaders(token),
      });
    } catch (err) {
      throw asNetworkError(err);
    }
  },

  async deleteHistoryRecord(uploadId: number, token: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(apiUrl(`/api/uploads/history/${uploadId}`), {
        method: "DELETE",
        headers: authHeaders(token),
      });
    } catch (err) {
      throw asNetworkError(err);
    }

    if (!res.ok) {
      const body = await parseJsonSafe<{ message?: string }>(res);
      throw new Error(body?.message ?? "刪除歷史記錄失敗");
    }
  },

  async getHistory(
    token: string,
    params?: Record<string, string>,
  ): Promise<HistoryResponse> {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    let res: Response;
    try {
      res = await fetch(apiUrl(`/api/uploads/history${qs}`), {
        headers: authHeaders(token),
      });
    } catch (err) {
      throw asNetworkError(err);
    }
    if (!res.ok) throw new Error("無法取得歷史記錄");
    const data = await parseJsonSafe<HistoryResponse>(res);
    if (!data) throw new Error("後端回應格式錯誤：歷史記錄不是 JSON");
    return data;
  },
};
