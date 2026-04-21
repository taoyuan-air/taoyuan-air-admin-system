import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import type { JwtPayload, RoleCode } from '../shared/types/upload';

const router = Router();

// 與前端 AuthContext 相同的 mock 使用者
const MOCK_USERS = [
  {
    userId: 1,
    username: 'admin',
    password: 'REMOVED_REVOKED_SECRET',
    roleCode: 'system_admin' as RoleCode,
    uploadQuotaGb: 100,
  },
  {
    userId: 2,
    username: 'manager',
    password: 'REMOVED_REVOKED_SECRET',
    roleCode: 'data_manager' as RoleCode,
    uploadQuotaGb: 20,
  },
];

// POST /api/auth/login
router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body as { username: string; password: string };

  const user = MOCK_USERS.find((u) => u.username === username && u.password === password);
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: '帳號或密碼錯誤' });
    return;
  }

  const payload: JwtPayload = {
    userId: user.userId,
    username: user.username,
    roleCode: user.roleCode,
    uploadQuotaGb: user.uploadQuotaGb,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });
  res.json({ token });
});

export default router;
