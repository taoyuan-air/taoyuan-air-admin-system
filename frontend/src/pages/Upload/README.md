# 資料上傳模組

UAV 無人機檔案上傳、進度追蹤（SSE）與歷史記錄管理。

> LiDAR 資料（WindLidar、MPL）改由對方透過 SFTP 推送，不再經由此介面手動上傳。

## 相關 API

| 方法   | 路徑                                     | 權限         | 說明                     |
| ------ | ---------------------------------------- | ------------ | ------------------------ |
| POST   | `/api/uploads`                           | 需上傳權限   | 上傳一或多個檔案         |
| GET    | `/api/uploads/progress/:uploadId`（SSE） | 需登入       | 即時追蹤單一檔案上傳進度 |
| GET    | `/api/uploads/history`                   | 需登入       | 查詢上傳歷史記錄         |
| DELETE | `/api/uploads/:uploadId`                 | 需登入       | 取消進行中的上傳         |
| DELETE | `/api/uploads/history/:uploadId`         | 需登入       | 刪除歷史記錄與實體檔案   |

### POST `/api/uploads`

Request（`multipart/form-data`）：

| 欄位           | 型別   | 說明                                                                        |
| -------------- | ------ | --------------------------------------------------------------------------- |
| `files`        | File[] | 一或多個檔案                                                                |
| `dataCategory` | string | `uav`                                                                       |
| `dataType`     | string | 見下方資料類型表                                                            |
| `metadata`     | string | JSON 字串，含 `collectionDate`、`locationDescription`、`equipmentModel`     |

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

---

## 支援的資料類型

### UAV（`dataCategory: "uav"`）

| `dataType`       | 說明       | 支援格式                          | 大小上限 |
| ---------------- | ---------- | --------------------------------- | -------- |
| `sensor`         | 感測器資料 | `.csv` `.json` `.xml` `.txt`      | 100 MB   |
| `flight_path`    | 飛行軌跡   | `.kml` `.gpx` `.csv` `.json`      | 10 MB    |
| `imagery`        | 影像資料   | `.jpg` `.png` `.tiff` `.raw`      | 200 MB   |
| `meteorological` | 氣象資料   | `.csv` `.json` `.nc`              | 50 MB    |

---

## 上傳流程

```
Step 1  選擇子類型（感測器 / 飛行軌跡 / 影像 / 氣象）
  ↓
Step 2  拖放或選擇檔案 → 前端驗證格式與大小 → 點擊「開始上傳」
  │
  ├─ POST /api/uploads  →  取得 uploadIds
  │
  └─ 對每個 uploadId 建立 SSE 連線
       GET /api/uploads/progress/:uploadId?token=<jwt>
       每秒接收進度，直到 completed / failed / cancelled
  ↓
Step 3  顯示上傳結果（成功 / 失敗統計）
```

---

## 資料庫查詢（file_uploads 表）

```sql
-- 查所有上傳記錄（最新優先）
SELECT upload_id, user_id, file_name, file_size, data_category,
       upload_status, validation_status, created_at
FROM file_uploads
ORDER BY created_at DESC;

-- 查 UAV 上傳
SELECT * FROM file_uploads WHERE data_category = 'uav';
```
