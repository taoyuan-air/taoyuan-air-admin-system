-- Migration: 005_station_based_uav_uploads
-- UAV manual uploads are grouped by station instead of data_type.

ALTER TABLE file_uploads
  ADD COLUMN IF NOT EXISTS station VARCHAR(50);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'file_uploads'
      AND column_name = 'metadata'
  ) THEN
    UPDATE file_uploads
    SET station = CASE COALESCE(metadata->>'station', '')
      WHEN 'taoyuan' THEN 'taoyuan'
      WHEN 'dayuan' THEN 'dayuan'
      WHEN 'guanyin' THEN 'guanyin'
      WHEN 'pingzhen' THEN 'pingzhen'
      WHEN 'longtan' THEN 'longtan'
      WHEN 'zhongli' THEN 'zhongli'
      ELSE 'unknown'
    END
    WHERE station IS NULL;
  END IF;
END $$;

UPDATE file_uploads
SET station = 'unknown'
WHERE station IS NULL;

ALTER TABLE file_uploads
  ALTER COLUMN station SET NOT NULL;

DROP INDEX IF EXISTS idx_file_uploads_data_type;
CREATE INDEX IF NOT EXISTS idx_file_uploads_station ON file_uploads(station);

ALTER TABLE file_uploads
  DROP COLUMN IF EXISTS data_type;
