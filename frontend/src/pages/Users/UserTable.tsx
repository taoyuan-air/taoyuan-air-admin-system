import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { formatLastLogin, roleConfig, type UserRow } from "./userHelpers";

interface UserTableProps {
  users: UserRow[];
  onEdit: (user: UserRow) => void;
  onToggleActive: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}

export default function UserTable({
  users,
  onEdit,
  onToggleActive,
  onDelete,
}: UserTableProps) {
  return (
    <Card>
      <div className="table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {[
                "使用者",
                "帳號",
                "角色",
                "組織",
                "上傳配額",
                "最後登入",
                "狀態",
                "操作",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontSize: 12,
                    color: "#999",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.userId}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
              >
                <td style={{ padding: "12px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: roleConfig[u.roleCode]?.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: roleConfig[u.roleCode]?.color,
                      }}
                    >
                      {u.fullName[0]}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {u.fullName}
                      </div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  style={{
                    padding: "12px",
                    fontSize: 12,
                    color: "#666",
                    fontFamily: "monospace",
                  }}
                >
                  {u.username}
                </td>
                <td style={{ padding: "12px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      color: roleConfig[u.roleCode]?.color,
                      backgroundColor: roleConfig[u.roleCode]?.bg,
                    }}
                  >
                    {roleConfig[u.roleCode]?.label}
                  </span>
                </td>
                <td style={{ padding: "12px", fontSize: 12, color: "#666" }}>
                  {u.organization || "—"}
                </td>
                <td style={{ padding: "12px", fontSize: 12, color: "#666" }}>
                  {u.uploadQuotaGb} GB
                </td>
                <td style={{ padding: "12px", fontSize: 12, color: "#666" }}>
                  {formatLastLogin(u.lastLogin)}
                </td>
                <td style={{ padding: "12px" }}>
                  <StatusBadge status={u.isActive ? "active" : "inactive"} />
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => onEdit(u)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(106,190,116,0.4)",
                        backgroundColor: "transparent",
                        color: "#6abe74",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => onToggleActive(u)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(0,0,0,0.12)",
                        backgroundColor: "transparent",
                        color: "#888",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {u.isActive ? "停用" : "啟用"}
                    </button>
                    <button
                      onClick={() => onDelete(u)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(220,38,38,0.25)",
                        backgroundColor: "transparent",
                        color: "#dc2626",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
