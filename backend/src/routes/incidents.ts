import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth';
import { pool } from '../db/pool';

const router = Router();

const VALID_SOURCES = ['NAQO', 'WindLidar', 'MPL'] as const;
const VALID_INCIDENT_TYPES = [
  'network_disconnect',
  'computer_restart',
  'software_update',
  'sftp_service_error',
  'power_outage',
  'instrument_maintenance',
  'hardware_failure',
  'manual_stop',
  'other',
] as const;

type IncidentSource = typeof VALID_SOURCES[number];
type IncidentType   = typeof VALID_INCIDENT_TYPES[number];

// ─── 共用查詢函式 ─────────────────────────────────────────────

async function fetchIncidentById(id: number) {
  const { rows } = await pool.query(
    `SELECT
       si.id,
       si.source,
       si.incident_type,
       si.started_at,
       si.ended_at,
       COALESCE(si.affected_range, '') AS affected_range,
       COALESCE(si.note, '')           AS note,
       au.full_name                    AS reporter_name,
       si.created_at
     FROM sftp_incidents si
     JOIN admin_users au ON si.reported_by = au.user_id
     WHERE si.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

function validateBody(body: Record<string, unknown>): string | null {
  const { source, incident_type, started_at, ended_at } = body;

  if (!source || !VALID_SOURCES.includes(source as IncidentSource)) {
    return 'source 必須為 NAQO、WindLidar 或 MPL';
  }
  if (!incident_type || !VALID_INCIDENT_TYPES.includes(incident_type as IncidentType)) {
    return 'incident_type 為無效值';
  }
  if (!started_at || isNaN(Date.parse(started_at as string))) {
    return 'started_at 必須為有效的 ISO 8601 日期時間';
  }
  if (ended_at) {
    if (isNaN(Date.parse(ended_at as string))) {
      return 'ended_at 必須為有效的 ISO 8601 日期時間';
    }
    if (new Date(ended_at as string) < new Date(started_at as string)) {
      return 'ended_at 不能早於 started_at';
    }
  }
  const affected_range = body.affected_range as string | undefined;
  const note           = body.note           as string | undefined;
  if (affected_range && affected_range.length > 500) return 'affected_range 上限 500 字元';
  if (note           && note.length           > 1000) return 'note 上限 1000 字元';

  return null;
}

// ─── GET /api/incidents ───────────────────────────────────────

router.get('/', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  const { source, incident_type, status, from, to } = req.query;
  const page   = Math.max(1, parseInt(req.query.page  as string ?? '1',  10));
  const limit  = Math.min(200, parseInt(req.query.limit as string ?? '50', 10));
  const offset = (page - 1) * limit;

  const filterSource = (source as string) || null;
  const filterType   = (incident_type as string) || null;
  const filterStatus = (status as string) || null;
  const filterFrom   = (from as string)   || null;
  const filterTo     = (to   as string)   || null;

  const whereParams: (string | null)[] = [
    filterSource,
    filterType,
    filterStatus,
    filterFrom,
    filterTo,
  ];

  const whereClause = `
    WHERE
      ($1::text IS NULL OR si.source = $1)
      AND ($2::text IS NULL OR si.incident_type = $2)
      AND ($3::text IS NULL OR (
            ($3 = 'ongoing'  AND si.ended_at IS NULL)
         OR ($3 = 'resolved' AND si.ended_at IS NOT NULL)
      ))
      AND ($4::timestamptz IS NULL OR si.started_at >= $4::timestamptz)
      AND ($5::timestamptz IS NULL OR si.started_at <  $5::timestamptz + INTERVAL '1 day')
  `;

  const [countResult, rowsResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FROM sftp_incidents si ${whereClause}`,
      whereParams,
    ),
    pool.query(
      `SELECT
         si.id,
         si.source,
         si.incident_type,
         si.started_at,
         si.ended_at,
         COALESCE(si.affected_range, '') AS affected_range,
         COALESCE(si.note, '')           AS note,
         au.full_name                    AS reporter_name,
         si.created_at
       FROM sftp_incidents si
       JOIN admin_users au ON si.reported_by = au.user_id
       ${whereClause}
       ORDER BY si.started_at DESC
       LIMIT $6 OFFSET $7`,
      [...whereParams, limit, offset],
    ),
  ]);

  res.json({
    total:     parseInt(countResult.rows[0].count, 10),
    page,
    limit,
    incidents: rowsResult.rows,
  });
});

// ─── POST /api/incidents ──────────────────────────────────────

router.post(
  '/',
  authenticateJWT,
  requireRole('data_manager', 'system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    const err = validateBody(req.body);
    if (err) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: err });
      return;
    }

    const { source, incident_type, started_at, ended_at, affected_range, note } = req.body;

    const insertResult = await pool.query(
      `INSERT INTO sftp_incidents
         (source, incident_type, started_at, ended_at, affected_range, note, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        source,
        incident_type,
        started_at,
        ended_at   ?? null,
        affected_range ? String(affected_range).trim() : null,
        note           ? String(note).trim()           : null,
        req.user!.userId,
      ],
    );

    const incident = await fetchIncidentById(insertResult.rows[0].id);
    res.status(201).json(incident);
  },
);

// ─── GET /api/incidents/:id ───────────────────────────────────

router.get('/:id', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'INVALID_ID', message: 'id 必須為整數' });
    return;
  }

  const incident = await fetchIncidentById(id);
  if (!incident) {
    res.status(404).json({ error: 'NOT_FOUND', message: '找不到指定的異常事件' });
    return;
  }
  res.json(incident);
});

// ─── PUT /api/incidents/:id ───────────────────────────────────

router.put(
  '/:id',
  authenticateJWT,
  requireRole('data_manager', 'system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'INVALID_ID', message: 'id 必須為整數' });
      return;
    }

    const err = validateBody(req.body);
    if (err) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: err });
      return;
    }

    const { source, incident_type, started_at, ended_at, affected_range, note } = req.body;

    const { rowCount } = await pool.query(
      `UPDATE sftp_incidents
       SET source         = $1,
           incident_type  = $2,
           started_at     = $3,
           ended_at       = $4,
           affected_range = $5,
           note           = $6
       WHERE id = $7`,
      [
        source,
        incident_type,
        started_at,
        ended_at   ?? null,
        affected_range ? String(affected_range).trim() : null,
        note           ? String(note).trim()           : null,
        id,
      ],
    );

    if (!rowCount) {
      res.status(404).json({ error: 'NOT_FOUND', message: '找不到指定的異常事件' });
      return;
    }
    res.json(await fetchIncidentById(id));
  },
);

// ─── PATCH /api/incidents/:id/resolve ────────────────────────

router.patch(
  '/:id/resolve',
  authenticateJWT,
  requireRole('data_manager', 'system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'INVALID_ID', message: 'id 必須為整數' });
      return;
    }

    const existing = await fetchIncidentById(id);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: '找不到指定的異常事件' });
      return;
    }
    if (existing.ended_at !== null) {
      res.status(400).json({ error: 'ALREADY_RESOLVED', message: '此事件已標記為已恢復' });
      return;
    }

    await pool.query(
      `UPDATE sftp_incidents SET ended_at = NOW() WHERE id = $1`,
      [id],
    );

    res.json(await fetchIncidentById(id));
  },
);

// ─── DELETE /api/incidents/:id ────────────────────────────────

router.delete(
  '/:id',
  authenticateJWT,
  requireRole('system_admin'),
  async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'INVALID_ID', message: 'id 必須為整數' });
      return;
    }

    const { rowCount } = await pool.query(
      `DELETE FROM sftp_incidents WHERE id = $1`,
      [id],
    );

    if (!rowCount) {
      res.status(404).json({ error: 'NOT_FOUND', message: '找不到指定的異常事件' });
      return;
    }
    res.json({ message: '事件已刪除' });
  },
);

export default router;
