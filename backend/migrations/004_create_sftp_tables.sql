-- Migration: 004_create_sftp_tables

CREATE TABLE IF NOT EXISTS naqo_hourly (
    id            SERIAL PRIMARY KEY,
    station_id    VARCHAR(20)   NOT NULL,
    measured_at   TIMESTAMPTZ   NOT NULL,
    pm25          NUMERIC(6,2),
    o3            NUMERIC(6,2),
    no2           NUMERIC(6,2),
    no            NUMERIC(6,2),
    nox           NUMERIC(6,2),
    so2           NUMERIC(6,2),
    co            NUMERIC(6,3),
    co2           NUMERIC(8,2),
    ch4           NUMERIC(6,3),
    nmhc          NUMERIC(6,3),
    thc           NUMERIC(6,3),
    qc_flag       SMALLINT      DEFAULT 0,
    source_file   VARCHAR(255),
    ingested_at   TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (station_id, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_naqo_hourly_time ON naqo_hourly (measured_at DESC);

CREATE TABLE IF NOT EXISTS sftp_transfer_logs (
    id            SERIAL PRIMARY KEY,
    source        VARCHAR(20)   NOT NULL,
    file_name     VARCHAR(255)  NOT NULL,
    file_size     BIGINT,
    data_time     TIMESTAMPTZ,
    status        VARCHAR(20)   NOT NULL
                  CHECK (status IN ('received', 'parsed', 'failed')),
    error_msg     TEXT,
    received_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sftp_logs_source     ON sftp_transfer_logs (source);
CREATE INDEX IF NOT EXISTS idx_sftp_logs_received_at ON sftp_transfer_logs (received_at DESC);
