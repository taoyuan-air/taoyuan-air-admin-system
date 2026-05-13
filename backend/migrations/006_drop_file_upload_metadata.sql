-- Migration: 006_drop_file_upload_metadata
-- UAV uploads now store station directly on file_uploads; metadata is no longer used.

ALTER TABLE file_uploads
  DROP COLUMN IF EXISTS metadata;
