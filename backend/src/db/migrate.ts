import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/001_create_file_uploads.sql'),
    'utf-8',
  );
  await pool.query(sql);
  console.log('Migration completed.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
