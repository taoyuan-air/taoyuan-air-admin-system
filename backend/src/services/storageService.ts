import fs from 'fs';
import path from 'path';
import type { DataCategory, StationSlug } from '../shared/types/upload';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');

const ALLOWED_CATEGORIES = new Set(['uav']);
const ALLOWED_STATIONS = new Set<StationSlug>([
  'taoyuan',
  'dayuan',
  'guanyin',
  'pingzhen',
  'longtan',
  'zhongli',
]);

export const StorageService = {
  async saveFile(
    tempPath: string,
    originalName: string,
    dataCategory: DataCategory,
    station: StationSlug,
  ): Promise<string> {
    if (!ALLOWED_CATEGORIES.has(dataCategory) || !ALLOWED_STATIONS.has(station)) {
      throw new Error(`不允許的 dataCategory 或 station: ${dataCategory}/${station}`);
    }
    const destDir = path.join(UPLOAD_DIR, dataCategory, station);
    fs.mkdirSync(destDir, { recursive: true });

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const safeName = `${timestamp}_${random}_${path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destPath = path.join(destDir, safeName);

    fs.renameSync(tempPath, destPath);

    // 回傳相對路徑（上雲後換成 S3 物件路徑）
    return path.relative(UPLOAD_DIR, destPath).replace(/\\/g, '/');
  },

  async deleteFile(filePath: string): Promise<void> {
    const resolved = path.resolve(UPLOAD_DIR, filePath);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep) && resolved !== UPLOAD_DIR) {
      throw new Error(`拒絕刪除路徑超出上傳目錄範圍: ${filePath}`);
    }
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  },
};
