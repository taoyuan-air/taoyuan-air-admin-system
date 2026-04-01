import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { CloudUpload, FileText, Package, Wind, Plane, ChevronRight, ChevronLeft, CheckCircle2, XCircle, UploadCloud } from 'lucide-react';
import Card from '../../components/Card';
import Header from '../../components/Layout/Header';
import StatusBadge from '../../components/StatusBadge';

type DataCategory = 'lidar' | 'uav';
type LidarSubType = 'point_cloud' | 'wind_field' | 'boundary_layer';
type UAVSubType = 'sensor' | 'flight_path' | 'imagery' | 'meteorological';

const lidarConfig: Record<LidarSubType, { label: string; formats: string; maxSize: string }> = {
  point_cloud:    { label: '點雲資料',  formats: '.las, .laz, .ply, .pcd, .xyz', maxSize: '500 MB' },
  wind_field:     { label: '風場資料',  formats: '.nc, .hdf5, .csv, .json',       maxSize: '100 MB' },
  boundary_layer: { label: '大氣邊界層', formats: '.nc, .csv, .json',              maxSize: '50 MB' },
};

const uavConfig: Record<UAVSubType, { label: string; formats: string; maxSize: string }> = {
  sensor:         { label: '感測器資料', formats: '.csv, .json, .xml, .txt',       maxSize: '100 MB' },
  flight_path:    { label: '飛行軌跡',  formats: '.kml, .gpx, .csv, .json',       maxSize: '10 MB' },
  imagery:        { label: '影像資料',  formats: '.jpg, .png, .tiff, .raw',        maxSize: '200 MB' },
  meteorological: { label: '氣象資料',  formats: '.csv, .json, .nc',              maxSize: '50 MB' },
};

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed' | 'processing';
}

interface HistoryRecord {
  id: number;
  name: string;
  type: string;
  size: string;
  status: 'completed' | 'processing' | 'failed';
  time: string;
  user: string;
}

const initialHistory: HistoryRecord[] = [
  { id: 1, name: 'lidar_20250115_001.las',  type: '點雲資料',  size: '245 MB', status: 'completed',  time: '2025-01-15 10:32', user: 'admin' },
  { id: 2, name: 'uav_flight_20250115.csv', type: 'UAV 感測器', size: '12 MB',  status: 'processing', time: '2025-01-15 10:15', user: 'partner01' },
  { id: 3, name: 'wind_field_20250115.nc',  type: '風場資料',  size: '88 MB',  status: 'completed',  time: '2025-01-15 09:50', user: 'admin' },
  { id: 4, name: 'boundary_layer.json',     type: '大氣邊界層', size: '5 MB',   status: 'failed',     time: '2025-01-15 09:20', user: 'data_mgr' },
];

export default function Upload() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<DataCategory | null>(null);
  const [lidarType, setLidarType] = useState<LidarSubType>('point_cloud');
  const [uavType, setUavType] = useState<UAVSubType>('sensor');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>(initialHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConfig = category === 'lidar' ? lidarConfig[lidarType] : category === 'uav' ? uavConfig[uavType] : null;
  const [hoveredCategory, setHoveredCategory] = useState<DataCategory | null>(null);
  const allDone = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'completed' || f.status === 'failed');
  const successCount = uploadFiles.filter(f => f.status === 'completed').length;
  const failCount = uploadFiles.filter(f => f.status === 'failed').length;

  const simulateUpload = (files: File[]) => {
    const newFiles: UploadFile[] = files.map(f => ({
      id: `${Date.now()}-${f.name}`,
      file: f,
      progress: 0,
      status: 'uploading',
    }));
    setUploadFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(uf => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          clearInterval(interval);
          setUploadFiles(prev => prev.map(f => f.id === uf.id ? { ...f, progress: 100, status: 'completed' } : f));
          // 同步新增到歷史記錄
          const now = new Date();
          const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          setHistory(prev => [{
            id: Date.now(),
            name: uf.file.name,
            type: currentConfig?.label ?? '未知',
            size: formatSize(uf.file.size),
            status: 'completed',
            time: timeStr,
            user: 'admin',
          }, ...prev]);
        } else {
          setUploadFiles(prev => prev.map(f => f.id === uf.id ? { ...f, progress: Math.round(progress) } : f));
        }
      }, 300);
    });
  };

  const resetUpload = () => {
    setUploadFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) simulateUpload(files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) simulateUpload(files);
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div>
      <Header title="資料上傳" subtitle="光達與無人機資料上傳管理" />

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
        {([['1', '選擇類型'], ['2', '選擇子類型'], ['3', '上傳檔案']] as [string, string][]).map(([n, label], i) => {
          const num = Number(n);
          const done = step > num;
          const active = step === num;
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: done || active ? '#6abe74' : '#e5e7eb',
                  color: done || active ? '#fff' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>{done ? '✓' : n}</div>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#374151' : '#9ca3af' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: 40, height: 2, backgroundColor: step > num ? '#6abe74' : '#e5e7eb', margin: '0 12px' }} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: 選擇大類 */}
      {step === 1 && (
        <div className="grid-step1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {([['lidar', '光達資料', 'LiDAR', '點雲、風場、大氣邊界層等光達量測資料'] ,
             ['uav',   '無人機資料', 'UAV',  '感測器、飛行軌跡、影像、氣象等無人機資料']] as [DataCategory, string, string, string][]).map(
            ([val, title, eng, desc]) => (
              <div
                key={val}
                onClick={() => { setCategory(val); setStep(2); }}
                onMouseEnter={() => setHoveredCategory(val)}
                onMouseLeave={() => setHoveredCategory(null)}
                style={{
                  padding: '32px 28px', borderRadius: 16, cursor: 'pointer',
                  border: `2px solid ${category === val || hoveredCategory === val ? '#6abe74' : 'rgba(106,190,116,0.25)'}`,
                  backgroundColor: category === val ? 'rgba(106,190,116,0.08)' : hoveredCategory === val ? 'rgba(106,190,116,0.05)' : '#fff',
                  transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transform: hoveredCategory === val ? 'translateY(-2px)' : 'none',
                  boxShadow: hoveredCategory === val ? '0 6px 20px rgba(106,190,116,0.15)' : 'none',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: 'rgba(106,190,116,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {val === 'lidar' ? <Wind size={24} color="#6abe74" /> : <Plane size={24} color="#6abe74" />}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#374151' }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#6abe74', fontWeight: 600, marginBottom: 6 }}>{eng}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6abe74', fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                  選擇 <ChevronRight size={15} />
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Step 2: 選擇子類型 */}
      {step === 2 && category && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
            選擇{category === 'lidar' ? '光達' : '無人機'}資料子類型
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(category === 'lidar'
              ? Object.entries(lidarConfig) as [LidarSubType, typeof lidarConfig[LidarSubType]][]
              : Object.entries(uavConfig) as [UAVSubType, typeof uavConfig[UAVSubType]][]
            ).map(([key, cfg]) => {
              const selected = category === 'lidar' ? lidarType === key : uavType === key;
              return (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${selected ? '#6abe74' : 'rgba(106,190,116,0.2)'}`,
                  backgroundColor: selected ? 'rgba(106,190,116,0.07)' : '#fff',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="subtype" value={key} checked={selected}
                    onChange={() => category === 'lidar' ? setLidarType(key as LidarSubType) : setUavType(key as UAVSubType)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  {/* 自訂圓圈 */}
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selected ? '#6abe74' : '#d1d5db'}`,
                    backgroundColor: selected ? '#6abe74' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, display: 'flex', gap: 16 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={11} /> {cfg.formats}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={11} /> 最大 {cfg.maxSize}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              backgroundColor: 'transparent', fontSize: 13, color: '#6b7280', cursor: 'pointer',
            }}><ChevronLeft size={15} /> 上一步</button>
            <button onClick={() => setStep(3)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 8, border: 'none',
              backgroundColor: '#6abe74', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>下一步 <ChevronRight size={15} /></button>
          </div>
        </Card>
      )}

      {/* Step 3: 上傳 */}
      {step === 3 && currentConfig && (
        <Card style={{ marginBottom: 20 }}>
          {/* 已選摘要 */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
            padding: '10px 14px', backgroundColor: 'rgba(106,190,116,0.06)',
            borderRadius: 10, fontSize: 12, color: '#6b7280',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>
              {category === 'lidar' ? '光達資料' : '無人機資料'} › {currentConfig.label}
            </span>
            <span>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={11} />{currentConfig.formats}</span>
            <span>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={11} />最大 {currentConfig.maxSize}</span>
            <button onClick={() => setStep(2)} style={{
              marginLeft: 'auto', fontSize: 11, color: '#6abe74', background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}>修改</button>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#6abe74' : 'rgba(106,190,116,0.4)'}`,
              borderRadius: 16, padding: '48px 24px', textAlign: 'center',
              backgroundColor: isDragging ? 'rgba(106,190,116,0.08)' : 'rgba(106,190,116,0.03)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <CloudUpload size={40} color={isDragging ? '#6abe74' : 'rgba(106,190,116,0.5)'} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>拖拽檔案至此處上傳</div>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>或點擊選擇檔案，支援批次上傳</div>
            <button style={{
              padding: '8px 20px', backgroundColor: '#6abe74',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>選擇檔案</button>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {/* 上傳進度列表 */}
          {uploadFiles.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12 }}>上傳進度</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {uploadFiles.map(uf => (
                  <div key={uf.id} style={{
                    padding: '12px 16px',
                    backgroundColor: uf.status === 'completed' ? 'rgba(106,190,116,0.06)' : uf.status === 'failed' ? 'rgba(239,68,68,0.04)' : 'rgba(106,190,116,0.04)',
                    borderRadius: 12,
                    border: `1px solid ${uf.status === 'completed' ? 'rgba(106,190,116,0.25)' : uf.status === 'failed' ? 'rgba(239,68,68,0.2)' : 'rgba(106,190,116,0.1)'}`,
                  }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: uf.status === 'uploading' ? 8 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {uf.status === 'completed' && <CheckCircle2 size={15} color="#6abe74" />}
                        {uf.status === 'failed' && <XCircle size={15} color="#ef4444" />}
                        {uf.status === 'uploading' && <UploadCloud size={15} color="#6abe74" />}
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{uf.file.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#999' }}>{formatSize(uf.file.size)}</span>
                        <StatusBadge status={uf.status} />
                      </div>
                    </div>
                    {uf.status === 'uploading' && (
                      <>
                        <div style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${uf.progress}%`,
                            backgroundColor: '#6abe74',
                            borderRadius: 3, transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{uf.progress}%</div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* 全部完成後的結果摘要 */}
              {allDone && (
                <div style={{
                  marginTop: 16, padding: '16px 20px', borderRadius: 12,
                  backgroundColor: failCount === 0 ? 'rgba(106,190,116,0.08)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${failCount === 0 ? 'rgba(106,190,116,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={20} color={failCount === 0 ? '#6abe74' : '#f59e0b'} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                        {failCount === 0 ? '全部上傳完成！' : `上傳完成（${failCount} 個失敗）`}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        成功 {successCount} 個，已同步至下方歷史記錄
                        {failCount > 0 && `，失敗 ${failCount} 個`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { resetUpload(); setStep(1); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8,
                        border: '1px solid #d1d5db', backgroundColor: 'transparent',
                        color: '#6b7280', fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      <ChevronLeft size={14} /> 更換設定
                    </button>
                    <button
                      onClick={resetUpload}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 8,
                        border: 'none', backgroundColor: '#6abe74',
                        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <UploadCloud size={14} /> 繼續上傳
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadFiles.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setStep(2)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                backgroundColor: 'transparent', fontSize: 13, color: '#6b7280', cursor: 'pointer',
              }}><ChevronLeft size={15} /> 上一步</button>
            </div>
          )}
        </Card>
      )}

      {/* History */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 16 }}>上傳歷史記錄</h3>
        <div className="table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {['檔案名稱', '資料類型', '檔案大小', '上傳者', '上傳時間', '狀態'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '12px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{r.type}</td>
                <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{r.size}</td>
                <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{r.user}</td>
                <td style={{ padding: '12px', fontSize: 13, color: '#666' }}>{r.time}</td>
                <td style={{ padding: '12px' }}><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
