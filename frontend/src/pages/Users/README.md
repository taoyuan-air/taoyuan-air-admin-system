# 使用者管理模組

帳號管理、角色權限與上傳配額設定，僅 `system_admin` 可存取。

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
