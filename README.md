# taoyuan-air-admin

taoyuan-air 後台管理系統。

本專案包含：

- `frontend/`: React + Vite 前端（預設 `http://localhost:5173`）
- `backend/`: Express + PostgreSQL 後端 API（預設 `http://localhost:3001`）

## 專案架構

```text
taoyuan-air-admin/
├─ frontend/                 # React 前端
│  ├─ src/
│  └─ vite.config.ts
├─ backend/                  # Express 後端
│  ├─ src/
│  ├─ migrations/
│  └─ .env
└─ README.md
```

## 功能模組

| 模組         | 說明                                               |
| ------------ | -------------------------------------------------- |
| 儀表板       | 系統狀態總覽、資料來源狀態、最近上傳記錄、資源使用 |
| 資料上傳     | LiDAR / UAV 檔案上傳、進度追蹤（SSE）、歷史記錄    |
| 資料來源管理 | API 設定、同步頻率、連線測試、同步日誌             |
| 測站管理     | 測站列表、資料品質評分、設備校正記錄               |
| 使用者管理   | 帳號管理、角色權限、上傳配額                       |

## 環境需求

- Node.js 18+
- npm
- Docker Desktop（如果要跑 PostgreSQL 容器）

## 後端環境變數

請確認 `backend/.env` 至少包含以下內容：

```env
PORT=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
UPLOAD_DIR=
```

## 一次性初始化

### 1. 安裝依賴

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. 準備資料庫

如果你是使用前台專案 `taoyuan-air` 提供 DB（推薦）：

```bash
cd ../taoyuan-air
docker-compose up -d
```

### 3. 執行 migration（只需一次）

```bash
cd ../taoyuan-air-admin/backend
npm run migrate
```

### 4. 建立初始管理員帳號（只需一次）

```bash
npm run seed
```

執行後會建立一個 `system_admin` 帳號，並輸出臨時密碼。**首次登入後必須修改密碼。**

## 日常啟動（完整前後端測試）

請開三個終端機，依序執行。

### 終端機 A：啟動 DB（Docker）

```bash
cd taoyuan-air
docker-compose up -d
```

### 終端機 B：啟動 backend

```bash
cd taoyuan-air-admin/backend
npm run dev
```

成功訊息：

```text
Backend running on http://localhost:3001
```

健康檢查：

```bash
curl http://localhost:3001/health
```

應回傳：

```json
{ "status": "ok" }
```

### 終端機 C：啟動 frontend

```bash
cd taoyuan-air-admin/frontend
npm run dev
```

開啟：

```text
http://localhost:5173
```

## 帳號設定

預設帳號（由 `npm run seed` 建立）：

| 帳號  | 角色名稱   | 備註                   |
| ----- | ---------- | ---------------------- |
| admin | 系統管理員 | 首次登入需修改臨時密碼 |

角色說明：

| 角色名稱   | 權限                       |
| ---------- | -------------------------- |
| 系統管理員 | 全功能，含使用者管理       |
| 資料管理員 | 可上傳資料，不可管理使用者 |
| 唯讀使用者 | 僅可瀏覽，不可上傳或管理   |

## Demo 模式與真實 API 模式切換

前端支援雙模式：

- `VITE_DEMO_MODE=true`：展示模式（不打後端 API，適合 Vercel 只看畫面）
- `VITE_DEMO_MODE=false`：實作模式（連真實後端 API）

### 本地開發（真實 API）

在 `frontend/.env` 設定：

```env
VITE_DEMO_MODE=false
# 本地通常可留空，使用 Vite proxy 轉到 localhost:3001
VITE_API_BASE_URL=
```

### Vercel Demo 展示

在 Vercel Project Settings -> Environment Variables 設定：

```env
VITE_DEMO_MODE=true
VITE_MOCK_ADMIN_PASSWORD=<your-mock-admin-password>
VITE_MOCK_MANAGER_PASSWORD=<your-mock-manager-password>
```

Demo 模式下登入與上傳會走前端 mock 流程，不依賴後端服務。可參考 `frontend/.env.example` 了解可設定的環境變數。

## 備註

- 關機重開後，不需要重跑 migration 或 seed
- 只要重新執行「日常啟動」三步驟即可
