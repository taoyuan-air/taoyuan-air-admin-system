-- Migration: 007_create_sftp_incidents

CREATE TABLE IF NOT EXISTS sftp_incidents (
    id              SERIAL PRIMARY KEY,

    source          VARCHAR(20)   NOT NULL
                    CHECK (source IN ('NAQO', 'WindLidar', 'MPL')),

    incident_type   VARCHAR(50)   NOT NULL
                    CHECK (incident_type IN (
                        'network_disconnect',
                        'computer_restart',
                        'software_update',
                        'sftp_service_error',
                        'power_outage',
                        'instrument_maintenance',
                        'hardware_failure',
                        'manual_stop',
                        'other'
                    )),

    started_at      TIMESTAMPTZ   NOT NULL,
    ended_at        TIMESTAMPTZ,

    affected_range  TEXT,
    note            TEXT,

    reported_by     INTEGER       NOT NULL
                    REFERENCES admin_users(user_id),

    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sftp_incidents_source
    ON sftp_incidents (source);

CREATE INDEX IF NOT EXISTS idx_sftp_incidents_started_at
    ON sftp_incidents (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sftp_incidents_ongoing
    ON sftp_incidents (started_at DESC)
    WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sftp_incidents_updated_at
BEFORE UPDATE ON sftp_incidents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
