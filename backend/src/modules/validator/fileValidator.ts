import path from 'path';
import type { StationSlug, ValidationResult } from '../../shared/types/upload';

const UAV_FORMATS = ['.txt', '.csv'] as const;

const STATION_SLUGS = new Set<StationSlug>([
  'taoyuan',
  'dayuan',
  'guanyin',
  'pingzhen',
  'longtan',
  'zhongli',
]);

export function validateFileFormat(
  fileName: string,
): ValidationResult {
  const ext = path.extname(fileName).toLowerCase();
  if (!(UAV_FORMATS as readonly string[]).includes(ext)) {
    return {
      valid: false,
      error: `不支援的格式（${ext}），UAV 僅接受 ${UAV_FORMATS.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateStationSlug(station: string | undefined): station is StationSlug {
  return Boolean(station && STATION_SLUGS.has(station as StationSlug));
}
