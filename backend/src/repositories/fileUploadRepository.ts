import { pool } from "../db/pool";
import type {
  FileUploadRecord,
  DataCategory,
  StationSlug,
  UploadStatus,
  ValidationStatus,
  UploadMetadata,
} from "../shared/types/upload";

interface CreateUploadInput {
  userId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  dataCategory: DataCategory;
  station: StationSlug;
  metadata?: UploadMetadata;
}

interface HistoryFilter {
  userId?: number;
  dataCategory?: string;
  station?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

function toRecord(row: Record<string, unknown>): FileUploadRecord {
  return {
    uploadId: row.upload_id as number,
    userId: row.user_id as number,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    fileSize: row.file_size as number,
    dataCategory: row.data_category as DataCategory,
    station: row.station as StationSlug,
    uploadStatus: row.upload_status as UploadStatus,
    validationStatus: row.validation_status as ValidationStatus,
    validationErrors: row.validation_errors as object | undefined,
    metadata: row.metadata as UploadMetadata | undefined,
    createdAt: row.created_at as Date,
    processedAt: row.processed_at as Date | undefined,
  };
}

export const FileUploadRepository = {
  async create(input: CreateUploadInput): Promise<FileUploadRecord> {
    const { rows } = await pool.query(
      `INSERT INTO file_uploads
         (user_id, file_name, file_path, file_size, data_category, station, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.userId,
        input.fileName,
        input.filePath,
        input.fileSize,
        input.dataCategory,
        input.station,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );
    return toRecord(rows[0]);
  },

  async updateStatus(
    uploadId: number,
    uploadStatus: UploadStatus,
    validationStatus?: ValidationStatus,
    validationErrors?: object,
  ): Promise<void> {
    await pool.query(
      `UPDATE file_uploads
       SET upload_status = $1::varchar,
           validation_status = COALESCE($2::varchar, validation_status),
           validation_errors = COALESCE($3::jsonb, validation_errors),
           processed_at = CASE WHEN $1::varchar IN ('completed', 'failed') THEN NOW() ELSE processed_at END
       WHERE upload_id = $4`,
      [
        uploadStatus,
        validationStatus ?? null,
        validationErrors ? JSON.stringify(validationErrors) : null,
        uploadId,
      ],
    );
  },

  async findById(uploadId: number): Promise<FileUploadRecord | null> {
    const { rows } = await pool.query(
      "SELECT * FROM file_uploads WHERE upload_id = $1",
      [uploadId],
    );
    return rows.length ? toRecord(rows[0]) : null;
  },

  async findByUser(userId: number): Promise<FileUploadRecord[]> {
    const { rows } = await pool.query(
      "SELECT * FROM file_uploads WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(toRecord);
  },

  async deleteById(uploadId: number): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM file_uploads WHERE upload_id = $1",
      [uploadId],
    );
    return (result.rowCount ?? 0) > 0;
  },

  async findAll(
    filter: HistoryFilter,
  ): Promise<{ total: number; records: (FileUploadRecord & { username?: string })[] }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filter.userId !== undefined) {
      conditions.push(`fu.user_id = $${idx++}`);
      params.push(filter.userId);
    }
    if (filter.dataCategory) {
      conditions.push(`fu.data_category = $${idx++}`);
      params.push(filter.dataCategory);
    }
    if (filter.station) {
      conditions.push(`fu.station = $${idx++}`);
      params.push(filter.station);
    }
    if (filter.status) {
      conditions.push(`fu.upload_status = $${idx++}`);
      params.push(filter.status);
    }
    if (filter.dateFrom) {
      conditions.push(`fu.created_at >= $${idx++}`);
      params.push(filter.dateFrom);
    }
    if (filter.dateTo) {
      conditions.push(`fu.created_at <= $${idx++}`);
      params.push(filter.dateTo);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM file_uploads fu ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT fu.*, u.username
       FROM file_uploads fu
       LEFT JOIN admin_users u ON u.user_id = fu.user_id
       ${where}
       ORDER BY fu.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    return {
      total,
      records: rows.map((row) => ({
        ...toRecord(row),
        username: row.username as string | undefined,
      })),
    };
  },
};
