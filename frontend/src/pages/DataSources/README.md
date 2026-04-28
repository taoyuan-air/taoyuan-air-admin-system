# 資料來源管理模組

管理各資料來源的 API 設定、同步排程、連線測試與同步日誌。

> 資料來源狀態與清單由 `AppDataContext`（`SourceRecord[]`）統一管理，Demo 模式下不打後端 API。

## 相關 API

| 方法 | 路徑                              | 權限   | 說明                              |
| ---- | --------------------------------- | ------ | --------------------------------- |
| GET  | `/api/sftp/last-sync`             | 需登入 | 取得各來源最後同步時間            |
| GET  | `/api/sftp/logs`                  | 需登入 | 查詢 SFTP 傳輸記錄（同步日誌）    |
| GET  | `/api/sftp/records/:source`       | 需登入 | 查詢 SFTP 來源的資料庫內容        |

> 新增 / 編輯 / 刪除資料來源目前為前端狀態操作，尚未串接後端 CRUD API。

### GET `/api/sftp/last-sync`

無 query string。

Response：

```json
{
  "NAQO":      "2026-04-01T08:05:00.000Z",
  "WindLidar": "2026-04-01T08:03:00.000Z",
  "MPL":       "2026-04-01T08:04:00.000Z",
  "UAV":       "2026-04-01T08:15:00.000Z"
}
```

- 查詢來源：SFTP 類查 `sftp_transfer_logs.MAX(received_at)`，UAV 查 `file_uploads.MAX(created_at)`
- 無資料時對應欄位回傳 `null`，前端顯示 `—`
- Demo 模式下不呼叫此 API

### GET `/api/sftp/logs`

Query string：

| 參數     | 說明                                      |
| -------- | ----------------------------------------- |
| `source` | 來源名稱（`NAQO` / `WindLidar` / `MPL`） |
| `limit`  | 最多筆數，上限 200，預設 50               |

Response：

```json
{
  "logs": [
    {
      "id": 1,
      "source": "NAQO",
      "file_name": "NAQO_20260401_08.json",
      "file_size": 4096,
      "data_time": "2026-04-01T08:00:00",
      "status": "parsed",
      "error_msg": null,
      "received_at": "2026-04-01T08:05:00"
    }
  ]
}
```

`status` 可能值：`parsed` | `received` | `failed`

---

## 資料來源類型（type）

| `type`          | 說明               | 傳輸方式       |
| --------------- | ------------------ | -------------- |
| `SFTP`          | SFTP 自動推送      | `sftp`         |
| `UAV`           | 無人機手動上傳     | `manual`       |
| `EPA`           | 環境部空品監測網   | `api`          |
| `CWA`           | 中央氣象署觀測     | `api`          |
| `IoT`           | IoT 微型感測器     | `api`          |
| `WindProfiler`  | 風廓線儀           | `api`          |

---

## 預設資料來源（AppDataContext 初始值）

| id | 名稱                  | type   | 端點                                              | 頻率     |
| -- | --------------------- | ------ | ------------------------------------------------- | -------- |
| 6  | NAQO 中大空品站       | SFTP   | `sftp://140.115.80.244/NAQO`                      | 逐時接收 |
| 7  | WindLidar 風廓線光達  | SFTP   | `sftp://140.115.80.244/WindLidar`                 | 逐時接收 |
| 8  | MPL 微脈衝光達        | SFTP   | `sftp://140.115.80.244/MPL`                       | 逐時接收 |
| 2  | 無人機資料系統        | UAV    | `http://uav.internal/api/upload`                  | 手動     |
| 3  | 環境部空品監測網      | EPA    | `https://data.epa.gov.tw/api/v2/aqx_p_432`        | 每 60 分 |
| 4  | 中央氣象署觀測        | CWA    | `https://opendata.cwa.gov.tw/api/v1/rest/datastore`| 每 30 分 |
| 5  | IoT 微型感測器        | IoT    | `https://iot.taoyuan.gov.tw/api`                  | 每 15 分 |

---

## 功能說明

### 卡片資訊
每張卡片顯示：名稱、類型標籤、API 端點、同步頻率（SFTP 顯示「逐時接收」）、最後同步時間、連線狀態、啟用狀態。

**最後同步時間行為：**
- 真實模式：頁面載入時呼叫 `/api/sftp/last-sync`，以資料庫實際時間覆蓋初始值（id 2/6/7/8）
- API 回傳 `null` 或呼叫失敗：顯示 `—`
- Demo 模式：一律顯示 `—`
- EPA / CWA / IoT（id 3/4/5）：不從 API 取得，維持 `AppDataContext` 初始值

### 操作按鈕

| 按鈕         | 適用類型         | 說明                                                                 |
| ------------ | ---------------- | -------------------------------------------------------------------- |
| 瀏覽資料庫   | UAV、SFTP        | 導向 `/source-db/:category`（SourceDatabase 頁面）                  |
| 傳輸記錄     | SFTP             | 開啟 Modal，呼叫 `/api/sftp/logs?source=<SOURCE>&limit=50`           |
| 測試連線     | 非 SFTP          | 前端模擬測試（2 秒後恢復，尚未串接後端）                             |
| 編輯設定     | 全部             | 開啟表單 Modal，修改名稱、類型、端點、同步頻率                       |
| 同步日誌     | 全部             | 開啟 Modal，顯示 mock 同步日誌（Demo 模式）                          |

### 新增 / 編輯表單欄位

| 欄位         | 必填 | 驗證規則                          |
| ------------ | ---- | --------------------------------- |
| 名稱         | ✓    | 不可空白                          |
| 資料類型     | ✓    | 從 `EPA/CWA/IoT/UAV/WindProfiler/SFTP` 選擇 |
| 同步頻率     |      | 數字，0 = 手動，上限 1440 分鐘    |
| API 端點     | ✓    | 必須為有效 `http/https` URL       |

---

## SourceRecord 型別

```ts
interface SourceRecord {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  frequency: number;       // 0 = 手動
  active: boolean;
  lastSync: string;
  status: 'success' | 'error' | 'pending';
  transferMode?: 'sftp' | 'api' | 'manual';
}
```

---

## 資料庫查詢參考

```sql
-- 各來源最後同步時間
SELECT source, MAX(received_at) AS last_sync
FROM sftp_transfer_logs
GROUP BY source;

-- UAV 最後上傳時間
SELECT MAX(created_at) AS last_sync
FROM file_uploads
WHERE data_category = 'uav';

-- SFTP 傳輸記錄（同步日誌）
SELECT id, source, file_name, file_size, data_time, status, error_msg, received_at
FROM sftp_transfer_logs
WHERE source = 'NAQO'   -- 或 'WindLidar' / 'MPL'
ORDER BY received_at DESC
LIMIT 50;
```
