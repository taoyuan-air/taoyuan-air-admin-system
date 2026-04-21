export type DataCategory = 'lidar' | 'uav';

export type LidarDataType = 'point_cloud' | 'wind_field' | 'boundary_layer';
export type UAVDataType = 'sensor' | 'flight_path' | 'imagery' | 'meteorological';
export type DataType = LidarDataType | UAVDataType;

export type UploadStatus = 'uploading' | 'completed' | 'failed' | 'cancelled';
export type ValidationStatus = 'pending' | 'valid' | 'invalid';

export type RoleCode = 'system_admin' | 'data_manager' | 'readonly';

export const UPLOAD_ALLOWED_ROLES: RoleCode[] = [
  'system_admin',
  'data_manager',
];

export interface UploadMetadata {
  collectionDate: string;       // ISO 8601 日期
  locationDescription: string;
  equipmentModel: string;
  notes?: string;
}

export interface FileUploadRecord {
  uploadId: number;
  userId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  dataCategory: DataCategory;
  dataType: DataType;
  uploadStatus: UploadStatus;
  validationStatus: ValidationStatus;
  validationErrors?: object;
  metadata?: UploadMetadata;
  createdAt: Date;
  processedAt?: Date;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadProgressState {
  uploadId: number;
  progress: number;
  status: UploadStatus;
}

// 錯誤碼
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FILE_VALIDATION_FAILED = 'FILE_VALIDATION_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UPLOAD_NOT_FOUND = 'UPLOAD_NOT_FOUND',
  UPLOAD_ALREADY_COMPLETED = 'UPLOAD_ALREADY_COMPLETED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
}

// JWT Payload
export interface JwtPayload {
  userId: number;
  username: string;
  roleCode: RoleCode;
  uploadQuotaGb: number;
}
