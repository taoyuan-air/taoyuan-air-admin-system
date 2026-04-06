import fs from 'fs';
import path from 'path';
import type { DataCategory, DataType } from '../shared/types/upload';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');

export const StorageService = {
  async saveFile(
    tempPath: string,
    originalName: string,
    dataCategory: DataCategory,
    dataType: DataType,
  ): Promise<string> {
    const destDir = path.join(UPLOAD_DIR, dataCategory, dataType);
    fs.mkdirSync(destDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destPath = path.join(destDir, safeName);

    fs.renameSync(tempPath, destPath);

    // 回傳相對路徑（上雲後換成 S3 物件路徑）
    return path.relative(UPLOAD_DIR, destPath).replace(/\\/g, '/');
  },

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  },
};
