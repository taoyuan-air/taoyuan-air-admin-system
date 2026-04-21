import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { pool } from '../db/pool';
import { ErrorCode } from '../shared/types/upload';
import type { JwtPayload } from '../shared/types/upload';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

const ROLE_NAMES: Record<string, string> = {
  system_admin: '系統管理員',
  data_manager: '資料管理員',
  readonly: '唯讀使用者',
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };

  const { rows } = await pool.query(
    'SELECT * FROM admin_users WHERE username = $1',
    [username],
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: ErrorCode.UNAUTHORIZED, message: '帳號或密碼錯誤' });
    return;
  }

  if (!user.is_active) {
    res.status(401).json({ error: ErrorCode.ACCOUNT_DISABLED, message: '此帳號已被停用' });
    return;
  }

  await pool.query('UPDATE admin_users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

  const payload: JwtPayload = {
    userId: user.user_id,
    username: user.username,
    roleCode: user.role_code,
    uploadQuotaGb: user.upload_quota_gb,
    mustChangePassword: user.must_change_password,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });

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
});

// POST /api/auth/change-password
router.post('/change-password', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const { rows } = await pool.query(
    'SELECT password_hash FROM admin_users WHERE user_id = $1',
    [req.user!.userId],
  );

  if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    res.status(401).json({ error: ErrorCode.WRONG_PASSWORD, message: '目前密碼不正確' });
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
    res.status(400).json({ error: ErrorCode.INVALID_PASSWORD, message: '新密碼至少需 8 碼，且包含英文與數字' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    'UPDATE admin_users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE user_id = $2',
    [hash, req.user!.userId],
  );

  res.json({ success: true, message: '密碼修改成功' });
});

export default router;
