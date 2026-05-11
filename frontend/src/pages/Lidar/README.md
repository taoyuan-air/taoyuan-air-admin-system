# WindLidar 互動視覺化頁面

風光達（WindLidar）L1 NetCDF 資料互動式瀏覽頁面。讓使用者在瀏覽器中選取站點與日期，以四個同步可縮放的 Plotly 圖表，即時呈現 NRB 訊號強度、退偏振比、儀器溫度、雷射能量與背景值。

> 路由：`/lidar`
> 側邊欄：**風光達分析**（`Layers` 圖示）
> 權限：`system_admin`、`data_manager`、`readonly`

---

## 目錄

1. [頁面功能說明](#1-頁面功能說明)
2. [系統架構總覽](#2-系統架構總覽)
3. [資料來源說明](#3-資料來源說明)
4. [時間軸轉換邏輯](#4-時間軸轉換邏輯)
5. [設計流程（資料流）](#5-設計流程資料流)
6. [操作流程](#6-操作流程)
7. [前端元件說明](#7-前端元件說明)
8. [後端服務說明](#8-後端服務說明)
9. [API 參考](#9-api-參考)
10. [圖表面板細節](#10-圖表面板細節)
11. [技術選型與注意事項](#11-技術選型與注意事項)
12. [環境需求與安裝](#12-環境需求與安裝)
13. [檔案結構](#13-檔案結構)

---

## 1. 頁面功能說明

### 第一版（目前已實作）

| 功能               | 說明                                                                |
| ------------------ | ------------------------------------------------------------------- |
| 站點選擇           | 從 API 動態載入可用站點（目前為 `Guanyin`）                         |
| 日期選擇           | 自訂日曆元件，可切換月份；預設為最新有資料日期                      |
| 高度上限           | 0.5 / 1 / 2 / 5 km 四段，預設 1 km（約 33 個高度層）               |
| 面板切換           | NRB、Depol、Temperature、Background/Energy 四個面板可個別顯示或隱藏 |
| 四面板互動圖表     | 垂直堆疊，共用時間軸；支援 hover 查值、zoom、pan、reset             |
| 四面板 x 軸同步    | 任一面板縮放時間軸，其他三個同步跟進                                |
| Loading 骨架畫面   | 資料載入期間顯示動態佔位區塊                                        |
| 錯誤與空狀態       | API 失敗顯示紅色提示；無資料顯示引導文字                            |
| 底部資訊列         | 顯示來源 `.nc` 檔名、時間步數、高度層數、實際時間範圍、警告訊息     |

### 第二版（待實作）

- 多日期區間查詢
- 色階範圍手動調整
- 匯出目前視圖為 PNG 或 CSV
- 自訂 depol 遮罩條件
- 與 SFTP 資料來源頁直接串接

---

## 2. 系統架構總覽

```
┌──────────────────────────────────────────────────────────────────┐
│                         後台管理系統                               │
│                                                                  │
│  ┌──────────────┐  SFTP 自動下載   ┌─────────────────────────┐   │
│  │  WindLidar   │ ──────────────→  │  backend/uploads/sftp/  │   │
│  │   儀器端     │                  │  lidar/                 │   │
│  └──────────────┘                  │  Guanyin_20260411.nc    │   │
│                                    │  Guanyin_20260412.nc    │   │
│                                    └──────────┬──────────────┘   │
│                                               │ 讀取             │
│                                    ┌──────────▼──────────────┐   │
│                                    │  lidar_to_json.py       │   │
│                                    │  (Python 3 + netCDF4)   │   │
│                                    │  • 解析 NetCDF4 格式    │   │
│                                    │  • UTC → 台灣時間轉換   │   │
│                                    │  • 計算 Depol Ratio     │   │
│                                    │  • 預計算 log10 值      │   │
│                                    │  • 遮罩無效值           │   │
│                                    └──────────┬──────────────┘   │
│                                               │ JSON (stdout)    │
│                                    ┌──────────▼──────────────┐   │
│                                    │  lidarService.ts        │   │
│                                    │  (Node.js child_process │   │
│                                    │   spawn，安全參數傳遞)   │   │
│                                    └──────────┬──────────────┘   │
│                                               │                  │
│                                    ┌──────────▼──────────────┐   │
│                                    │  GET /api/lidar/*       │   │
│                                    │  (Express + JWT 驗證)   │   │
│                                    └──────────┬──────────────┘   │
│                                               │ HTTP JSON        │
│                                    ┌──────────▼──────────────┐   │
│                                    │  /lidar 頁面            │   │
│                                    │  (React + Plotly.js)    │   │
│                                    │  四個垂直面板           │   │
│                                    └─────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 資料來源說明

### 3.1 NetCDF 檔案格式

風光達 L1 資料以 **NetCDF4（HDF5 底層）** 格式儲存。
目錄：`backend/uploads/sftp/lidar/`
命名規則：`{Station}_{YYYYMMDD}.nc`（UTC 日期）

| 變數名稱      | 維度（Guanyin）  | 說明                                               |
| ------------- | ---------------- | -------------------------------------------------- |
| `Time`        | `2880`           | MATLAB 風格年積日（UTC），每 30 秒一筆              |
| `range`       | `400`            | 高度層（km），步距約 0.03 km，起始 0.015           |
| `NRB_Co`      | `2880 × 400`     | 共偏振 NRB 訊號強度                                |
| `NRB_Cr`      | `2880 × 400`     | 交叉偏振 NRB 訊號強度（用於計算退偏振比）          |
| `Energy`      | `2880`           | 雷射能量（任意單位）                               |
| `Las_Temp`    | `2880`           | 雷射溫度（°C）                                     |
| `Det_Temp`    | `2880`           | 偵測器溫度（°C）                                   |
| `Box_Temp`    | `2880`           | 箱體溫度（°C）                                     |
| `Backgrd_Avg` | `2880`           | 背景訊號平均值                                     |

### 3.2 高度層數量

限高 1 km 時，Guanyin 站取出約 33 個高度層（`range <= 1.0`）。

---

## 4. 時間軸轉換邏輯

### 4.1 MATLAB 年積日格式

原始 `Time` 為 MATLAB 風格的 fractional day-of-year（UTC）：

```
整數部分 = 該年的第幾天（1-indexed）
小數部分 = 當天時間比例（0.0 = 00:00:00，0.5 = 12:00:00）
```

Python 轉換公式（`lidar_to_json.py`）：

```python
base = datetime(year, 1, 1)
utc_dt = base + timedelta(days=matlab_val - 1)
taiwan_dt = utc_dt + timedelta(hours=8)
```

### 4.2 時區跨日問題

一個 UTC 日期的原始資料在台灣本地時間橫跨兩天：

```
UTC 日期 04/11：UTC 00:00 → 23:59  =  台灣 04/11 08:00 → 04/12 07:59
UTC 日期 04/12：UTC 00:00 → 23:59  =  台灣 04/12 08:00 → 04/13 07:59

查詢台灣 04/12 完整資料（00:00–23:59）需合併：
  ┌─────────────────────────────────────────────────────┐
  │  台灣 04/12 00:00 ──────────────────── 04/12 23:59  │
  │   └─來自 Guanyin_20260411.nc 後段─┘└─來自 _20260412.nc 前段┘ │
  └─────────────────────────────────────────────────────┘
```

### 4.3 前端查詢參數轉換

`lidarService.ts` 將使用者選擇的台灣本地日期轉為 UTC 傳給後端：

```typescript
// 台灣 YYYY-MM-DD 00:00:00 → UTC
startUtc = Date.UTC(year, month-1, day, 0, 0, 0) - 8*3600*1000
// 台灣 YYYY-MM-DD 23:59:59 → UTC
endUtc   = Date.UTC(year, month-1, day, 23, 59, 59) - 8*3600*1000
```

後端再依此 UTC 區間決定需要讀取哪些 `.nc` 檔（前一個 UTC 日 + 當日）。

---

## 5. 設計流程（資料流）

```
使用者輸入查詢參數
（站點、台灣日期、高度上限、面板）
           │
           ▼
  lidarService.ts（前端）
  日期轉換：台灣日期 → UTC start/end
           │
           ▼ GET /api/lidar/plot-data
  lidar.ts（後端路由）
  驗證：station 格式、ISO-8601、heightMax 範圍、panels enum
           │
           ▼
  lidarService.ts（後端服務）
  推算需要讀取的 UTC 日期清單
  找出對應的 .nc 檔案路徑
           │
           ▼ child_process.spawn（安全參數陣列）
  lidar_to_json.py（Python 3）
  ┌───────────────────────────────────────┐
  │ 1. netCDF4.Dataset 開啟 .nc 檔        │
  │    (Windows 非 ASCII 路徑 → tempfile) │
  │ 2. 套用高度遮罩（range <= height_max）│
  │ 3. Time → UTC datetime → 台灣時間     │
  │ 4. 套用時間範圍篩選                   │
  │ 5. 計算 Depol Ratio：                 │
  │    NRB_Cr / (NRB_Co + NRB_Cr)        │
  │    分母 ≤ 1e-11 → None（遮罩）       │
  │ 6. 預計算 log10(depol)、log10(Backgrd)│
  │ 7. 轉置 z 矩陣：[time][h] → [h][time]│
  │    （Plotly heatmap 所需格式）        │
  │ 8. 輸出 JSON 到 stdout               │
  └───────────────────────────────────────┘
           │ JSON
           ▼
  後端解析 stdout → res.json()
           │ HTTP 200
           ▼
  前端 setPlotData(data)
           │
           ▼
  LidarPanel × 4（Plotly.newPlot / Plotly.react）
  四面板垂直渲染，共用 xRange 狀態同步縮放
```

---

## 6. 操作流程

```
登入後台管理系統
       │
       ▼
  側邊欄點選「風光達分析」→ /lidar
       │
       ▼ （React.lazy 延遲載入，Plotly 此時才開始下載）
┌──────────────────────────────────────────────┐
│  頁面載入：fetchLidarStations()              │
│  → 取得可用站點清單與各站點有資料的日期列表  │
│  → 預設填入第一個站點、最新可用日期          │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
         顯示控制列（空圖表提示）
                        │
         使用者調整查詢條件：
         ┌──────────────┬──────────────┐
         │ 站點選擇     │ 日期日曆選取  │
         │ 高度上限     │ 面板勾選     │
         └──────────────┴──────────────┘
                        │
                        ▼
               點選「套用」按鈕
                        │
            ┌───────────┴──────────────┐
            │ loading = true           │
            │ 顯示 pulse 骨架動畫      │
            └───────────┬──────────────┘
                        │
              呼叫 GET /api/lidar/plot-data
                        │
              ┌─────────┴──────────┐
              │ 成功               │ 失敗
              ▼                    ▼
       setPlotData(data)    setError(message)
       loading = false      loading = false
              │                    │
              ▼                    ▼
     渲染四個 Plotly 面板    紅色錯誤提示區塊
     + 底部資訊列
              │
              ▼
     ┌─────────────────────────────────┐
     │  互動操作                       │
     │                                 │
     │  滑鼠游標懸停                   │
     │  → tooltip 顯示時間/高度/數值   │
     │                                 │
     │  滑鼠拖曳框選                   │
     │  → 四面板 x 軸同步縮放          │
     │  （plotly_relayout → setXRange  │
     │   → 重繪所有 LidarPanel）       │
     │                                 │
     │  雙擊圖表                       │
     │  → xaxis.autorange → xRange=null│
     │  → 四面板同步還原               │
     │                                 │
     │  修改控制列後再按套用           │
     │  → 重新呼叫 API                 │
     └─────────────────────────────────┘
```

---

## 7. 前端元件說明

### 7.1 元件樹

```
App.tsx
└── React.lazy(() => import('./pages/Lidar'))   ← 延遲載入，不進主 bundle
    └── LidarPage (index.tsx)
        ├── Header                               ← 標題列（共用）
        ├── LidarControls                        ← 查詢控制列
        │   ├── react-select（站點、高度上限）
        │   └── LidarDateField（自訂日曆元件）
        ├── loading 骨架 / 錯誤提示 / 空狀態
        └── LidarPanel × 4（每個面板各自獨立）
            └── <div ref={divRef}>               ← Plotly.newPlot 直接掛載
```

### 7.2 `LidarPage` (index.tsx)

| 狀態              | 型別                        | 說明                                  |
| ----------------- | --------------------------- | ------------------------------------- |
| `stations`        | `LidarStation[]`            | 從 API 載入的站點清單                 |
| `station`         | `string`                    | 目前選擇的站點名稱                    |
| `date`            | `string` (YYYY-MM-DD)       | 目前選擇的台灣本地日期                |
| `heightMax`       | `number`                    | 高度上限（km）                        |
| `panels`          | `PanelKey[]`                | 使用者勾選要顯示的面板                |
| `plotData`        | `LidarPlotData \| null`     | 目前顯示中的資料                      |
| `loading`         | `boolean`                   | API 呼叫進行中                        |
| `error`           | `string \| null`            | API 錯誤訊息                          |
| `xRange`          | `[string, string] \| null`  | 四面板共用 x 軸範圍（zoom 同步狀態） |
| `syncLock`        | `useRef<boolean>`           | 防止 relayout 事件循環廣播的 lock     |

**x 軸同步機制：**

```
LidarPanel 觸發 plotly_relayout
→ handleRelayout(event)
→ 擷取 xaxis.range[0] / xaxis.range[1]
→ setXRange([start, end])
→ 所有 LidarPanel 的 render useCallback 重新執行
→ Plotly.react() 帶入新的 xRange 重繪
```

使用 `syncLock`（`useRef`）搭配 `requestAnimationFrame` 防止 update → relayout → update 的無限迴圈。

### 7.3 `LidarControls` (LidarControls.tsx)

使用者可在此調整：
- **站點**：`react-select` 下拉，選項來自 `LidarStationsResponse.stations`
- **日期**：自訂 `LidarDateField` 元件，內建月曆（含「今天」快捷鍵、前後月切換）
- **高度上限**：`react-select`，固定選項 0.5 / 1 / 2 / 5 km
- **面板勾選**：四個 checkbox，樣式為 toggle 按鈕
- **套用按鈕**：觸發 `loadPlotData`，loading 期間禁用並旋轉圖示

### 7.4 `LidarPanel` (LidarPanel.tsx)

每個面板是一個獨立的 React 元件，封裝 Plotly.js 原生 API：

```typescript
// 使用原生 Plotly API（不依賴 react-plotly.js）
useEffect([mount]) → Plotly.newPlot(div, traces, layout, config)
                   → div.on('plotly_relayout', onRelayout)
                   → cleanup: Plotly.purge(div)

useEffect([render]) → Plotly.react(div, traces, layout, config)
                    （當 data / xRange 變化時更新）
```

**Plotly 以 dynamic import 延遲載入：**

```typescript
let plotlyCache: PlotlyModule | null = null;
async function getPlotly() {
  if (!plotlyCache) plotlyCache = await import('plotly.js-dist-min');
  return plotlyCache;
}
```

確保 Plotly bundle（~3 MB）只在進入 `/lidar` 路由後才下載，且全生命週期只載入一次。

### 7.5 型別定義 (`types/lidar.ts`)

```typescript
PanelKey = 'nrb' | 'depol' | 'temperature' | 'backgroundEnergy'

LidarQueryParams  → 前端送出的查詢條件
LidarPlotData     → API 回傳的完整資料
LidarPanels       → 四個面板的資料集合（皆為 optional）
NrbPanel          → z[height][time], colorMin/Max, unit
DepolPanel        → z[height][time]（log10 預計算）, colorMin/Max
TemperaturePanel  → laser/detector/box 時間序列
BackgroundEnergyPanel → background_log10, energy 時間序列
```

### 7.6 前端 API 服務 (`services/lidarService.ts`)

```typescript
fetchLidarStations(token)
  → GET /api/lidar/stations
  → 回傳 { stations: [{ name, dates }] }

fetchLidarPlotData(token, params)
  → 台灣日期 → UTC start/end 轉換
  → GET /api/lidar/plot-data?station=...&start=...&end=...&heightMax=...&panels=...
  → 回傳 LidarPlotData
```

---

## 8. 後端服務說明

### 8.1 路由 (`backend/src/routes/lidar.ts`)

所有路由均套用 `authenticateJWT` middleware，需要有效 Bearer Token。

### 8.2 後端服務 (`backend/src/services/lidarService.ts`)

**`scanStations()`**

掃描 `LIDAR_DIR`（預設 `uploads/sftp/lidar`），解析 `{Station}_{YYYYMMDD}.nc` 格式的檔名，回傳各站點的台灣本地可用日期列表。

**`runLidarParser(params)`**

1. 白名單驗證所有參數（station 格式、ISO-8601、heightMax 範圍、panels enum）
2. 以 `child_process.spawn` 啟動 Python script（傳遞安全參數陣列，不拼接 shell command）
3. 收集 stdout 並 JSON.parse
4. 錯誤時將 stderr 作為訊息 reject

### 8.3 Python 解析器 (`backend/scripts/lidar_to_json.py`)

| 步驟 | 說明 |
|------|------|
| 1. 找檔案 | 依 station + UTC 日期範圍找到對應 .nc 路徑 |
| 2. tempfile 繞路 | Windows 環境下 netCDF4 無法開啟含非 ASCII 字元的路徑，將 .nc 複製到 tempfile 後再開啟 |
| 3. 高度遮罩 | `raw_range <= height_max` 篩選高度層 |
| 4. 時間轉換 | MATLAB 年積日 → UTC datetime → +8h → 台灣 ISO 字串 |
| 5. 時間篩選 | 保留落在 [start_utc, end_utc] 區間的時間步 |
| 6. Depol 計算 | `NRB_Cr / (NRB_Co + NRB_Cr)`，分母 ≤ 1e-11 設為 None |
| 7. log10 預計算 | depol ratio 與 Backgrd_Avg 各自取 log10，None/負值保持 None |
| 8. 轉置 | nrb_z / depol_z 從 `[time][height]` 轉為 `[height][time]`（Plotly heatmap 格式） |
| 9. 輸出 | JSON 寫入 stdout，ensure_ascii=False 保留非 ASCII 字元 |

---

## 9. API 參考

### `GET /api/lidar/stations`

回傳目錄掃描結果。

**Response：**
```json
{
  "stations": [
    {
      "name": "Guanyin",
      "dates": ["2026-04-11", "2026-04-12"]
    }
  ]
}
```

---

### `GET /api/lidar/plot-data`

**Query 參數：**

| 參數        | 必填 | 說明                                        | 範例                        |
| ----------- | ---- | ------------------------------------------- | --------------------------- |
| `station`   | ✓    | 站點名稱（英數字、底線、破折號，最多 64 字）| `Guanyin`                   |
| `start`     | ✓    | UTC 起始時間（ISO-8601）                    | `2026-04-11T16:00:00.000Z`  |
| `end`       | ✓    | UTC 結束時間（ISO-8601）                    | `2026-04-12T15:59:59.000Z`  |
| `heightMax` |      | 高度上限（km），預設 `1`，允許 0.1–15      | `1`                         |
| `panels`    |      | 逗號分隔，預設全選                          | `nrb,depol,temperature,backgroundEnergy` |

**Response 結構：**
```json
{
  "station": "Guanyin",
  "timezone": "Asia/Taipei",
  "rangeKm": [0.015, 0.045, "..."],
  "times": ["2026-04-12T00:00:00+08:00", "..."],
  "panels": {
    "nrb": {
      "z": [[0.12, 0.18, "..."], "..."],
      "unit": "MHz Km^2 uJ^-1",
      "colorMin": 0,
      "colorMax": 2
    },
    "depol": {
      "z": [[-3.0, -2.5, "..."], "..."],
      "scale": "log10_precomputed",
      "unit": "ratio",
      "colorMin": -4,
      "colorMax": -1
    },
    "temperature": {
      "laser": [26.1, "..."],
      "detector": [24.2, "..."],
      "box": [25.8, "..."],
      "unit": "C"
    },
    "backgroundEnergy": {
      "background_log10": [-3.0, "..."],
      "energy": [17.3, "..."]
    }
  },
  "sourceFiles": ["Guanyin_20260411.nc", "Guanyin_20260412.nc"],
  "warnings": []
}
```

> **注意**：`depol.z` 與 `backgroundEnergy.background_log10` 為預先計算的 log10 值。前端以線性軸繪製，再用手動 `ticktext` 標籤還原原始數值，hover tooltip 另以 `10^z` 計算後顯示。

---

### `GET /api/lidar/health`

回傳 Python / netCDF4 環境狀態，供部署診斷用。

```json
{
  "netcdf4": "ok",
  "lidarDir": "uploads/sftp/lidar"
}
```

---

## 10. 圖表面板細節

### 面板 1：NRB Co-polar（heatmap）

| 設定     | 值                                 |
| -------- | ---------------------------------- |
| 圖表類型 | Plotly `heatmap`                   |
| x        | 台灣本地時間序列                   |
| y        | 高度（km）                         |
| z        | `NRB_Co`，`[height][time]`         |
| 色階     | Jet-like（藍→青→黃→紅）            |
| zmin     | 0                                  |
| zmax     | 2（Guanyin 站預設）                |
| hover    | 時間、高度（.3f km）、NRB（.4f）   |

### 面板 2：Depolarization Ratio（heatmap）

| 設定     | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 圖表類型 | Plotly `heatmap`                                           |
| z        | `log10(NRB_Cr/(NRB_Co+NRB_Cr))`（Python 預計算）          |
| 色階     | Jet-like，zmin=−4（=0.0001），zmax=−1（=0.1）             |
| colorbar | 刻度標籤手動設為 `0.0001 / 0.001 / 0.01 / 0.1`            |
| hover    | 以 `10^z` 還原 Depol Ratio 原始值                         |

### 面板 3：Instrument Temperature（line chart）

| 線條     | 顏色            | 說明               |
| -------- | --------------- | ------------------ |
| Laser    | `#16a34a`（綠） | 雷射溫度（°C）     |
| Detector | `#2563eb`（藍） | 偵測器溫度（°C）   |
| Box      | `#dc2626`（紅） | 箱體溫度（°C）     |
| 26°C Ref | `#000`（虛線）  | 正常運作參考溫度   |

y 軸刻度固定：18 / 22 / 26 / 30 / 34 °C

### 面板 4：Background / Laser Energy（雙軸 line chart）

| 線條       | 軸    | 顏色            | 說明                                    |
| ---------- | ----- | --------------- | --------------------------------------- |
| Background | 左軸  | `#2563eb`（藍） | `log10(Backgrd_Avg)`，手動刻度標籤      |
| Bg=10 Ref  | 左軸  | `#dc2626`（虛線）| `log10(10)=1`，環境光干擾警戒線        |
| Energy     | 右軸  | `#16a34a`（綠） | 雷射能量（線性軸）                      |

左軸刻度標籤手動對應：`0.001 / 0.01 / 0.1 / 1 / 10 / 100`

---

## 11. 技術選型與注意事項

### 11.1 Plotly 整合方式

本頁面使用 **`plotly.js-dist-min`** 搭配原生 API（`Plotly.newPlot` / `Plotly.react` / `Plotly.purge`）。

**不使用 `react-plotly.js` 的原因：**

`react-plotly.js` v2.x 在以下組合下有相容性問題：
- `plotly.js` v3.x（破壞性 API 更新）
- Vite 的 CJS → ESM 轉換
- React 19

症狀：點選「套用」後整頁空白（React tree 在 Plot 元件渲染時崩潰，無 Error Boundary 捕獲）。

**解法：** 直接以原生 API 操作 DOM，搭配 `useRef` + `useEffect` 管理生命週期。

### 11.2 Lazy Loading

```typescript
// App.tsx
const LidarPage = lazy(() => import('./pages/Lidar'));
```

- Plotly bundle（~3 MB）**不進主 bundle**，只在訪問 `/lidar` 時才下載
- 即使 Lidar 模組內部發生錯誤，也不影響其他頁面（`Suspense` fallback）

### 11.3 Windows 中文路徑問題

`netCDF4.Dataset` 在 Windows 環境無法開啟含非 ASCII 字元（如中文目錄名稱）的路徑。

**解法**（`lidar_to_json.py`）：
```python
# 複製到 ASCII 路徑的 tempfile 後開啟
with tempfile.NamedTemporaryFile(suffix='.nc', delete=False) as tmp:
    shutil.copy2(original_path, tmp.name)
# 使用 tmp.name 開啟，finally 塊清理 tempfile
```

### 11.4 安全性

- `station` 參數通過正規表達式白名單 `/^[A-Za-z0-9_-]{1,64}$/` 驗證，防止路徑注入
- Python 以 `child_process.spawn` 傳遞參數陣列啟動，不使用 shell 字串拼接
- `heightMax` 限制在 0.1–15 km
- `panels` 枚舉驗證

---

## 12. 環境需求與安裝

### Python 環境

```bash
pip install netCDF4 numpy
```

驗證：
```bash
python -c "from netCDF4 import Dataset; print('ok')"
```

> **注意**：`.nc` 檔案為 NetCDF4（HDF5 底層）格式，`scipy.io.netcdf_file` 無法讀取，必須使用 `netCDF4` 套件。

### 後端環境變數（可選）

| 變數         | 預設值（Windows/Linux）                     | 說明               |
| ------------ | ------------------------------------------- | ------------------ |
| `LIDAR_DIR`  | `uploads/sftp/lidar`                        | .nc 檔目錄         |
| `PYTHON_CMD` | `python`（Windows）/ `python3`（Linux/Mac） | Python 執行指令    |

### 前端依賴（已安裝）

```json
"plotly.js-dist-min": "^3.5.1",
"react-plotly.js": "^2.6.0",
"@types/react-plotly.js": "^2.6.4"
```

> `react-plotly.js` 目前僅用於 TypeScript 型別，實際渲染不走其 React 元件。

---

## 13. 檔案結構

```
frontend/src/pages/Lidar/
├── README.md                    ← 本文件
├── index.tsx                    ← 主頁面（狀態管理、查詢邏輯、面板 zoom 同步）
├── LidarControls.tsx            ← 查詢控制列（站點/日期/高度/面板勾選/套用）
└── LidarPanel.tsx               ← 單一圖表面板（Plotly 原生 API 封裝）

frontend/src/
├── services/lidarService.ts     ← 前端 API 呼叫（日期轉換、fetch）
├── types/lidar.ts               ← 所有 TypeScript 型別定義
└── types/plotly-dist-min.d.ts   ← plotly.js-dist-min 模組型別宣告

backend/scripts/
└── lidar_to_json.py             ← Python 3 NetCDF 解析器（輸出 JSON 到 stdout）

backend/src/
├── routes/lidar.ts              ← Express 路由（/api/lidar/*）
└── services/lidarService.ts     ← 目錄掃描、參數驗證、spawn Python

backend/uploads/sftp/lidar/
├── Guanyin_20260411.nc          ← 測試資料（UTC 2026-04-11）
└── Guanyin_20260412.nc          ← 測試資料（UTC 2026-04-12）
```
