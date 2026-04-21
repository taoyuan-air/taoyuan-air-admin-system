export type RoleCode = 'system_admin' | 'data_manager' | 'readonly';

export interface User {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  roleCode: RoleCode;
  roleName: string;
  organization?: string;
  uploadQuotaGb: number;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface DataSource {
  sourceId: string;
  sourceName: string;
  sourceType: 'EPA' | 'CWA' | 'IoT' | 'Lidar' | 'UAV' | 'WindProfiler';
  apiEndpoint: string;
  updateFrequency: number;
  isActive: boolean;
  lastSync?: string;
  syncStatus: 'success' | 'error' | 'pending';
  errorMessage?: string;
}

export interface Station {
  stationId: string;
  stationName: string;
  stationType: string;
  latitude: number;
  longitude: number;
  district: string;
  operator: string;
  isActive: boolean;
  dataQualityScore: number;
  lastCalibration?: string;
}

export interface UploadRecord {
  uploadId: number;
  fileName: string;
  fileSize: number;
  fileType: 'lidar' | 'uav' | 'other';
  dataType: string;
  uploadStatus: 'uploading' | 'completed' | 'failed' | 'processing';
  validationStatus: 'pending' | 'valid' | 'invalid';
  createdAt: string;
  uploadedBy: string;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  requiredRoles?: RoleCode[];
}
