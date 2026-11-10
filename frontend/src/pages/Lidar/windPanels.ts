export type WindPanelKey = 'wind_speed' | 'wind_direction' | 'turbulence' | 'cnr';

export const WIND_PANEL_LABELS: Record<WindPanelKey, string> = {
  wind_speed:      '風速剖面',
  wind_direction:  '風向剖面',
  turbulence:      '亂流強度',
  cnr:             'CNR',
};

export const ALL_WIND_PANELS: WindPanelKey[] = ['wind_speed', 'wind_direction', 'turbulence', 'cnr'];
