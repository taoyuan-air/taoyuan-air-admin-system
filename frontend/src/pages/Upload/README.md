# Upload 頁面

UAV 檔案手動上傳、SSE 進度追蹤與歷史記錄管理。

> LiDAR / WindLidar / MPL 資料改由 SFTP 流程處理，不再經由此介面手動上傳。

## 流程

```text
Step 1  選擇 UAV 測站
Step 2  選擇 .csv / .txt 檔案並送出
        POST /api/uploads
        multipart/form-data:
          files   File[]
          station 測站 slug，例如 taoyuan
        回傳 uploadIds
        對每個 uploadId 建立 SSE 連線
        GET /api/uploads/progress/:uploadId?token=<jwt>
Step 3  顯示完成 / 失敗結果
```

## API

| Method | Path                                 | 權限     | 說明 |
| ------ | ------------------------------------ | -------- | ---- |
| POST   | `/api/uploads`                       | 上傳權限 | 上傳一或多個 UAV 檔案 |
| GET    | `/api/uploads/progress/:uploadId`    | 需登入   | 追蹤單一檔案上傳進度 |
| GET    | `/api/uploads/history`               | 需登入   | 查詢 UAV 上傳歷史 |
| DELETE | `/api/uploads/:uploadId`             | 需登入   | 取消進行中的上傳 |
| DELETE | `/api/uploads/history/:uploadId`     | 需登入   | 刪除歷史記錄與實體檔案 |

### POST `/api/uploads`

Request: `multipart/form-data`

| 欄位      | 型別   | 必填 | 說明 |
| --------- | ------ | ---- | ---- |
| `files`   | File[] | 是   | 一或多個檔案 |
| `station` | string | 是   | 測站 slug，例如 `taoyuan` |

後端固定將 `data_category` 寫為 `uav`，不再接受前端傳入 `dataCategory` 或 `metadata`。

Response `202`:

```json
{ "uploadIds": [1, 2], "message": "上傳已開始處理" }
```

### GET `/api/uploads/progress/:uploadId`

SSE 連線不支援自訂 header，因此 token 由 query string 傳入：

```text
GET /api/uploads/progress/1?token=<jwt>
```

Event payload:

```json
{ "uploadId": 1, "progress": 50, "status": "uploading" }
```

`status` 可能值：`uploading`、`completed`、`failed`、`cancelled`、`unknown`。

### GET `/api/uploads/history`

Query string:

| 參數       | 說明 |
| ---------- | ---- |
| `page`     | 頁碼，預設 `1` |
| `limit`    | 每頁筆數，預設 `20` |
| `station`  | 測站 slug |
| `status`   | 上傳狀態 |
| `dateFrom` | 起始時間，ISO 8601 |
| `dateTo`   | 結束時間，ISO 8601 |
| `all`      | admin 可用 `true` 查全部 |
| `userId`   | admin 指定使用者 |

Response:

```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "records": [
    {
      "uploadId": 1,
      "fileName": "uav_20260401.csv",
      "filePath": "uav/taoyuan/1710000000000_ab12cd_uav_20260401.csv",
      "fileSize": 204800,
      "dataCategory": "uav",
      "station": "taoyuan",
      "uploadStatus": "completed",
      "validationStatus": "valid",
      "createdAt": "2026-04-01T08:15:00.000Z",
      "username": "partner01"
    }
  ]
}
```

## 資料欄位

UAV 手動上傳目前只依測站分類，不再使用 `dataType` / `data_type`，也不再寫入 `metadata`。

| 欄位 | 說明 |
| ---- | ---- |
| `data_category` | 固定為 `uav` |
| `station` | 測站 slug |
| `file_path` | 相對於 `backend/uploads` 的檔案路徑 |

## 支援格式

| 類別 | 支援格式 | 存放位置 |
| ---- | -------- | -------- |
| UAV  | `.csv` `.txt` | `backend/uploads/uav/{station}/` |

## 測站

| 測站 | `station` slug | 存放目錄 |
| ---- | -------------- | -------- |
| 桃園 | `taoyuan`      | `backend/uploads/uav/taoyuan/` |
| 大園 | `dayuan`       | `backend/uploads/uav/dayuan/` |
| 觀音 | `guanyin`      | `backend/uploads/uav/guanyin/` |
| 平鎮 | `pingzhen`     | `backend/uploads/uav/pingzhen/` |
| 龍潭 | `longtan`      | `backend/uploads/uav/longtan/` |
| 中壢 | `zhongli`      | `backend/uploads/uav/zhongli/` |
