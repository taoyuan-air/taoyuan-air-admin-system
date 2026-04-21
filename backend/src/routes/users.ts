import { Router } from 'express';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { pool } from '../db/pool';
import { authenticateJWT, requirePasswordChanged, requireRole } from '../middlewares/auth';

const router = Router();

// 所有 users 路由都需要登入 + 已完成密碼修改 + system_admin 角色
router.use(authenticateJWT, requirePasswordChanged, requireRole('system_admin'));

const ROLE_NAMES: Record<string, string> = {
  system_admin: '系統管理員',
  data_manager: '資料管理員',
  readonly: '唯讀使用者',
};

function toUserDto(row: Record<string, unknown>) {
  return {
    userId: row.user_id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    roleCode: row.role_code,
    roleName: ROLE_NAMES[row.role_code as string] ?? row.role_code,
    organization: row.organization,
    uploadQuotaGb: row.upload_quota_gb,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    lastLogin: row.last_login,
    createdAt: row.created_at,
  };
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  // 確保至少含一個數字和一個字母
  if (!/\d/.test(result)) result = result.slice(0, 7) + '4';
  if (!/[A-Za-z]/.test(result)) result = 'A' + result.slice(1);
  return result;
}

// GET /api/users
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const { rows } = await pool.query(
    'SELECT * FROM admin_users ORDER BY created_at ASC',
  );
  res.json({ users: rows.map(toUserDto) });
});

// POST /api/users
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { username, email, fullName, roleCode, organization, uploadQuotaGb } =
    req.body as {
      username: string;
      email: string;
      fullName: string;
      roleCode: string;
      organization?: string;
      uploadQuotaGb: number;
    };

  // 檢查帳號/email 是否重複
  const { rows: existing } = await pool.query(
    'SELECT user_id FROM admin_users WHERE username = $1 OR email = $2',
    [username, email],
  );
  if (existing.length > 0) {
    res.status(409).json({ error: 'CONFLICT', message: '帳號或 Email 已存在' });
    return;
  }

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  const { rows } = await pool.query(
    `INSERT INTO admin_users
       (username, email, password_hash, full_name, role_code, organization, upload_quota_gb, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [username, email, hash, fullName, roleCode, organization ?? null, uploadQuotaGb],
  );

  res.status(201).json({
    user: toUserDto(rows[0]),
    temporaryPassword: tempPassword,
  });
});

// PATCH /api/users/:id
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fullName, email, roleCode, organization, uploadQuotaGb } =
    req.body as {
      fullName?: string;
      email?: string;
      roleCode?: string;
      organization?: string;
      uploadQuotaGb?: number;
    };

  const { rows } = await pool.query(
    `UPDATE admin_users
     SET full_name       = COALESCE($1, full_name),
         email           = COALESCE($2, email),
         role_code       = COALESCE($3, role_code),
         organization    = COALESCE($4, organization),
         upload_quota_gb = COALESCE($5, upload_quota_gb),
         updated_at      = NOW()
     WHERE user_id = $6
     RETURNING *`,
    [fullName ?? null, email ?? null, roleCode ?? null, organization ?? null, uploadQuotaGb ?? null, id],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'NOT_FOUND', message: '使用者不存在' });
    return;
  }

  res.json({ user: toUserDto(rows[0]) });
});

// PATCH /api/users/:id/active
router.patch('/:id/active', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body as { isActive: boolean };

  const { rows } = await pool.query(
    'UPDATE admin_users SET is_active = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
    [isActive, id],
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'NOT_FOUND', message: '使用者不存在' });
    return;
  }

  res.json({ user: toUserDto(rows[0]) });
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const { rowCount } = await pool.query(
    'DELETE FROM admin_users WHERE user_id = $1',
    [id],
  );

  if (!rowCount) {
    res.status(404).json({ error: 'NOT_FOUND', message: '使用者不存在' });
    return;
  }

  res.json({ success: true });
});

export default router;
