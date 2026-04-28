import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { pool } from '../db/pool';

const router = Router();

// GET /api/sftp/logs?source=NAQO&limit=50
router.get('/logs', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  const source = req.query.source as string | undefined;
  const limit  = Math.min(parseInt(req.query.limit as string ?? '50', 10), 200);

  const values: (string | number)[] = [limit];
  const where = source ? `WHERE source = $2` : '';
  if (source) values.push(source);

  const result = await pool.query(
    `SELECT id, source, file_name, file_size, data_time, status, error_msg, received_at
     FROM sftp_transfer_logs
     ${where}
     ORDER BY received_at DESC
     LIMIT $1`,
    values,
  );

  res.json({ logs: result.rows });
});

// GET /api/sftp/records/:source — SourceDatabase 頁面用，格式對齊 file_uploads
router.get('/records/:source', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  const source = req.params.source.toUpperCase(); // naqo → NAQO
  const page  = Math.max(1, parseInt(req.query.page  as string ?? '1',  10));
  const limit = Math.min(200, parseInt(req.query.limit as string ?? '50', 10));
  const offset = (page - 1) * limit;

  const [countResult, rowsResult] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM sftp_transfer_logs WHERE source = $1', [source]),
    pool.query(
      `SELECT id AS "uploadId", file_name AS "fileName", file_size AS "fileSize",
              source AS "dataCategory", 'hourly_obs' AS "dataType",
              status AS "uploadStatus", received_at AS "createdAt",
              source AS username
       FROM sftp_transfer_logs
       WHERE source = $1
       ORDER BY received_at DESC
       LIMIT $2 OFFSET $3`,
      [source, limit, offset],
    ),
  ]);

  res.json({
    total: parseInt(countResult.rows[0].count, 10),
    page,
    limit,
    records: rowsResult.rows,
  });
});

// GET /api/sftp/last-sync — 各來源最後同步時間
router.get('/last-sync', authenticateJWT, async (_req: Request, res: Response): Promise<void> => {
  const [sftpResult, uavResult] = await Promise.all([
    pool.query(
      `SELECT source, MAX(received_at) AS last_sync
       FROM sftp_transfer_logs
       GROUP BY source`
    ),
    pool.query(
      `SELECT MAX(created_at) AS last_sync FROM file_uploads WHERE data_category = 'uav'`
    ),
  ]);

  const result: Record<string, string | null> = {
    NAQO:      null,
    WindLidar: null,
    MPL:       null,
    UAV:       null,
  };

  for (const row of sftpResult.rows) {
    if (row.source in result) result[row.source] = row.last_sync;
  }
  result.UAV = uavResult.rows[0]?.last_sync ?? null;

  res.json(result);
});

export default router;
