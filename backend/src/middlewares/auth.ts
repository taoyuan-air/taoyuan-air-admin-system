import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../security';
import { pool } from '../db/pool';
import { ErrorCode, UPLOAD_ALLOWED_ROLES } from '../shared/types/upload';
import type { JwtPayload, RoleCode } from '../shared/types/upload';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function findTokenUser(token: string, claims = verifyToken(token)): Promise<JwtPayload | null> {
  const { rows } = await pool.query(
    `SELECT user_id, username, role_code, upload_quota_gb, must_change_password,
            is_active, token_version FROM admin_users WHERE user_id = $1`, [claims.userId],
  );
  const user = rows[0];
  if (!user || !user.is_active || user.token_version !== claims.tokenVersion
      || !['system_admin', 'data_manager', 'readonly'].includes(user.role_code)) return null;
  return {
    userId: user.user_id, username: user.username, roleCode: user.role_code,
    uploadQuotaGb: user.upload_quota_gb, mustChangePassword: user.must_change_password,
    tokenVersion: user.token_version,
  };
}

export async function authenticateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: ErrorCode.UNAUTHORIZED, message: 'Token 缺失或格式錯誤' });
    return;
  }

  let claims: { userId: number; tokenVersion: number };
  try {
    claims = verifyToken(authHeader.slice(7));
  } catch {
    res.status(401).json({ error: ErrorCode.UNAUTHORIZED, message: 'Token 無效或已過期' });
    return;
  }
  try {
    const user = await findTokenUser(authHeader.slice(7), claims);
    if (!user) {
      res.status(401).json({ error: ErrorCode.UNAUTHORIZED, message: '請重新登入' });
      return;
    }
    req.user = user;
  } catch {
    res.status(503).json({ error: 'AUTH_UNAVAILABLE', message: '暫時無法驗證帳號狀態' });
    return;
  }
  next();
}

export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.user!.mustChangePassword) {
    res.status(403).json({ error: ErrorCode.PASSWORD_CHANGE_REQUIRED, message: '請先完成密碼修改' });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: RoleCode[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!allowedRoles.includes(req.user!.roleCode)) {
      res.status(403).json({ error: ErrorCode.FORBIDDEN, message: '權限不足' });
      return;
    }
    next();
  };
}

export function requireUploadPermission(req: Request, res: Response, next: NextFunction): void {
  const user = req.user!;
  if (!UPLOAD_ALLOWED_ROLES.includes(user.roleCode)) {
    res.status(403).json({ error: ErrorCode.FORBIDDEN, message: '您的角色無上傳權限' });
    return;
  }
  next();
}

export async function checkUploadQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user!;
  const quotaBytes = user.uploadQuotaGb * 1024 * 1024 * 1024;

  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(file_size), 0) AS used
     FROM file_uploads
     WHERE user_id = $1 AND upload_status = 'completed'`,
    [user.userId],
  );

  const usedBytes = parseInt(rows[0].used, 10);
  if (usedBytes >= quotaBytes) {
    res.status(403).json({
      error: ErrorCode.QUOTA_EXCEEDED,
      message: `上傳配額已達上限（${user.uploadQuotaGb} GB）`,
    });
    return;
  }
  next();
}
