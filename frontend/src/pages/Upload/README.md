# 資料上傳模組

UAV 檔案上傳、進度追蹤（SSE）與歷史記錄管理。

> LiDAR 資料（WindLidar、MPL）改由對方透過 SFTP 推送，不再經由此介面手動上傳。

---

## 上傳流程

```
Step 1  選擇測站（桃園 / 大園 / 觀音 / 平鎮 / 龍潭 / 中壢）
  ↓
Step 2  拖放或選擇檔案 → 前端驗證格式 → 點擊「開始上傳」
  │
  ├─ POST /api/uploads  →  取得 uploadIds（含 metadata.station）
  │
  └─ 對每個 uploadId 建立 SSE 連線
       GET /api/uploads/progress/:uploadId?token=<jwt>
       每秒接收進度，直到 completed / failed / cancelled
  ↓
Step 3  顯示上傳結果（成功 / 失敗統計）
```

---

## 相關 API

| 方法   | 路徑                                     | 權限       | 說明                     |
| ------ | ---------------------------------------- | ---------- | ------------------------ |
| POST   | `/api/uploads`                           | 需上傳權限 | 上傳一或多個檔案         |
| GET    | `/api/uploads/progress/:uploadId`（SSE） | 需登入     | 即時追蹤單一檔案上傳進度 |
| GET    | `/api/uploads/history`                   | 需登入     | 查詢上傳歷史記錄         |
| GET    | `/api/uploads/by-category/:category`     | 需登入     | 依資料分類查詢上傳記錄   |
| DELETE | `/api/uploads/:uploadId`                 | 需登入     | 取消進行中的上傳         |
| DELETE | `/api/uploads/history/:uploadId`         | 需登入     | 刪除歷史記錄與實體檔案   |

### POST `/api/uploads`

Request（`multipart/form-data`）：

| 欄位           | 型別   | 必填 | 說明                      |
| -------------- | ------ | ---- | ------------------------- |
| `files`        | File[] | ✓    | 一或多個檔案              |
| `dataCategory` | string | ✓    | 固定為 `uav`              |
| `metadata`     | string |      | JSON 字串，見下方欄位說明 |

`metadata` 欄位（JSON 字串）：

| 欄位                  | 型別   | 說明                           |
| --------------------- | ------ | ------------------------------ |
| `collectionDate`      | string | 採集日期，格式 `YYYY-MM-DD`    |
| `locationDescription` | string | 行政區描述，如「桃園市桃園區」 |
| `equipmentModel`      | string | 設備型號（目前前端傳空字串）   |
| `station`             | string | 測站代碼，如 `taoyuan`         |
| `stationLabel`        | string | 測站名稱，如「桃園」           |

Response `202`：

```json
{ "uploadIds": [1, 2], "message": "上傳已開始處理" }
```

### GET `/api/uploads/progress/:uploadId`（SSE）

- SSE 不支援自訂 header，token 改由 query string 傳入：`?token=<jwt>`
- 每秒推送一次，格式：

```json
{ "uploadId": 1, "progress": 50, "status": "uploading" }
```

`status` 可能值：`uploading` | `completed` | `failed` | `cancelled` | `unknown`

### GET `/api/uploads/history`

Query string 篩選參數（均為選填）：

| 參數       | 說明                     |
| ---------- | ------------------------ |
| `page`     | 頁碼，預設 `1`           |
| `limit`    | 每頁筆數，預設 `20`      |
| `station`  | 篩選測站 slug            |
| `status`   | 篩選上傳狀態             |
| `dateFrom` | 起始時間（ISO 8601）     |
| `dateTo`   | 結束時間（ISO 8601）     |
| `all`      | `true` 時 admin 可看全部 |
| `userId`   | admin 指定查詢特定使用者 |

Response：

```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "records": [
    {
      "uploadId": 1,
      "fileName": "uav_20260401.csv",
      "fileSize": 204800,
      "dataCategory": "uav",
      "station": "taoyuan",
      "uploadStatus": "completed",
      "validationStatus": "valid",
      "metadata": { "station": "taoyuan", "stationLabel": "桃園", "collectionDate": "2026-04-01", ... },
      "createdAt": "2026-04-01T08:15:00.000Z",
      "username": "partner01"
    }
  ]
}
```

---

## 支援的上傳格式

目前 UAV 手動上傳不再使用 `dataType` / `data_type`。檔案只依測站分類。

| `dataCategory` | 支援格式      | 備註             |
| -------------- | ------------- | ---------------- |
| `uav`          | `.csv` `.txt` | 依測站資料夾存放 |

---

## 測站

前端固定測站清單（`STATION_OPTIONS`）：

| 測站名 | 行政區       | `station` slug | 實體儲存資料夾 |
| ------ | ------------ | -------------- | -------------- |
| 桃園   | 桃園市桃園區 | `taoyuan`      | `backend/uploads/uav/taoyuan/` |
| 大園   | 桃園市大園區 | `dayuan`       | `backend/uploads/uav/dayuan/` |
| 觀音   | 桃園市觀音區 | `guanyin`      | `backend/uploads/uav/guanyin/` |
| 平鎮   | 桃園市平鎮區 | `pingzhen`     | `backend/uploads/uav/pingzhen/` |
| 龍潭   | 桃園市龍潭區 | `longtan`      | `backend/uploads/uav/longtan/` |
| 中壢   | 桃園市中壢區 | `zhongli`      | `backend/uploads/uav/zhongli/` |

前端顯示中文測站名稱，送到後端時使用英文 slug，並寫入 `file_uploads.station` 欄位。

---

## 歷史記錄功能

- 即時追加：上傳完成後立即插入歷史表頭（SSE 完成事件觸發）
- 分頁：10 / 30 / 50 / 100 / 200 / 全部
- 搜尋：檔案名稱、上傳者、測站（前端模糊比對）
- 批次操作：多選後可刪除或匯出 Excel（含測站欄位）

---

## 目前已知問題與建議修正

以下為目前檢視 Upload 頁面、前端 service/hook、以及後端 `/api/uploads` 流程後發現的功能與邏輯風險。

### 優先修正

| 問題                                | 影響                                                                                                                                             | 建議修正                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 取消上傳可能被背景處理覆寫          | `DELETE /api/uploads/:uploadId` 將狀態改為 `cancelled` 後，背景儲存流程仍可能繼續完成，最後把 DB 狀態覆寫成 `completed`，檔案也可能仍被寫入。    | 背景處理在儲存前、更新完成前重新讀取狀態；若已取消則停止處理並清掉暫存檔。也可在 `ProgressService` 或 DB 加入取消旗標。                            |
| 取消上傳缺少擁有者/角色檢查         | 目前任何登入者只要知道 `uploadId`，就可能取消別人的未完成上傳。                                                                                  | `DELETE /api/uploads/:uploadId` 加上與歷史刪除相同的權限邏輯：`system_admin`、`data_manager` 才可取消。                                            |
| SSE 斷線會讓前端卡在上傳中          | `useUploadProgress` 的 `onerror` 只關閉連線，沒有回報失敗；若後端進度狀態消失並回 `unknown`，前端也不會進入結果頁。                              | 前端在 SSE error/timeout 時將該 upload 標記為 `failed` 或顯示可重試狀態；後端對 `unknown` 可補查 DB 狀態，若已完成/失敗/取消則回 terminal status。 |
| 歷史記錄只抓前 50 筆且本地搜尋/分頁 | Upload 頁面初始只呼叫 `/history?page=1&limit=50`，後續搜尋、分頁、匯出、批次刪除都只作用在這 50 筆。資料量超過 50 後會看不到或搜不到後面的紀錄。 | 改成 server-side pagination/search/filter；或整合既有 `useHistoryTable`，讓頁碼、筆數、搜尋條件都送到 `/api/uploads/history`。                     |

### 建議後續改善

| 問題                                    | 影響                                                                                                        | 建議修正                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 同一批新加入檔案未互相比對重複          | 前端 `stageFiles` 只跟既有 staged files 比對，沒有檢查同一次拖入/選取的檔案彼此是否重複。                   | 在 `stageFiles` 內用 `Set` 記錄本次 accepted keys（例如 `name:size:lastModified`），同批重複時加入 validation error。 |
---

## 資料庫查詢（file_uploads 表）

```sql
-- 查所有上傳記錄（最新優先）
SELECT upload_id, user_id, file_name, file_size, data_category, station,
       upload_status, validation_status, metadata, created_at
FROM file_uploads
ORDER BY created_at DESC;

-- 查 UAV 上傳
SELECT * FROM file_uploads
WHERE data_category = 'uav';

-- 查特定測站
SELECT * FROM file_uploads
WHERE station = 'taoyuan'
ORDER BY created_at DESC;
```
