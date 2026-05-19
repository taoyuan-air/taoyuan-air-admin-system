-- Migration: 008_rename_windlidar_to_minilidar
-- Renames the data source identifier 'WindLidar' -> 'MiniLidar' in all tables.
-- Idempotent: UPDATE has no effect after first run; DO block drops then re-adds constraint.

UPDATE sftp_transfer_logs SET source = 'MiniLidar' WHERE source = 'WindLidar';
UPDATE sftp_incidents     SET source = 'MiniLidar' WHERE source = 'WindLidar';

-- Replace CHECK constraint on sftp_incidents (auto-named by migration 007)
DO $$
BEGIN
  ALTER TABLE sftp_incidents DROP CONSTRAINT IF EXISTS sftp_incidents_source_check;
  ALTER TABLE sftp_incidents
    ADD CONSTRAINT sftp_incidents_source_check
    CHECK (source IN ('NAQO', 'MiniLidar', 'MPL'));
END $$;
