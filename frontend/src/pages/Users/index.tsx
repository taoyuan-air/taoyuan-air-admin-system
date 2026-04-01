import { useState } from 'react';
import { X } from 'lucide-react';
import Select from 'react-select';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  super_admin:  { label: '超級管理員', color: '#2d6a4f', bg: 'rgba(45,106,79,0.12)'   },
  system_admin: { label: '系統管理員', color: '#52796f', bg: 'rgba(82,121,111,0.12)'  },
  data_manager: { label: '資料管理員', color: '#6abe74', bg: 'rgba(106,190,116,0.12)' },
  readonly:     { label: '唯讀使用者', color: '#a0a98f', bg: 'rgba(160,169,143,0.15)' },
};

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  org: string;
  active: boolean;
  lastLogin: string;
  quota: number;
}

const initialUsers: User[] = [
  { id: 1, username: 'admin',    fullName: '系統管理員', email: 'admin@taoyuan.gov.tw', role: 'super_admin',  org: '桃園市政府', active: true,  lastLogin: '2026-04-01 08:30', quota: 100 },
  { id: 2, username: 'sys_mgr',  fullName: '王大明',    email: 'wang@taoyuan.gov.tw',  role: 'system_admin', org: '桃園市政府', active: true,  lastLogin: '2026-04-01 07:15', quota: 50 },
  { id: 3, username: 'data_mgr', fullName: '李小華',    email: 'lee@taoyuan.gov.tw',   role: 'data_manager', org: '桃園市政府', active: true,  lastLogin: '2026-03-31 16:00', quota: 30 },
  { id: 4, username: 'readonly', fullName: '張唯讀',    email: 'zhang@taoyuan.gov.tw', role: 'readonly',     org: '桃園市政府', active: false, lastLogin: '2026-03-20 11:00', quota: 5 },
];

const roleOptions = Object.entries(roleConfig).map(([value, cfg]) => ({ value, label: cfg.label, color: cfg.color, bg: cfg.bg }));

const selectStyles = {
  control: (base: object, state: { isFocused: boolean }) => ({
    ...base,
    borderRadius: 8,
    border: `1px solid ${state.isFocused ? '#6abe74' : 'rgba(0,0,0,0.12)'}`,
    boxShadow: state.isFocused ? '0 0 0 2px rgba(106,190,116,0.2)' : 'none',
    backgroundColor: '#fff',
    fontSize: 13,
    minHeight: 38,
    '&:hover': { borderColor: '#6abe74' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean; data: typeof roleOptions[0] }) => ({
    ...base,
    backgroundColor: state.isSelected ? state.data.bg : state.isFocused ? 'rgba(106,190,116,0.06)' : '#fff',
    color: state.isSelected ? state.data.color : '#374151',
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: 13,
    cursor: 'pointer',
  }),
  singleValue: (base: object, state: { data: typeof roleOptions[0] }) => ({
    ...base,
    color: state.data.color,
    fontWeight: 600,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: object) => ({ ...base, color: '#6abe74', padding: '0 8px' }),
  menu: (base: object) => ({ ...base, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(106,190,116,0.2)' }),
  menuList: (base: object) => ({ ...base, padding: 4 }),
};

const emptyForm = { fullName: '', username: '', email: '', role: 'readonly', org: '', quota: 10 };

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)',
  fontSize: 13,
  color: '#374151',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block' as const,
  fontSize: 12,
  color: '#666',
  marginBottom: 6,
  fontWeight: 600 as const,
};

export default function Users() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});

  const filtered = filterRole === 'all' ? users : users.filter(u => u.role === filterRole);
  const isEditing = editingUser !== null;

  const validate = () => {
    const e: Partial<typeof emptyForm> = {};
    if (!form.fullName.trim()) e.fullName = '請輸入姓名';
    if (!form.username.trim()) e.username = '請輸入帳號';
    if (!form.email.trim()) e.email = '請輸入 Email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email 格式不正確';
    if (!isEditing && users.some(u => u.username === form.username.trim())) e.username = '帳號已存在';
    if (isEditing && users.some(u => u.username === form.username.trim() && u.id !== editingUser.id)) e.username = '帳號已存在';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (isEditing) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        org: form.org.trim(),
        quota: Number(form.quota),
      } : u));
    } else {
      setUsers(prev => [...prev, {
        id: Math.max(...prev.map(u => u.id)) + 1,
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role,
        org: form.org.trim(),
        quota: Number(form.quota),
        active: true,
        lastLogin: '—',
      }]);
    }
    handleClose();
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setForm({ fullName: u.fullName, username: u.username, email: u.email, role: u.role, org: u.org, quota: u.quota });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
  };

  const toggleActive = (id: number) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  return (
    <div>
      <Header title="使用者管理" subtitle="帳號管理、角色權限與上傳配額設定" />

      {/* Role filter */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(roleConfig).map(([key, cfg]) => {
          const count = users.filter(u => u.role === key).length;
          const isActive = filterRole === key;
          return (
            <button key={key} onClick={() => setFilterRole(isActive ? 'all' : key)} style={{
              padding: '12px', borderRadius: 12,
              border: `1px solid ${isActive ? cfg.color : 'rgba(0,0,0,0.08)'}`,
              backgroundColor: isActive ? cfg.bg : 'rgba(255,255,255,0.8)',
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>{count}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowModal(true)} style={{
          padding: '10px 20px', backgroundColor: '#6abe74',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>+ 新增使用者</button>
      </div>

      <Card>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {['使用者', '帳號', '角色', '組織', '上傳配額', '最後登入', '狀態', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      backgroundColor: roleConfig[u.role].bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: roleConfig[u.role].color,
                    }}>{u.fullName[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{u.fullName}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{u.username}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                    fontSize: 11, fontWeight: 600,
                    color: roleConfig[u.role].color, backgroundColor: roleConfig[u.role].bg,
                  }}>{roleConfig[u.role].label}</span>
                </td>
                <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{u.org || '—'}</td>
                <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{u.quota} GB</td>
                <td style={{ padding: '12px', fontSize: 12, color: '#666' }}>{u.lastLogin}</td>
                <td style={{ padding: '12px' }}><StatusBadge status={u.active ? 'active' : 'inactive'} /></td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEdit(u)} style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid rgba(106,190,116,0.4)',
                      backgroundColor: 'transparent', color: '#6abe74',
                      fontSize: 11, cursor: 'pointer',
                    }}>編輯</button>
                    <button onClick={() => toggleActive(u.id)} style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid rgba(0,0,0,0.12)',
                      backgroundColor: 'transparent', color: '#888',
                      fontSize: 11, cursor: 'pointer',
                    }}>{u.active ? '停用' : '啟用'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={handleClose}>
          <div style={{
            backgroundColor: '#F4F2E9',
            borderRadius: 20,
            padding: 28,
            width: 'min(480px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>{isEditing ? '編輯使用者' : '新增使用者'}</h2>
              <button onClick={handleClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center',
              }}>
                <X size={18} color="#999" />
              </button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                <div>
                  <label style={labelStyle}>姓名 *</label>
                  <input style={{ ...inputStyle, borderColor: errors.fullName ? '#6abe74' : 'rgba(0,0,0,0.12)' }}
                    value={form.fullName} placeholder="請輸入姓名"
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
                  {errors.fullName && <div style={{ fontSize: 11, color: '#6A8D73', marginTop: 4 }}>{errors.fullName}</div>}
                </div>
                <div>
                  <label style={labelStyle}>帳號 *</label>
                  <input style={{ ...inputStyle, borderColor: errors.username ? '#6abe74' : 'rgba(0,0,0,0.12)' }}
                    value={form.username} placeholder="請輸入帳號"
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                  {errors.username && <div style={{ fontSize: 11, color: '#6A8D73', marginTop: 4 }}>{errors.username}</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Email *</label>
                <input style={{ ...inputStyle, borderColor: errors.email ? '#6abe74' : 'rgba(0,0,0,0.12)' }}
                  value={form.email} placeholder="example@taoyuan.gov.tw" type="email"
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                {errors.email && <div style={{ fontSize: 11, color: '#6A8D73', marginTop: 4 }}>{errors.email}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                <div>
                  <label style={labelStyle}>角色 *</label>
                  <Select
                    options={roleOptions}
                    value={roleOptions.find(o => o.value === form.role)}
                    onChange={opt => setForm(p => ({ ...p, role: opt?.value ?? 'readonly' }))}
                    styles={selectStyles}
                    isSearchable={false}
                    formatOptionLabel={opt => (
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        color: opt.color, backgroundColor: opt.bg,
                      }}>{opt.label}</span>
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>上傳配額 (GB)</label>
                  <input style={inputStyle} type="number" min={1} max={1000}
                    value={form.quota}
                    onChange={e => setForm(p => ({ ...p, quota: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>組織</label>
                <input style={inputStyle} value={form.org} placeholder="所屬組織（選填）"
                  onChange={e => setForm(p => ({ ...p, org: e.target.value }))} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={handleClose} style={{
                padding: '9px 20px', borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                backgroundColor: 'transparent', color: '#666',
                fontSize: 13, cursor: 'pointer',
              }}>取消</button>
              <button onClick={handleSubmit} style={{
                padding: '9px 20px', borderRadius: 10,
                border: 'none', backgroundColor: '#6abe74',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{isEditing ? '儲存' : '新增'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
