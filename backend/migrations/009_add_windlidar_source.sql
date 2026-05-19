-- Migration: 009_add_windlidar_source
-- Adds 'WindLidar' as a valid source in sftp_incidents CHECK constraint.

DO $$
BEGIN
  ALTER TABLE sftp_incidents DROP CONSTRAINT IF EXISTS sftp_incidents_source_check;
  ALTER TABLE sftp_incidents
    ADD CONSTRAINT sftp_incidents_source_check
    CHECK (source IN ('NAQO', 'MiniLidar', 'MPL', 'WindLidar'));
END $$;
