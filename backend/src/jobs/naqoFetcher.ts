import { pool } from "../db/pool";
import fs from "fs";
import path from "path";

const STATION_ID = "NAQO_NCU";
const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, "..", "..", "uploads");
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : DEFAULT_UPLOAD_DIR;
const SFTP_NAQO_DIR = path.join(UPLOAD_DIR, "sftp", "naqo");

interface NaqoRecord {
  日期時間: string;
  PM25: string;
  O3: string;
  NO2?: string;
  NO: string;
  NOX: string;
  SO2: string;
  CO: string;
  CO2: string;
  CH4: string;
  NMHC: string;
  THC: string;
}

function parseTimestamp(raw: string): Date {
  // "2025/01/04 06:00:00" → Date (UTC+8 treated as Asia/Taipei)
  const normalized = raw.replace(/\//g, "-");
  return new Date(`${normalized}+08:00`);
}

function f(val: string | undefined): number | null {
  if (val === undefined || val === null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function logTransfer(
  source: string,
  fileName: string,
  dataTime: Date | null,
  status: "received" | "parsed" | "failed",
  errorMsg?: string,
): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO sftp_transfer_logs (source, file_name, data_time, status, error_msg)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [source, fileName, dataTime, status, errorMsg ?? null],
  );
  return result.rows[0].id;
}

async function updateLogStatus(
  id: number,
  status: "parsed" | "failed",
  errorMsg?: string,
): Promise<void> {
  await pool.query(
    `UPDATE sftp_transfer_logs SET status = $1, error_msg = $2 WHERE id = $3`,
    [status, errorMsg ?? null, id],
  );
}

async function isAlreadyParsed(fileName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM sftp_transfer_logs WHERE source = 'NAQO' AND file_name = $1 AND status = 'parsed' LIMIT 1`,
    [fileName],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

async function ingestFile(fileName: string, filePath: string): Promise<void> {
  let logId: number | null = null;
  try {
    logId = await logTransfer("NAQO", fileName, null, "received");

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const fileSize = Buffer.byteLength(fileContent, "utf-8");
    const records: NaqoRecord[] = JSON.parse(fileContent);
    if (!Array.isArray(records)) throw new Error("檔案格式非陣列");

    await pool.query(
      "UPDATE sftp_transfer_logs SET file_size = $1 WHERE id = $2",
      [fileSize, logId],
    );

    let inserted = 0;
    for (const row of records) {
      const measuredAt = parseTimestamp(row["日期時間"]);

      // NO₂ = NOX - NO（NAQO 資料來源無原生 NO2 欄位）
      const noxVal = f(row.NOX);
      const noVal = f(row.NO);
      const no2Val = noxVal !== null && noVal !== null ? noxVal - noVal : null;

      await pool.query(
        `INSERT INTO naqo_hourly
           (station_id, measured_at, pm25, o3, no2, no, nox, so2, co, co2, ch4, nmhc, thc, source_file)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (station_id, measured_at) DO NOTHING`,
        [
          STATION_ID,
          measuredAt,
          f(row.PM25),
          f(row.O3),
          no2Val,
          noVal,
          noxVal,
          f(row.SO2),
          f(row.CO),
          f(row.CO2),
          f(row.CH4),
          f(row.NMHC),
          f(row.THC),
          fileName,
        ],
      );
      inserted++;
    }

    await updateLogStatus(logId, "parsed");
    console.log(`[NAQO] ingested ${inserted} rows from ${fileName}`);
  } catch (err) {
    const msg = String(err);
    console.error(`[NAQO] failed to ingest ${fileName}: ${msg}`);
    if (logId !== null) await updateLogStatus(logId, "failed", msg);
  }
}

export async function fetchAndIngestNaqo(): Promise<void> {
  if (!fs.existsSync(SFTP_NAQO_DIR)) {
    console.warn(`[NAQO] SFTP directory not found: ${SFTP_NAQO_DIR}`);
    return;
  }

  const files = fs.readdirSync(SFTP_NAQO_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("[NAQO] no JSON files found in SFTP directory");
    return;
  }

  for (const fileName of files) {
    if (await isAlreadyParsed(fileName)) {
      console.log(`[NAQO] skip already parsed: ${fileName}`);
      continue;
    }
    await ingestFile(fileName, path.join(SFTP_NAQO_DIR, fileName));
  }
}
