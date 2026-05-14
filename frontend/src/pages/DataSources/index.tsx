import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Layout/Header";
import { apiUrl, isDemoMode } from "../../config/api";
import { useAppData } from "../../contexts/AppDataContext";
import type { SourceRecord } from "../../contexts/AppDataContext";
import DataSourceCards from "./DataSourceCards";
import DataSourceFormModal from "./DataSourceFormModal";
import DataSourceTabs from "./DataSourceTabs";
import IncidentLogSection from "./IncidentLogSection";
import SftpLogModal from "./SftpLogModal";
import SyncLogModal from "./SyncLogModal";
import {
  databaseCategoryForSource,
  emptyForm,
  mockSftpLogs,
  validateDataSourceForm,
  type SftpLog,
  type SourceSubPage,
} from "./dataSourceHelpers";

export default function DataSources() {
  const { sources, setSources } = useAppData();
  const navigate = useNavigate();
  const [activeSubPage, setActiveSubPage] =
    useState<SourceSubPage>("sources");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSrc, setEditingSrc] = useState<SourceRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});
  const [logSrc, setLogSrc] = useState<SourceRecord | null>(null);
  const [sftpLogSrc, setSftpLogSrc] = useState<SourceRecord | null>(null);
  const [sftpLogs, setSftpLogs] = useState<SftpLog[]>([]);
  const [sftpLoading, setSftpLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;

    const token = sessionStorage.getItem("auth_token");
    fetch(apiUrl("/api/sftp/last-sync"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: Record<string, string | null>) => {
        const idToKey: Record<string, string> = {
          "6": "NAQO",
          "7": "WindLidar",
          "8": "MPL",
          "2": "UAV",
        };
        setSources((prev) =>
          prev.map((source) => {
            const key = idToKey[source.id];
            return {
              ...source,
              lastSync: data[key]
                ? new Date(data[key]!).toLocaleString("zh-TW", {
                    hour12: false,
                  })
                : "—",
            };
          }),
        );
      })
      .catch(() => {});
  }, [setSources]);

  useEffect(() => {
    if (!sftpLogSrc) return;

    if (isDemoMode) {
      const timer = window.setTimeout(
        () => setSftpLogs(mockSftpLogs[sftpLogSrc.id] ?? []),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    const sourceMap: Record<string, string> = {
      "6": "NAQO",
      "7": "WindLidar",
      "8": "MPL",
    };
    const source = sourceMap[sftpLogSrc.id];
    if (!source) {
      const timer = window.setTimeout(() => setSftpLogs([]), 0);
      return () => window.clearTimeout(timer);
    }

    const loadingTimer = window.setTimeout(() => setSftpLoading(true), 0);
    const token = sessionStorage.getItem("auth_token");
    fetch(apiUrl(`/api/sftp/logs?source=${source}&limit=50`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) =>
        setSftpLogs(
          (data.logs ?? []).map(
            (log: {
              file_name: string;
              data_time: string | null;
              status: string;
              received_at: string;
              error_msg: string | null;
            }) => ({
              fileName: log.file_name,
              dataTime: log.data_time
                ? new Date(log.data_time).toLocaleString("zh-TW")
                : "—",
              status: log.status as SftpLog["status"],
              time: new Date(log.received_at).toLocaleString("zh-TW"),
              errorMsg: log.error_msg ?? undefined,
            }),
          ),
        ),
      )
      .catch(() => setSftpLogs([]))
      .finally(() => setSftpLoading(false));

    return () => window.clearTimeout(loadingTimer);
  }, [sftpLogSrc]);

  const isEditing = editingSrc !== null;

  const handleTest = (id: string) => {
    setTestingId(id);
    setTimeout(() => setTestingId(null), 2000);
  };

  const openAdd = () => {
    setEditingSrc(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (source: SourceRecord) => {
    setEditingSrc(source);
    setForm({
      name: source.name,
      type: source.type as typeof emptyForm.type,
      endpoint: source.endpoint,
      frequency: source.frequency,
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSrc(null);
    setErrors({});
  };

  const handleSubmit = () => {
    const validationErrors = validateDataSourceForm(form);
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    if (isEditing) {
      setSources((prev) =>
        prev.map((source) =>
          source.id === editingSrc.id
            ? {
                ...source,
                name: form.name.trim(),
                type: form.type,
                endpoint: form.endpoint.trim(),
                frequency: Number(form.frequency),
              }
            : source,
        ),
      );
    } else {
      const newId = String(Math.max(...sources.map((s) => Number(s.id))) + 1);
      setSources((prev) => [
        ...prev,
        {
          id: newId,
          name: form.name.trim(),
          type: form.type,
          endpoint: form.endpoint.trim(),
          frequency: Number(form.frequency),
          active: true,
          lastSync: "—",
          status: "pending",
        },
      ]);
    }

    closeForm();
  };

  const browseDatabase = (source: SourceRecord) => {
    navigate(`/source-db/${databaseCategoryForSource(source)}`);
  };

  return (
    <div>
      <Header title="資料來源管理" subtitle="管理各資料來源的 API 設定與同步排程" />

      <DataSourceTabs
        activeSubPage={activeSubPage}
        onChange={setActiveSubPage}
      />

      {activeSubPage === "sources" && (
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}
        >
          <button
            onClick={openAdd}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6abe74",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + 新增資料來源
          </button>
        </div>
      )}

      {activeSubPage === "sources" ? (
        <DataSourceCards
          sources={sources}
          testingId={testingId}
          onBrowseDatabase={browseDatabase}
          onOpenSftpLog={setSftpLogSrc}
          onTest={handleTest}
          onEdit={openEdit}
          onOpenLog={setLogSrc}
        />
      ) : (
        <IncidentLogSection />
      )}

      <DataSourceFormModal
        open={showForm}
        isEditing={isEditing}
        form={form}
        errors={errors}
        setForm={setForm}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <SyncLogModal source={logSrc} onClose={() => setLogSrc(null)} />

      <SftpLogModal
        source={sftpLogSrc}
        logs={sftpLogs}
        loading={sftpLoading}
        onClose={() => setSftpLogSrc(null)}
      />
    </div>
  );
}
