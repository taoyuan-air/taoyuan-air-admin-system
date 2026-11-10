import bcrypt from 'bcrypt';
import { pool } from './pool';
import { requiredSetting } from '../config';

async function seed() {
  try {
    const existing = await pool.query("SELECT 1 FROM admin_users WHERE username = 'admin'");
    if (existing.rowCount) {
      console.log('Administrator already exists; no changes made.');
      return;
    }
    const password = requiredSetting('INITIAL_ADMIN_PASSWORD');
    delete process.env.INITIAL_ADMIN_PASSWORD;
    if (password.length < 20 || Buffer.byteLength(password) > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new Error('INITIAL_ADMIN_PASSWORD must be 20-72 bytes and contain letters and digits');
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO admin_users
        (username, email, password_hash, full_name, role_code, organization, upload_quota_gb, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (username) DO NOTHING RETURNING user_id`,
      ['admin', 'admin@taoyuan-air.gov.tw', hash, '系統管理員', 'system_admin', '桃園市政府', 100],
    );
    console.log(result.rowCount ? 'Administrator created; change the securely delivered initial password after login.' : 'Administrator already exists; no changes made.');
  } finally {
    await pool.end();
  }
}

seed().catch(() => {
  console.error('Seed failed. Check database access and INITIAL_ADMIN_PASSWORD configuration.');
  process.exitCode = 1;
});
