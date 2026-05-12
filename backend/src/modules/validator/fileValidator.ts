import path from 'path';
import { UPLOAD_CONFIG } from '../../shared/config/uploadConfig';
import type { DataCategory, StationSlug, ValidationResult } from '../../shared/types/upload';

const STATION_SLUGS = new Set<StationSlug>([
  'taoyuan',
  'dayuan',
  'guanyin',
  'pingzhen',
  'longtan',
  'zhongli',
]);

function getConfig(dataCategory: DataCategory) {
  return UPLOAD_CONFIG[dataCategory] ?? null;
}

export function validateFileFormat(
  fileName: string,
  dataCategory: DataCategory,
): ValidationResult {
  const config = getConfig(dataCategory);
  if (!config) return { valid: false, error: `未知的資料分類：${dataCategory}` };

  const ext = path.extname(fileName).toLowerCase();
  if (!(config.formats as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `不支援的格式（${ext}），${dataCategory} 僅接受 ${config.formats.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateStationSlug(station: string | undefined): station is StationSlug {
  return Boolean(station && STATION_SLUGS.has(station as StationSlug));
}
