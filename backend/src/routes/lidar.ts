import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import { scanStations, runLidarParser } from '../services/lidarService';

const router = Router();

// GET /api/lidar/stations
router.get('/stations', authenticateJWT, (_req: Request, res: Response): void => {
  try {
    const stations = scanStations();
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// GET /api/lidar/plot-data
router.get('/plot-data', authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  const { station, start, end, heightMax, panels } = req.query;

  if (!station || !start || !end) {
    res.status(400).json({ message: 'station, start, end 為必填參數' });
    return;
  }

  const hMax = parseFloat(heightMax as string ?? '1');
  if (isNaN(hMax)) {
    res.status(400).json({ message: 'heightMax 必須是數字' });
    return;
  }

  try {
    const data = await runLidarParser({
      station:   station as string,
      start:     start   as string,
      end:       end     as string,
      heightMax: hMax,
      panels:    (panels as string | undefined) ?? 'nrb,depol,temperature,backgroundEnergy',
    });
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message: msg });
  }
});

// GET /api/lidar/health
router.get('/health', authenticateJWT, async (_req: Request, res: Response): Promise<void> => {
  const { exec } = await import('child_process');
  const pythonCmd = process.env.PYTHON_CMD ?? 'python3';

  exec(`${pythonCmd} -c "from netCDF4 import Dataset; print('ok')"`, (error, stdout) => {
    res.json({
      netcdf4: error ? 'unavailable' : stdout.trim(),
      lidarDir: process.env.LIDAR_DIR ?? 'uploads/sftp/lidar',
    });
  });
});

export default router;
