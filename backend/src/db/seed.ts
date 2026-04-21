import bcrypt from 'bcrypt';
import { pool } from './pool';
import dotenv from 'dotenv';

dotenv.config();

const TEMP_PASSWORD = 'REMOVED_REVOKED_SECRET';

async function seed() {
  const hash = await bcrypt.hash(TEMP_PASSWORD, 12);

  await pool.query(
    `INSERT INTO admin_users
       (username, email, password_hash, full_name, role_code, organization, upload_quota_gb, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (username) DO NOTHING`,
    ['admin', 'admin@taoyuan-air.gov.tw', hash, '系統管理員', 'system_admin', '桃園市政府', 100, true],
  );

  console.log('✅ 初始管理員帳號建立完成');
  console.log('   帳號：admin');
  console.log(`   臨時密碼：${TEMP_PASSWORD}`);
  console.log('   請立即登入並修改密碼。');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
