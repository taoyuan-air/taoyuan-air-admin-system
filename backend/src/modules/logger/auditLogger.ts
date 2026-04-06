import { pool } from '../../db/pool';

export type AuditAction =
  | 'UPLOAD_START'
  | 'UPLOAD_COMPLETE'
  | 'UPLOAD_FAILED'
  | 'UPLOAD_CANCEL';

export function logUploadAction(
  userId: number,
  action: AuditAction,
  uploadId: number | null,
  ipAddress: string,
  details?: object,
): void {
  // 非同步寫入，不 await，失敗只記 stderr
  pool
    .query(
      `INSERT INTO admin_audit_logs (user_id, action, resource, resource_id, ip_address, details)
       VALUES ($1, $2, 'file_uploads', $3, $4, $5)`,
      [userId, action, uploadId, ipAddress, details ? JSON.stringify(details) : null],
    )
    .catch((err) => {
      process.stderr.write(`[AuditLogger] 寫入失敗: ${err.message}\n`);
    });
}
