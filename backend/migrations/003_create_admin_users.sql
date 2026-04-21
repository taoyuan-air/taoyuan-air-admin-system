-- Migration: 003_create_admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    user_id              SERIAL PRIMARY KEY,
    username             VARCHAR(50)  UNIQUE NOT NULL,
    email                VARCHAR(100) UNIQUE NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    full_name            VARCHAR(100) NOT NULL,
    role_code            VARCHAR(20)  NOT NULL
                           CHECK (role_code IN ('system_admin', 'data_manager', 'readonly')),
    organization         VARCHAR(100),
    upload_quota_gb      INTEGER      NOT NULL DEFAULT 10,
    is_active            BOOLEAN      NOT NULL DEFAULT true,
    must_change_password BOOLEAN      NOT NULL DEFAULT true,
    last_login           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username  ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_code ON admin_users(role_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
