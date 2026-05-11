import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LIDAR_DIR    = path.resolve(process.env.LIDAR_DIR ?? 'uploads/sftp/lidar');
const SCRIPTS_DIR  = path.resolve(__dirname, '../../scripts');
const PYTHON_CMD   = process.env.PYTHON_CMD ?? (process.platform === 'win32' ? 'python' : 'python3');

const VALID_STATION = /^[A-Za-z0-9_-]{1,64}$/;
const VALID_ISO     = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const VALID_PANEL   = /^(nrb|depol|temperature|backgroundEnergy)$/;

export interface StationInfo {
  name: string;
  dates: string[]; // YYYY-MM-DD in Taiwan local time (derived from UTC filename)
}

/**
 * Scan LIDAR_DIR and return a list of stations with their available dates.
 * File naming: {Station}_{YYYYMMDD}.nc  (UTC date)
 */
export function scanStations(): StationInfo[] {
  if (!fs.existsSync(LIDAR_DIR)) return [];

  const files = fs.readdirSync(LIDAR_DIR).filter(f => f.endsWith('.nc'));
  const map = new Map<string, Set<string>>();

  for (const f of files) {
    const m = f.match(/^([A-Za-z0-9_-]+)_(\d{8})\.nc$/);
    if (!m) continue;
    const [, station, dateStr] = m;
    const year  = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(4, 6), 10) - 1;
    const day   = parseInt(dateStr.slice(6, 8), 10);
    // UTC file date + Taiwan (+8h) means Taiwan local data starts from same UTC date
    // Surface: expose the UTC date as Taiwan local for simplicity; user picks that date
    const taiwanDate = new Date(Date.UTC(year, month, day))
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

    if (!map.has(station)) map.set(station, new Set());
    map.get(station)!.add(taiwanDate);
  }

  return Array.from(map.entries()).map(([name, dates]) => ({
    name,
    dates: Array.from(dates).sort(),
  }));
}

export interface PlotDataParams {
  station:   string;
  start:     string; // UTC ISO-8601
  end:       string;
  heightMax: number;
  panels:    string;
}

function validateParams(p: PlotDataParams): string | null {
  if (!VALID_STATION.test(p.station))  return '站點名稱格式不合法';
  if (!VALID_ISO.test(p.start))         return 'start 不是合法的 ISO-8601 格式';
  if (!VALID_ISO.test(p.end))           return 'end 不是合法的 ISO-8601 格式';
  if (p.heightMax < 0.1 || p.heightMax > 15) return 'heightMax 超出允許範圍 (0.1–15 km)';
  for (const panel of p.panels.split(',')) {
    if (!VALID_PANEL.test(panel.trim())) return `不合法的 panel 名稱：${panel}`;
  }
  return null;
}

export function runLidarParser(p: PlotDataParams): Promise<unknown> {
  const err = validateParams(p);
  if (err) return Promise.reject(new Error(err));

  const script = path.join(SCRIPTS_DIR, 'lidar_to_json.py');

  const args = [
    script,
    '--nc_dir',     LIDAR_DIR,
    '--station',    p.station,
    '--start',      p.start,
    '--end',        p.end,
    '--height_max', String(p.heightMax),
    '--panels',     p.panels,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_CMD, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    child.stdout.on('data', (d: Buffer) => chunks.push(d));
    child.stderr.on('data', (d: Buffer) => errChunks.push(d));

    child.on('close', code => {
      if (code !== 0) {
        const msg = Buffer.concat(errChunks).toString().trim();
        reject(new Error(`Python parser exited ${code}: ${msg}`));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Python parser returned invalid JSON'));
      }
    });

    child.on('error', err => reject(new Error(`Failed to start Python: ${err.message}`)));
  });
}
