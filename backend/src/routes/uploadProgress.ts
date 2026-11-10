import type { Request, Response } from 'express';
import { findTokenUser } from '../middlewares/auth';
import { FileUploadRepository } from '../repositories/fileUploadRepository';
import { ProgressService } from '../services/progressService';
import type { JwtPayload } from '../shared/types/upload';

export function canAccessUpload(user: JwtPayload, ownerId: number): boolean {
  return user.userId === ownerId || user.roleCode === 'system_admin' || user.roleCode === 'data_manager';
}

// Mounted behind the application-wide authentication and password-change guards.
export async function streamUploadProgress(req: Request, res: Response): Promise<void> {
  const uploadId = Number(req.params.uploadId);
  if (!Number.isSafeInteger(uploadId) || uploadId < 1) {
    res.status(400).json({ error: 'INVALID_UPLOAD_ID' });
    return;
  }
  const record = await FileUploadRepository.findById(uploadId);
  if (!record) {
    res.status(404).json({ error: 'UPLOAD_NOT_FOUND' });
    return;
  }
  if (!canAccessUpload(req.user!, record.userId)) {
    res.status(403).json({ error: 'FORBIDDEN' });
    return;
  }
  if (res.destroyed) return;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let polling = false;
  let closed = false;
  const deadline = Date.now() + 10 * 60 * 1000;
  const token = req.headers.authorization!.slice(7);
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(interval);
    res.end();
  };
  const tick = async () => {
    if (closed || polling) return;
    if (Date.now() >= deadline) { close(); return; }
    polling = true;
    try {
      const user = await findTokenUser(token);
      if (!user || user.mustChangePassword || !canAccessUpload(user, record.userId)) { close(); return; }
      const current = await FileUploadRepository.findById(uploadId);
      if (!current) { close(); return; }
      if (closed) return;
      const state = ProgressService.get(uploadId) ?? {
        uploadId, progress: current.uploadStatus === 'completed' ? 100 : 0, status: current.uploadStatus,
      };
      res.write(`data: ${JSON.stringify(state)}\n\n`);
      if (['completed', 'failed', 'cancelled'].includes(state.status)) close();
    } catch {
      // Expired/revoked tokens and database outages must stop an existing stream too.
      close();
    } finally {
      polling = false;
    }
  };
  const interval = setInterval(() => { void tick(); }, 1000);
  res.on('close', close);
  void tick();
}
