import { Pool } from 'pg';
import dotenv from 'dotenv';
import { requiredSetting } from '../config';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'taoyuan_air',
  user: requiredSetting('DB_USER'),
  password: requiredSetting('DB_PASSWORD'),
});
