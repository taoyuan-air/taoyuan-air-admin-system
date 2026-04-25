import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import uploadRouter from './routes/uploads';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import sftpRouter from './routes/sftp';
import { fetchAndIngestNaqo } from './jobs/naqoFetcher';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/users', usersRouter);
app.use('/api/sftp', sftpRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // 每小時第 5 分鐘執行一次（例如 00:05, 01:05, ...）
  cron.schedule('5 * * * *', () => fetchAndIngestNaqo());
  // 啟動時立即執行一次，確認連線正常
  fetchAndIngestNaqo();
});

export default app;
