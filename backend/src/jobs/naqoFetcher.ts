import { pool } from "../db/pool";
import fs from "fs";
import path from "path";

const NAQO_BASE = "https://tortoise-fluent-rationally.ngrok-free.app";
const STATION_ID = "NAQO_NCU";
const NAQO_DIR = path.join(process.env.UPLOAD_DIR ?? "uploads", "naqo");

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

export async function fetchAndIngestNaqo(): Promise<void> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fileName = `NAQO_API_${yyyymm}.json`;

  let logId: number | null = null;

  try {
    logId = await logTransfer("NAQO", fileName, null, "received");

    const res = await fetch(`${NAQO_BASE}/api/60min/json/${yyyymm}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    // API 回傳 HTML，JSON 資料包在 <pre>...</pre> 內
    const match = text.match(/<pre>([\/\s\S]*?)<\/pre>/);
    const jsonStr = match ? match[1].replace(/&#34;/g, '"') : text;
    const records: NaqoRecord[] = JSON.parse(jsonStr);
    if (!Array.isArray(records)) throw new Error("回傳格式非陣列");

    // 原始 JSON 落地存檔
    fs.mkdirSync(NAQO_DIR, { recursive: true });
    const filePath = path.join(NAQO_DIR, fileName);
    const fileContent = JSON.stringify(records, null, 2);
    fs.writeFileSync(filePath, fileContent, "utf-8");
    const fileSize = Buffer.byteLength(fileContent, "utf-8");

    // 更新 log 的 file_size
    await pool.query(
      "UPDATE sftp_transfer_logs SET file_size = $1 WHERE id = $2",
      [fileSize, logId],
    );
    let inserted = 0;
    for (const row of records) {
      const measuredAt = parseTimestamp(row["日期時間"]);

      // 計算 NO₂：NO₂ = NOX - NO
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
    console.error(`[NAQO] fetch failed: ${msg}`);
    if (logId !== null) await updateLogStatus(logId, "failed", msg);
  }
}
