import path from 'path';
import { UPLOAD_CONFIG } from '../../shared/config/uploadConfig';
import type { DataCategory, DataType, ValidationResult } from '../../shared/types/upload';

type Config = typeof UPLOAD_CONFIG;

function getConfig(dataCategory: DataCategory, dataType: DataType) {
  const categoryConfig = UPLOAD_CONFIG[dataCategory] as Record<string, { formats: readonly string[]; maxSizeMB: number }>;
  return categoryConfig?.[dataType] ?? null;
}

export function validateFileFormat(
  fileName: string,
  dataCategory: DataCategory,
  dataType: DataType,
): ValidationResult {
  const config = getConfig(dataCategory, dataType);
  if (!config) return { valid: false, error: `未知的資料類型：${dataCategory}/${dataType}` };

  const ext = path.extname(fileName).toLowerCase();
  if (!config.formats.includes(ext as Config[keyof Config][keyof Config[keyof Config]]['formats'][number])) {
    return {
      valid: false,
      error: `不支援的格式（${ext}），${dataCategory}/${dataType} 僅接受 ${config.formats.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateFileSize(
  fileSizeBytes: number,
  dataCategory: DataCategory,
  dataType: DataType,
): ValidationResult {
  const config = getConfig(dataCategory, dataType);
  if (!config) return { valid: false, error: `未知的資料類型：${dataCategory}/${dataType}` };

  const actualMB = fileSizeBytes / (1024 * 1024);
  if (actualMB > config.maxSizeMB) {
    return {
      valid: false,
      error: `檔案過大（${actualMB.toFixed(1)} MB），上限為 ${config.maxSizeMB} MB`,
    };
  }
  return { valid: true };
}
