# 資料來源管理模組

`DataSources` 是資料來源管理頁面，頁面上方以子頁切換分成：

1. **資料來源設定**
2. **傳輸異常事件**

資料來源清單由 `AppDataContext` 的 `SourceRecord[]` 管理；SFTP 異常事件目前由前端 mock data 管理，尚未串接後端 incidents API。

---

## 相關檔案

| 檔案 | 說明 |
| ---- | ---- |
| `index.tsx` | 資料來源管理主頁容器，負責子頁切換、資料來源 state、新增/編輯流程、SFTP 最後同步與傳輸記錄載入 |
| `dataSourceHelpers.ts` | 資料來源表單型別、mock logs、來源類型選項、表單驗證、共用 style 與資料庫分類工具 |
| `DataSourceTabs.tsx` | 「資料來源設定 / 傳輸異常事件」子頁切換 |
| `DataSourceCards.tsx` | 資料來源卡片列表、測試連線、瀏覽資料庫、傳輸記錄、編輯與同步日誌入口 |
| `DataSourceFormModal.tsx` | 新增 / 編輯資料來源 Modal |
| `SyncLogModal.tsx` | 一般資料來源同步日誌 Modal |
| `SftpLogModal.tsx` | SFTP 傳輸記錄 Modal |
| `IncidentLogSection.tsx` | 傳輸異常事件子頁，包含新增事件按鈕、分析區塊、事件列表、分頁與事件詳情 Modal |
| `IncidentAnalyticsSection.tsx` | 異常事件分析區塊，負責事件統計、篩選、圖表與規則式報告摘要 |
| `IncidentFormModal.tsx` | 新增 / 編輯異常事件表單 |
| `IncidentDetailModal.tsx` | 異常事件詳情 Modal，支援編輯與標記已恢復 |
| `incidentTypes.ts` | SFTP 異常事件型別、選項、格式化工具 |

### 拆分原則

- `index.tsx` 負責資料流、API 呼叫與 modal 開關，不直接堆疊大型 UI 區塊。
- 資料來源卡片、Tabs 與 Modal 只透過 props 接收狀態與 callback，不直接呼叫 API。
- 資料來源管理和異常事件管理維持分區，避免 incident 相關邏輯混回資料來源卡片列表。
- 共用 mock data、表單型別、表單驗證與格式化工具集中在 `dataSourceHelpers.ts`。

---

## 相關 API

| 方法 | 路徑 | 權限 | 說明 |
| ---- | ---- | ---- | ---- |
| GET | `/api/sftp/last-sync` | 需登入 | 取得各來源最後同步時間 |
| GET | `/api/sftp/logs` | 需登入 | 查詢 SFTP 傳輸記錄 |
| GET | `/api/sftp/records/:source` | 需登入 | 查詢 SFTP 來源的資料庫內容 |

> 新增 / 編輯資料來源目前為前端狀態操作，尚未串接後端 CRUD API。
> 傳輸異常事件目前為前端 mock data，尚未串接 `/api/incidents`。

### GET `/api/sftp/last-sync`

無 query string。

Response：

```json
{
  "NAQO": "2026-04-01T08:05:00.000Z",
  "WindLidar": "2026-04-01T08:03:00.000Z",
  "MPL": "2026-04-01T08:04:00.000Z",
  "UAV": "2026-04-01T08:15:00.000Z"
}
```

行為：
- 真實模式：頁面載入時呼叫此 API，覆蓋 UAV / SFTP 來源的最後同步時間。
- API 回傳 `null`：前端顯示 `—`。
- Demo 模式：不呼叫 API。

### GET `/api/sftp/logs`

Query string：

| 參數 | 說明 |
| ---- | ---- |
| `source` | 來源名稱：`NAQO` / `WindLidar` / `MPL` |
| `limit` | 最多筆數，上限 200，預設 50 |

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

# 一、資料來源設定子頁

## 功能定位

此子頁用於管理所有資料來源的基本設定、同步資訊與操作入口。畫面以卡片列表呈現每個資料來源。

## 預設資料來源

| id | 名稱 | type | 端點 | 頻率 |
| -- | ---- | ---- | ---- | ---- |
| 6 | NAQO 中大空品站 | SFTP | `sftp://140.115.80.244/NAQO` | 逐時接收 |
| 7 | WindLidar 風廓線光達 | SFTP | `sftp://140.115.80.244/WindLidar` | 逐時接收 |
| 8 | MPL 微脈衝光達 | SFTP | `sftp://140.115.80.244/MPL` | 逐時接收 |
| 2 | 無人機資料系統 | UAV | `http://uav.internal/api/upload` | 手動 |
| 3 | 環境部空品監測網 | EPA | `https://data.epa.gov.tw/api/v2/aqx_p_432` | 每 60 分 |
| 4 | 中央氣象署觀測 | CWA | `https://opendata.cwa.gov.tw/api/v1/rest/datastore` | 每 30 分 |
| 5 | IoT 微型感測器 | IoT | `https://iot.taoyuan.gov.tw/api` | 每 15 分 |

## 資料來源類型

| `type` | 說明 | 傳輸方式 |
| ---- | ---- | ---- |
| `SFTP` | SFTP 自動推送 | `sftp` |
| `UAV` | 無人機手動上傳 | `manual` |
| `EPA` | 環境部空品監測網 | `api` |
| `CWA` | 中央氣象署觀測 | `api` |
| `IoT` | IoT 微型感測器 | `api` |
| `WindProfiler` | 風廓線儀 | `api` |

## 卡片顯示內容

每張資料來源卡片顯示：

- 名稱
- 類型標籤
- API / SFTP 端點
- 同步頻率
- 最後同步時間
- 連線狀態
- 啟用狀態

SFTP 來源的同步頻率固定顯示為「逐時接收（SFTP）」。

## 操作按鈕

| 按鈕 | 適用類型 | 說明 |
| ---- | ---- | ---- |
| 瀏覽資料庫 | UAV、SFTP | 導向 `/source-db/:category` |
| 傳輸記錄 | SFTP | 開啟 SFTP 傳輸記錄 Modal，真實模式呼叫 `/api/sftp/logs` |
| 測試連線 | 非 SFTP | 前端模擬測試，2 秒後恢復 |
| 編輯設定 | 全部 | 開啟資料來源設定 Modal |
| 同步日誌 | 全部 | 開啟 mock 同步日誌 Modal |

SFTP 來源的資料庫路由對應：

| id | route category |
| -- | ---- |
| 6 | `naqo` |
| 7 | `windlidar` |
| 8 | `mpl` |

## 新增 / 編輯資料來源

點擊 `+ 新增資料來源` 或卡片中的 `編輯設定` 會開啟表單 Modal。

| 欄位 | 必填 | 驗證規則 |
| ---- | ---- | ---- |
| 名稱 | 是 | 不可空白 |
| 資料類型 | 是 | 從 `EPA/CWA/IoT/UAV/WindProfiler/SFTP` 選擇 |
| 同步頻率 | 否 | 數字，`0` 代表手動，上限 1440 分鐘 |
| API 端點 | 是 | 必須為 `http` 或 `https` URL |

目前新增與編輯只更新前端 `AppDataContext` 狀態。

## `SourceRecord` 型別

```ts
interface SourceRecord {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  frequency: number;
  active: boolean;
  lastSync: string;
  status: 'success' | 'error' | 'pending';
  transferMode?: 'sftp' | 'api' | 'manual';
}
```

---

# 二、傳輸異常事件子頁

## 功能定位

此子頁用於記錄 SFTP 傳輸異常、檢視事件列表、查看事件詳情，並將事件資料轉換為統計圖表與報告摘要。

目前資料來源為 `IncidentLogSection.tsx` 內的 `MOCK_INCIDENTS`。新增、編輯、標記已恢復都會更新前端狀態，並同步反映在分析區塊。

## 異常事件資料來源

支援的 SFTP 來源：

| value | 說明 |
| ---- | ---- |
| `NAQO` | NAQO |
| `WindLidar` | WindLidar |
| `MPL` | MPL |

支援的異常類型：

| value | 顯示文字 |
| ---- | ---- |
| `network_disconnect` | 網路連線中斷 |
| `computer_restart` | 電腦重新啟動 |
| `software_update` | 軟體更新 / 重新安裝 |
| `sftp_service_error` | SFTP 服務異常 |
| `power_outage` | 站點斷電 |
| `instrument_maintenance` | 儀器維護 / 校正 |
| `hardware_failure` | 硬體故障 |
| `manual_stop` | 人為暫停傳輸 |
| `other` | 其他（請於備註說明） |

## `SftpIncident` 型別

```ts
interface SftpIncident {
  id: number;
  source: 'NAQO' | 'WindLidar' | 'MPL';
  incident_type: IncidentTypeValue;
  started_at: string;
  ended_at: string | null;
  affected_range: string;
  note: string;
  reporter_name: string;
  created_at: string;
}
```

`ended_at === null` 代表事件尚未恢復，狀態顯示為「異常中」。

## 新增 / 編輯事件

點擊 `新增事件` 會開啟 `IncidentFormModal`。

| 欄位 | 必填 | 說明 / 驗證 |
| ---- | ---- | ---- |
| 資料來源 | 是 | `NAQO` / `WindLidar` / `MPL` |
| 異常類型 | 是 | 從異常類型選項選擇 |
| 異常開始時間 | 是 | 使用自訂日期時間選擇器 |
| 異常結束時間 | 否 | 留空代表尚未恢復 |
| 受影響資料時間範圍說明 | 否 | 例如 `5/10 14:00~15:00 整點資料未傳送` |
| 備註 | 否 | 補充說明 |

時間防呆：

- `異常開始時間 <= 異常結束時間` 才合法。
- 結束時間可留空。
- 若開始時間晚於結束時間，表單顯示錯誤並阻止送出。

新增事件時：

- `id` 由目前最大 id + 1 產生。
- `reporter_name` 暫設為 `目前使用者`。
- `created_at` 使用目前時間。

## 事件列表

事件列表支援：

- 依資料來源篩選
- 依異常類型篩選
- 依狀態篩選：異常中 / 已復原
- 分頁，每頁 10 筆
- 查看詳情

表格欄位：

| 欄位 | 說明 |
| ---- | ---- |
| 來源 | SFTP 來源 |
| 異常類型 | 類型中文標籤 |
| 異常開始 | `started_at` 格式化 |
| 異常結束 | `ended_at`，若為 `null` 顯示「尚未恢復」 |
| 持續時間 | 已復原事件以開始與結束時間計算 |
| 狀態 | 異常中 / 已復原 |
| 記錄者 | `reporter_name` |
| 操作 | 開啟詳情 Modal |

## 事件詳情

`IncidentDetailModal` 顯示：

- 資料來源
- 狀態
- 異常類型
- 異常開始 / 結束
- 持續時間
- 影響資料範圍
- 備註
- 記錄者 / 記錄時間

操作：

| 按鈕 | 說明 |
| ---- | ---- |
| 標記已恢復 | 僅異常中事件顯示，將 `ended_at` 更新為目前時間 |
| 編輯 | 開啟 `IncidentFormModal` 編輯該事件 |
| 關閉 | 關閉詳情 |

## 異常事件分析區塊

`IncidentAnalyticsSection` 位於事件列表上方，用於將異常事件資料轉成可報告的統計資訊與圖表。

### 篩選條件

| 條件 | 說明 |
| ---- | ---- |
| 時間區段 | 近 30 天、近 7 天、本月、全部時間、自訂區間 |
| 資料來源 | 全部 / NAQO / WindLidar / MPL |
| 異常類型 | 全部 / 任一異常類型 |
| 狀態 | 全部 / 異常中 / 已復原 |
| 統計單位 | 每日 / 每週 / 每月 |
| 趨勢指標 | 事件件數 / 中斷時間 |

自訂區間使用與新增事件一致風格的日期選擇器：

- Calendar icon
- 彈出式月曆
- 月份切換
- 今日高亮
- 選取日期高亮
- 欄位內 `X` 清除
- `設為今天`

自訂區間防呆：

- 開始日期必須小於或等於結束日期。
- 若開始日期大於結束日期，顯示錯誤，圖表進入空狀態，摘要顯示錯誤提示。

### KPI

| KPI | 計算邏輯 |
| ---- | ---- |
| 總事件 | 目前分析篩選後事件數 |
| 異常中 | `ended_at === null` 的事件數 |
| 累計中斷 | 已復原用 `ended_at - started_at`，異常中用目前時間估算 |
| 平均復原 | 只計算已復原事件 |

### 圖表

| 圖表 | 呈現內容 | 補充 |
| ---- | ---- | ---- |
| 異常趨勢（事件件數 / 中斷時間） | 依統計單位聚合事件件數或中斷分鐘數 | 每週以週一作為週起始 |
| 異常類型占比 | 依異常類型統計事件件數占比 | 中心顯示總事件數 |
| 資料來源事件排行 | 依資料來源統計事件件數排行 | 橫向長條圖 |

目前圖表使用 SVG / CSS 實作，未引入第三方圖表套件。

### 報告摘要

報告摘要為規則式文字產生，不使用 AI。摘要會依目前分析篩選條件更新，並將關鍵數值加粗。

摘要內容包含：

- 時間區段
- 總事件數
- 異常中 / 已復原件數
- 累計中斷時間
- 平均復原時間
- 主要異常類型與占比
- 主要資料來源與占比
- 若有異常中事件，提示優先追蹤

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

-- SFTP 傳輸記錄
SELECT id, source, file_name, file_size, data_time, status, error_msg, received_at
FROM sftp_transfer_logs
WHERE source = 'NAQO'
ORDER BY received_at DESC
LIMIT 50;
```
