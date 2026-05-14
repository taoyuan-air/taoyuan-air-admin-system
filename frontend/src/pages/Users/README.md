# 使用者管理模組

帳號管理、角色權限與上傳配額設定，僅 `system_admin` 可存取。

## 前端檔案結構

Users 頁面已依功能區塊拆分，`index.tsx` 保留使用者資料流、API 呼叫與 modal 狀態，其餘 UI 區塊放在同層檔案。

| 檔案 | 職責 |
| ---- | ---- |
| `index.tsx` | 頁面容器。管理使用者列表、角色篩選、新增/編輯/停用/刪除流程與 modal 狀態。 |
| `userHelpers.ts` | `UserRow` 型別、角色設定、表單預設值、select/input style、驗證與格式化函式。 |
| `UserTable.tsx` | 使用者表格、角色 badge、狀態顯示、編輯/啟用停用/刪除按鈕。 |
| `UserFormModal.tsx` | 新增與編輯使用者 Modal。 |
| `TempPasswordModal.tsx` | 顯示新帳號的臨時密碼與複製按鈕。 |
| `DeleteUserDialog.tsx` | 刪除使用者確認 Dialog。 |

### 拆分原則

- `index.tsx` 負責 API 與資料更新，不直接堆疊大型 JSX 區塊。
- 區塊元件只透過 props 接收狀態與 callback，不直接呼叫 API。
- 共用角色設定、表單型別與格式化工具集中在 `userHelpers.ts`。

## 相關 API

| 方法   | 路徑                    | 說明                   |
| ------ | ----------------------- | ---------------------- |
| GET    | `/api/users`            | 查詢所有使用者列表     |
| POST   | `/api/users`            | 新增使用者             |
| PATCH  | `/api/users/:id`        | 編輯使用者資料         |
| PATCH  | `/api/users/:id/active` | 啟用／停用帳號         |
| DELETE | `/api/users/:id`        | 刪除使用者             |

> 所有路由皆需 JWT 驗證、已完成密碼修改，且角色為 `system_admin`。

### GET `/api/users`

Response：

```json
{
  "users": [
    {
      "userId": 1,
      "username": "admin",
      "fullName": "系統管理員",
      "email": "admin@taoyuan-air.gov.tw",
      "roleCode": "system_admin",
      "roleName": "系統管理員",
      "organization": "桃園市政府",
      "uploadQuotaGb": 100,
      "isActive": true,
      "mustChangePassword": false,
      "lastLogin": "2025-01-01T00:00:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST `/api/users`

Request（`application/json`）：

| 欄位            | 必填 | 說明                                      |
| --------------- | ---- | ----------------------------------------- |
| `username`      | ✓    | 帳號（建立後不可修改）                    |
| `email`         | ✓    | Email                                     |
| `fullName`      | ✓    | 姓名                                      |
| `roleCode`      | ✓    | `system_admin` \| `data_manager` \| `readonly` |
| `uploadQuotaGb` | ✓    | 上傳配額（GB）                            |
| `organization`  |      | 所屬組織（選填）                          |

Response `201`：

```json
{
  "user": { ... },
  "temporaryPassword": "REMOVED_REVOKED_SECRET"
}
```

- 系統自動產生臨時密碼，**僅此次回傳**，請立即複製給使用者
- 使用者首次登入後系統強制要求修改密碼（`mustChangePassword: true`）

### PATCH `/api/users/:id`

可更新欄位：`fullName`、`email`、`roleCode`、`organization`、`uploadQuotaGb`（皆選填，未傳入的欄位保持不變）。

### PATCH `/api/users/:id/active`

Request：

```json
{ "isActive": false }
```

停用帳號後該使用者無法登入（登入時回傳 `401 ACCOUNT_DISABLED`）。

### DELETE `/api/users/:id`

永久刪除帳號，無法復原。

---

## 角色說明

| 角色代碼     | 角色名稱   | 權限                         |
| ------------ | ---------- | ---------------------------- |
| `system_admin` | 系統管理員 | 全功能，含使用者管理         |
| `data_manager` | 資料管理員 | 可上傳資料，不可管理使用者   |
| `readonly`     | 唯讀使用者 | 僅可瀏覽，不可上傳或管理；上傳配額固定為 0 |

---

## 操作流程

### 新增使用者

```
點擊「+ 新增使用者」
  ↓
填寫姓名、帳號、Email、角色、上傳配額、組織（選填）
  ↓
POST /api/users
  ↓
顯示臨時密碼 Modal → 複製密碼交給使用者
  （密碼僅此次顯示）
```

### 編輯使用者

```
點擊列表中的「編輯」
  ↓
修改姓名、Email、角色、配額、組織
（帳號欄位不可修改）
  ↓
PATCH /api/users/:id
```

### 啟用／停用帳號

```
點擊列表中的「停用」或「啟用」
  ↓
PATCH /api/users/:id/active  { isActive: true/false }
```

### 刪除使用者

```
點擊列表中的「刪除」→ 確認 Modal
  ↓
DELETE /api/users/:id
  ↓
從列表中移除（無法復原）
```

---

## 資料庫查詢（admin_users 表）

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
-- 查所有使用者
SELECT user_id, username, full_name, email, role_code, is_active, created_at
FROM admin_users
ORDER BY created_at DESC;

-- 查特定角色的使用者
SELECT * FROM admin_users WHERE role_code = 'system_admin';
SELECT * FROM admin_users WHERE role_code = 'data_manager';
SELECT * FROM admin_users WHERE role_code = 'readonly';

-- 查啟用中的帳號
SELECT * FROM admin_users WHERE is_active = true;

-- 查需要修改密碼的帳號
SELECT username, full_name, created_at FROM admin_users WHERE must_change_password = true;

-- 查某使用者的上傳記錄（跨表 JOIN）
SELECT u.username, f.file_name, f.data_category, f.upload_status, f.created_at
FROM admin_users u
JOIN file_uploads f ON u.user_id = f.user_id
WHERE u.username = 'admin'
ORDER BY f.created_at DESC;
```

### 欄位說明

| 欄位                  | 說明                                                   |
| --------------------- | ------------------------------------------------------ |
| `user_id`             | 使用者 ID                                              |
| `username`            | 帳號（唯一，建立後不可修改）                           |
| `full_name`           | 姓名                                                   |
| `email`               | Email                                                  |
| `role_code`           | `system_admin` \| `data_manager` \| `readonly`         |
| `organization`        | 所屬組織                                               |
| `upload_quota_gb`     | 上傳配額（GB）                                         |
| `is_active`           | 帳號是否啟用                                           |
| `must_change_password`| 是否需要修改密碼（首次登入為 `true`）                  |
| `last_login`          | 最後登入時間                                           |
| `created_at`          | 帳號建立時間                                           |
