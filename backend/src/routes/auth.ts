import { asyncRoute } from '../middlewares/errors';
import { Router } from 'express';
import { signToken } from '../security';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { pool } from '../db/pool';
import { ErrorCode } from '../shared/types/upload';
import type { JwtPayload } from '../shared/types/upload';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

// Hash of a random value nobody knows; only used to equalise timing for unknown usernames.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

const ROLE_NAMES: Record<string, string> = {
  system_admin: '系統管理員',
  data_manager: '資料管理員',
  readonly: '唯讀使用者',
};

// POST /api/auth/login
router.post('/login', asyncRoute(async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store');
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
    res.status(400).json({ error: 'INVALID_INPUT' });
    return;
  }

  const { rows } = await pool.query(
    'SELECT * FROM admin_users WHERE username = $1',
    [username],
  );

  const user = rows[0];
  // Always run bcrypt so response time does not reveal whether the username exists.
  const passwordOk = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    res.status(401).json({ error: ErrorCode.UNAUTHORIZED, message: '帳號或密碼錯誤' });
    return;
  }

  if (!user.is_active) {
    res.status(401).json({ error: ErrorCode.ACCOUNT_DISABLED, message: '此帳號已被停用' });
    return;
  }

  await pool.query('UPDATE admin_users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

  const payload: JwtPayload = {
    tokenVersion: user.token_version,
    userId: user.user_id,
    username: user.username,
    roleCode: user.role_code,
    uploadQuotaGb: user.upload_quota_gb,
    mustChangePassword: user.must_change_password,
  };

  const token = signToken(payload);

  res.json({
    token,
    user: {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      roleCode: user.role_code,
      roleName: ROLE_NAMES[user.role_code] ?? user.role_code,
      organization: user.organization,
      uploadQuotaGb: user.upload_quota_gb,
      isActive: user.is_active,
      mustChangePassword: user.must_change_password,
      lastLogin: user.last_login,
      createdAt: user.created_at,
    },
  });
}));

// POST /api/auth/change-password
router.post('/change-password', authenticateJWT, asyncRoute(async (req: Request, res: Response): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store');
  const { currentPassword, newPassword } = (req.body ?? {}) as {
    currentPassword: string;
    newPassword: string;
  };

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || Buffer.byteLength(newPassword) > 72) {
    res.status(400).json({ error: ErrorCode.INVALID_PASSWORD });
    return;
  }

  const { rows } = await pool.query(
    'SELECT password_hash FROM admin_users WHERE user_id = $1',
    [req.user!.userId],
  );

  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    res.status(401).json({ error: ErrorCode.WRONG_PASSWORD, message: '目前密碼不正確' });
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
    res.status(400).json({ error: ErrorCode.INVALID_PASSWORD, message: '新密碼至少需 8 碼，且包含英文與數字' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  const { rows: updated } = await pool.query(
    `UPDATE admin_users SET password_hash = $1, must_change_password = false,
       token_version = token_version + 1, updated_at = NOW()
     WHERE user_id = $2 AND token_version = $3 AND is_active = true RETURNING *`,
    [hash, req.user!.userId, req.user!.tokenVersion],
  );
  if (!updated[0]) {
    res.status(401).json({ error: ErrorCode.UNAUTHORIZED, message: '請重新登入' });
    return;
  }
  const user = updated[0];
  const newToken = signToken({
    userId: user.user_id, username: user.username, roleCode: user.role_code,
    uploadQuotaGb: user.upload_quota_gb, mustChangePassword: false, tokenVersion: user.token_version,
  });

  res.json({ success: true, message: '密碼修改成功', token: newToken });
}));

export default router;
