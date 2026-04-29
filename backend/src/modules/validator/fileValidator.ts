import path from 'path';
import { UPLOAD_CONFIG } from '../../shared/config/uploadConfig';
import type { DataCategory, DataType, ValidationResult } from '../../shared/types/upload';

function getConfig(dataCategory: DataCategory, dataType: DataType) {
  const categoryConfig = UPLOAD_CONFIG[dataCategory] as Record<string, { formats: readonly string[] }>;
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
  if (!config.formats.includes(ext)) {
    return {
      valid: false,
      error: `不支援的格式（${ext}），${dataCategory}/${dataType} 僅接受 ${config.formats.join(', ')}`,
    };
  }
  return { valid: true };
}
