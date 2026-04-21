# 資料上傳模組

LiDAR / UAV 檔案上傳、進度追蹤（SSE）與歷史記錄管理。

## 相關 API

| 方法   | 路徑                                     | 權限         | 說明                   |
| ------ | ---------------------------------------- | ------------ | ---------------------- |
| POST   | `/api/uploads`                           | 需上傳權限   | 上傳一或多個檔案       |
| GET    | `/api/uploads/progress/:uploadId`（SSE） | 需登入       | 即時追蹤單一檔案上傳進度 |
| GET    | `/api/uploads/history`                   | 需登入       | 查詢上傳歷史記錄       |
| DELETE | `/api/uploads/:uploadId`                 | 需登入       | 取消進行中的上傳       |
| DELETE | `/api/uploads/history/:uploadId`         | 需登入       | 刪除歷史記錄與實體檔案 |

### POST `/api/uploads`

Request（`multipart/form-data`）：

| 欄位           | 型別   | 說明                                                    |
| -------------- | ------ | ------------------------------------------------------- |
| `files`        | File[] | 一或多個檔案                                            |
| `dataCategory` | string | `lidar` \| `uav`                                        |
| `dataType`     | string | 見下方資料類型表                                        |
| `metadata`     | string | JSON 字串，含 `collectionDate`、`locationDescription`、`equipmentModel` |

Response `202`：

```json
{ "uploadIds": [1, 2], "message": "上傳已開始處理" }
```

### GET `/api/uploads/progress/:uploadId`（SSE）

- SSE 不支援自訂 header，token 可改由 query string 傳入：`?token=<jwt>`
- 每秒推送一次，格式：

```json
{ "uploadId": 1, "progress": 50, "status": "uploading" }
```

`status` 可能值：`uploading` | `completed` | `failed` | `cancelled` | `unknown`

### GET `/api/uploads/history`

Query 參數（皆選填）：

| 參數       | 說明                          |
| ---------- | ----------------------------- |
| `userId`   | 篩選特定使用者（僅 admin 可用）|
| `dataType` | 篩選資料類型                  |
| `status`   | 篩選狀態                      |
| `dateFrom` | 起始日期                      |
| `dateTo`   | 結束日期                      |
| `page`     | 頁碼（預設 1）                |
| `limit`    | 每頁筆數（預設 20）           |

### DELETE `/api/uploads/:uploadId`

- 只能取消狀態為 `uploading` 的上傳，已完成者回傳 `409`

### DELETE `/api/uploads/history/:uploadId`

- 同步刪除資料庫記錄與伺服器上的實體檔案
- 上傳進行中（`uploading`）時無法刪除，需先取消

---

## 支援的資料類型

### LiDAR（`dataCategory: "lidar"`）

| `dataType`       | 說明       | 支援格式                        | 大小上限 |
| ---------------- | ---------- | ------------------------------- | -------- |
| `point_cloud`    | 點雲資料   | `.las` `.laz` `.ply` `.pcd` `.xyz` | 500 MB   |
| `wind_field`     | 風場資料   | `.nc` `.hdf5` `.csv` `.json`    | 100 MB   |
| `boundary_layer` | 大氣邊界層 | `.nc` `.csv` `.json`            | 50 MB    |

### UAV（`dataCategory: "uav"`）

| `dataType`      | 說明       | 支援格式                          | 大小上限 |
| --------------- | ---------- | --------------------------------- | -------- |
| `sensor`        | 感測器資料 | `.csv` `.json` `.xml` `.txt`      | 100 MB   |
| `flight_path`   | 飛行軌跡   | `.kml` `.gpx` `.csv` `.json`      | 10 MB    |
| `imagery`       | 影像資料   | `.jpg` `.png` `.tiff` `.raw`      | 200 MB   |
| `meteorological`| 氣象資料   | `.csv` `.json` `.nc`              | 50 MB    |

---

## 上傳流程

```
Step 1  選擇大類（LiDAR / UAV）
  ↓
Step 2  選擇子類型
  ↓
Step 3  拖放或選擇檔案 → 前端驗證格式與大小 → 點擊「開始上傳」
  │
  ├─ POST /api/uploads  →  取得 uploadIds
  │
  └─ 對每個 uploadId 建立 SSE 連線
       GET /api/uploads/progress/:uploadId?token=<jwt>
       每秒接收進度，直到 completed / failed / cancelled
  ↓
Step 4  顯示上傳結果（成功 / 失敗統計）
```

### 前端驗證（送出前）

1. 副檔名需符合所選子類型的 `allowedExts`
2. 檔案大小需在 `maxSizeBytes` 以內
3. 重複檔案（同名同大小）不允許加入待上傳清單

### 歷史記錄

- 頁面載入時自動呼叫 `GET /api/uploads/history?page=1&limit=50` 取得最近記錄
- 支援依檔案名稱、資料類型、上傳者關鍵字搜尋
- 每頁筆數可選：10 / 30 / 50 / 100 / 200 / All
- 狀態為 `processing`（上傳中）的記錄無法刪除，需先取消上傳

---

## 資料庫查詢（file_uploads 表）

### 連線方式

**psql 直接連線：**

```bash
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME>
```

**透過 Docker 容器連線：**

```bash
docker exec -it <container_name> psql -U <DB_USER> -d <DB_NAME>
```

> 連線參數請參考 `backend/.env`。

### 常用查詢

```sql
-- 查所有上傳記錄（最新優先）
SELECT upload_id, user_id, file_name, file_size, data_category,
       upload_status, validation_status, created_at
FROM file_uploads
ORDER BY created_at DESC;

-- 查特定使用者的上傳
SELECT * FROM file_uploads WHERE user_id = 1;

-- 查上傳成功且驗證通過
SELECT * FROM file_uploads
WHERE upload_status = 'completed' AND validation_status = 'valid';

-- 查驗證失敗（含錯誤原因）
SELECT file_name, validation_errors, created_at
FROM file_uploads
WHERE validation_status = 'invalid';

-- 查 metadata 欄位
SELECT file_name, metadata FROM file_uploads WHERE metadata IS NOT NULL;

-- 依資料類型篩選
SELECT * FROM file_uploads WHERE data_category = 'lidar';
SELECT * FROM file_uploads WHERE data_category = 'uav';
```

### 欄位說明

| 欄位               | 說明                                                        |
| ------------------ | ----------------------------------------------------------- |
| `upload_id`        | 上傳記錄 ID                                                 |
| `user_id`          | 上傳者 ID（對應 `admin_users.user_id`）                     |
| `file_name`        | 原始檔案名稱                                                |
| `file_path`        | 伺服器儲存路徑                                              |
| `file_size`        | 檔案大小（bytes）                                           |
| `data_category`    | `lidar` \| `uav`                                            |
| `data_type`        | 子類型，如 `point_cloud`、`sensor` 等                       |
| `upload_status`    | `uploading` \| `completed` \| `failed` \| `cancelled`       |
| `validation_status`| `pending` \| `valid` \| `invalid`                           |
| `validation_errors`| JSONB，驗證失敗的錯誤詳情                                   |
| `metadata`         | JSONB，含 `collectionDate`、`locationDescription`、`equipmentModel` |
| `created_at`       | 上傳時間                                                    |
| `processed_at`     | 處理完成時間                                                |
