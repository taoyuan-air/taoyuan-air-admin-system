-- Migration: 005_station_based_uav_uploads
-- UAV manual uploads are grouped by station instead of data_type.

ALTER TABLE file_uploads
  ADD COLUMN IF NOT EXISTS station VARCHAR(50);

UPDATE file_uploads
SET station = CASE COALESCE(metadata->>'station', '')
  WHEN '桃園' THEN 'taoyuan'
  WHEN '大園' THEN 'dayuan'
  WHEN '觀音' THEN 'guanyin'
  WHEN '平鎮' THEN 'pingzhen'
  WHEN '龍潭' THEN 'longtan'
  WHEN '中壢' THEN 'zhongli'
  WHEN 'taoyuan' THEN 'taoyuan'
  WHEN 'dayuan' THEN 'dayuan'
  WHEN 'guanyin' THEN 'guanyin'
  WHEN 'pingzhen' THEN 'pingzhen'
  WHEN 'longtan' THEN 'longtan'
  WHEN 'zhongli' THEN 'zhongli'
  ELSE 'unknown'
END
WHERE station IS NULL;

ALTER TABLE file_uploads
  ALTER COLUMN station SET NOT NULL;

DROP INDEX IF EXISTS idx_file_uploads_data_type;
CREATE INDEX IF NOT EXISTS idx_file_uploads_station ON file_uploads(station);

ALTER TABLE file_uploads
  DROP COLUMN IF EXISTS data_type;
