-- Migration: 001_create_file_uploads
-- 建立 file_uploads 資料表

CREATE TABLE IF NOT EXISTS file_uploads (
    upload_id         SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL,
    file_name         VARCHAR(255) NOT NULL,
    file_path         VARCHAR(500) NOT NULL,
    file_size         BIGINT NOT NULL,
    data_category     VARCHAR(20) NOT NULL CHECK (data_category IN ('uav')),
    station           VARCHAR(50) NOT NULL,
    upload_status     VARCHAR(20) NOT NULL DEFAULT 'uploading'
                        CHECK (upload_status IN ('uploading', 'completed', 'failed', 'cancelled')),
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (validation_status IN ('pending', 'valid', 'invalid')),
    validation_errors JSONB,
    metadata          JSONB,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id      ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_upload_status ON file_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at   ON file_uploads(created_at DESC);

-- admin_audit_logs（若尚未存在）
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    log_id      SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    action      VARCHAR(50) NOT NULL,
    resource    VARCHAR(50),
    resource_id INTEGER,
    ip_address  VARCHAR(45),
    details     JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);
