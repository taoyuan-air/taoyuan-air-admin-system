import { useState } from 'react';
import Header from '../../components/Layout/Header';
import LidarTypeTabs, { type LidarType } from './LidarTypeTabs';
import AerosolLidarPage from './AerosolLidarPage';
import WindLidarPage from './WindLidarPage';

const SUBTITLES: Record<LidarType, string> = {
  aerosol: 'MiniLidar L1 互動視覺化',
  wind:    'WindLidar 互動視覺化',
};

export default function LidarPage() {
  const [lidarType, setLidarType] = useState<LidarType>('aerosol');

  return (
    <div>
      <Header title="光達分析" subtitle={SUBTITLES[lidarType]} />

      <LidarTypeTabs active={lidarType} onChange={setLidarType} />

      {lidarType === 'aerosol' ? <AerosolLidarPage /> : <WindLidarPage />}
    </div>
  );
}
