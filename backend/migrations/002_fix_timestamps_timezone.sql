-- Migration: 002_fix_timestamps_timezone
-- 將 TIMESTAMP 欄位改為 TIMESTAMPTZ，確保時區資訊正確儲存

ALTER TABLE file_uploads
  ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN processed_at TYPE TIMESTAMPTZ USING processed_at AT TIME ZONE 'UTC';

ALTER TABLE admin_audit_logs
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
