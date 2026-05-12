# 資料庫內容模組

依資料來源分類瀏覽上傳記錄，支援關鍵字搜尋、分頁、批次匯出 Excel 與批次刪除。

> 此頁面由「資料來源管理」頁面的「查看資料庫」按鈕進入，路由為 `/source-database/:category`。

## 支援的資料來源（category）

| `category`  | 顯示名稱              | 資料來源方式       |
| ----------- | --------------------- | ------------------ |
| `uav`       | 無人機資料系統        | 手動上傳（Upload） |
| `naqo`      | NAQO 中大空品站       | SFTP 自動推送      |
| `windlidar` | WindLidar 風廓線光達  | SFTP 自動推送      |
| `mpl`       | MPL 微脈衝光達        | SFTP 自動推送      |

## 相關 API

### UAV（查詢 `file_uploads` 表）

| 方法   | 路徑                                              | 權限   | 說明                     |
| ------ | ------------------------------------------------- | ------ | ------------------------ |
| GET    | `/api/uploads/by-category/:category`              | 需登入 | 依類別查詢上傳記錄       |
| DELETE | `/api/uploads/history/:uploadId`                  | 需登入 | 刪除單筆記錄與實體檔案   |

Query string：`?page=1&limit=9999`

Response：

```json
{ "total": 100, "page": 1, "limit": 9999, "records": [ { "uploadId": 1, "fileName": "...", ... } ] }
```

### SFTP 來源（查詢 `sftp_transfer_logs` 表）

| 方法 | 路徑                          | 權限   | 說明                                    |
| ---- | ----------------------------- | ------ | --------------------------------------- |
| GET  | `/api/sftp/records/:source`   | 需登入 | 依來源查詢 SFTP 傳輸記錄（格式同上）    |

- `:source` 會自動轉大寫（`naqo` → `NAQO`）
- 回傳欄位對齊 `file_uploads`，`dataType` 固定為 `hourly_obs`，`username` 欄位填入來源名稱

---

## 資料欄位說明

| 欄位           | 說明                                                              |
| -------------- | ----------------------------------------------------------------- |
| `uploadId`     | 記錄 ID                                                           |
| `fileName`     | 檔案名稱                                                          |
| `dataCategory` | 資料來源類別（`uav` / `naqo` / `windlidar` / `mpl`）             |
| `dataType`     | 資料子類型（見下方）                                              |
| `fileSize`     | 檔案大小（bytes）                                                 |
| `uploadStatus` | 狀態：`completed` / `processing` / `failed` / `uploading` / `cancelled` |
| `createdAt`    | 上傳 / 接收時間（顯示為台北時間）                                 |
| `username`     | 上傳者帳號；SFTP 來源顯示來源名稱                                 |

### 資料子類型（dataType）

| `dataType`       | 說明       |
| ---------------- | ---------- |
| `flight_path`    | 飛行軌跡   |
| `imagery`        | 影像資料   |
| `meteorological` | 氣象資料   |
| `hourly_obs`     | 逐時觀測   |

---

## 功能說明

### 搜尋
- 即時過濾，比對欄位：檔案名稱、資料類型、上傳者

### 分頁
- 每頁筆數：10 / 30 / 50 / 100 / 200 / 全部

### 批次操作
- 勾選後顯示操作列，支援：
  - **匯出 Excel**：將選取記錄匯出為 `.xlsx`，檔名格式 `{category}_records_{timestamp}.xlsx`
  - **刪除選取**：呼叫 DELETE API 刪除記錄與實體檔案（不可復原）
- `uploading` 狀態的記錄不可勾選

---

## 資料庫查詢參考

```sql
-- UAV 上傳記錄
SELECT upload_id, file_name, data_category, data_type, file_size,
       upload_status, created_at, username
FROM file_uploads
WHERE data_category = 'uav'
ORDER BY created_at DESC;

-- SFTP 傳輸記錄（NAQO / WindLidar / MPL）
SELECT id, source, file_name, file_size, status, received_at
FROM sftp_transfer_logs
WHERE source = 'NAQO'   -- 或 'WINDLIDAR' / 'MPL'
ORDER BY received_at DESC;
```
