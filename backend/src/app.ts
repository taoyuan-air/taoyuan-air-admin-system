import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRouter from './routes/uploads';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/uploads', uploadRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
