export interface LidarStation {
  name: string;
  dates: string[]; // YYYY-MM-DD (Taiwan local date)
}

export interface LidarStationsResponse {
  stations: LidarStation[];
}

export interface NrbPanel {
  z: number[][];
  unit: string;
  colorMin: number;
  colorMax: number;
}

export interface DepolPanel {
  z: number[][];
  scale: 'log10_precomputed';
  unit: string;
  colorMin: number;
  colorMax: number;
}

export interface TemperaturePanel {
  laser: (number | null)[];
  detector: (number | null)[];
  box: (number | null)[];
  unit: string;
}

export interface BackgroundEnergyPanel {
  background_log10: (number | null)[];
  energy: (number | null)[];
}

export interface LidarPanels {
  nrb?: NrbPanel;
  depol?: DepolPanel;
  temperature?: TemperaturePanel;
  backgroundEnergy?: BackgroundEnergyPanel;
}

export interface LidarPlotData {
  station: string;
  timezone: string;
  rangeKm: number[];
  times: string[];
  panels: LidarPanels;
  sourceFiles: string[];
  warnings: string[];
}

export type PanelKey = 'nrb' | 'depol' | 'temperature' | 'backgroundEnergy';

export interface LidarQueryParams {
  station: string;
  date: string;       // YYYY-MM-DD (Taiwan local)
  heightMax: number;  // km
  panels: PanelKey[];
}
