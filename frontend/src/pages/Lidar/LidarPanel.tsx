import { useEffect, useRef, useCallback } from 'react';
import type { LidarPlotData, PanelKey } from '../../types/lidar';

// Lazy-import plotly so the heavy bundle doesn't block the main chunk
type PlotlyModule = typeof import('plotly.js-dist-min');
let plotlyCache: PlotlyModule | null = null;

async function getPlotly(): Promise<PlotlyModule> {
  if (!plotlyCache) {
    plotlyCache = (await import('plotly.js-dist-min')) as unknown as PlotlyModule;
  }
  return plotlyCache;
}

const JET_COLORSCALE: [number, string][] = [
  [0,     'rgb(0,0,131)'],
  [0.125, 'rgb(0,60,170)'],
  [0.25,  'rgb(5,255,255)'],
  [0.375, 'rgb(100,255,150)'],
  [0.5,   'rgb(255,255,0)'],
  [0.625, 'rgb(255,165,0)'],
  [0.75,  'rgb(250,60,0)'],
  [0.875, 'rgb(180,0,0)'],
  [1,     'rgb(128,0,0)'],
];

const PANEL_TITLES: Record<PanelKey, string> = {
  nrb:              'NRB Co-polar',
  depol:            'Depolarization Ratio',
  temperature:      'Instrument Temperature',
  backgroundEnergy: 'Background / Laser Energy',
};

const CHART_HEIGHT = 220;

interface Props {
  panelKey:   PanelKey;
  data:       LidarPlotData;
  xRange:     [string, string] | null;
  onRelayout: (event: Record<string, unknown>) => void;
}

function buildTraces(panelKey: PanelKey, data: LidarPlotData): unknown[] {
  const { times, rangeKm, panels } = data;

  if (panelKey === 'nrb' && panels.nrb) {
    const { z, colorMin, colorMax, unit } = panels.nrb;
    return [{
      type: 'heatmap', x: times, y: rangeKm, z,
      colorscale: JET_COLORSCALE, zmin: colorMin, zmax: colorMax,
      colorbar: { title: { text: unit, side: 'right' }, thickness: 14, len: 0.9 },
      hovertemplate: '時間: %{x}<br>高度: %{y:.3f} km<br>NRB: %{z:.4f}<extra></extra>',
    }];
  }

  if (panelKey === 'depol' && panels.depol) {
    const { z, colorMin, colorMax } = panels.depol;
    return [{
      type: 'heatmap', x: times, y: rangeKm, z,
      colorscale: JET_COLORSCALE, zmin: colorMin, zmax: colorMax,
      colorbar: {
        title: { text: 'Depol Ratio', side: 'right' },
        thickness: 14, len: 0.9,
        tickvals: [-4, -3, -2, -1],
        ticktext: ['0.0001', '0.001', '0.01', '0.1'],
      },
      customdata: z.map(row => row.map(v => v !== null ? Math.pow(10, v) : null)),
      hovertemplate: '時間: %{x}<br>高度: %{y:.3f} km<br>Depol: %{customdata:.4f}<extra></extra>',
    }];
  }

  if (panelKey === 'temperature' && panels.temperature) {
    const { laser, detector, box } = panels.temperature;
    return [
      { type: 'scatter', mode: 'lines', name: 'Laser',    x: times, y: laser,    line: { color: '#16a34a', width: 1.5 }, hovertemplate: '時間: %{x}<br>Laser: %{y:.1f} °C<extra></extra>' },
      { type: 'scatter', mode: 'lines', name: 'Detector', x: times, y: detector, line: { color: '#2563eb', width: 1.5 }, hovertemplate: '時間: %{x}<br>Detector: %{y:.1f} °C<extra></extra>' },
      { type: 'scatter', mode: 'lines', name: 'Box',      x: times, y: box,      line: { color: '#dc2626', width: 1.5 }, hovertemplate: '時間: %{x}<br>Box: %{y:.1f} °C<extra></extra>' },
      { type: 'scatter', mode: 'lines', name: '26°C Ref.', x: [times[0], times[times.length - 1]], y: [26, 26], line: { color: '#000', width: 1, dash: 'dash' }, hoverinfo: 'skip' },
    ];
  }

  if (panelKey === 'backgroundEnergy' && panels.backgroundEnergy) {
    const { background_log10, energy } = panels.backgroundEnergy;
    return [
      { type: 'scatter', mode: 'lines', name: 'Background', x: times, y: background_log10, yaxis: 'y', line: { color: '#2563eb', width: 1.5 }, customdata: background_log10.map(v => v !== null ? Math.pow(10, v) : null), hovertemplate: '時間: %{x}<br>Background: %{customdata:.4f}<extra></extra>' },
      { type: 'scatter', mode: 'lines', name: 'Bg=10 Ref.', x: [times[0], times[times.length - 1]], y: [1, 1], yaxis: 'y', line: { color: '#dc2626', width: 1, dash: 'dash' }, hoverinfo: 'skip' },
      { type: 'scatter', mode: 'lines', name: 'Energy',     x: times, y: energy, yaxis: 'y2', line: { color: '#16a34a', width: 1.5 }, hovertemplate: '時間: %{x}<br>Energy: %{y:.2f}<extra></extra>' },
    ];
  }

  return [];
}

function buildLayout(
  panelKey: PanelKey,
  xRange: [string, string] | null,
): Record<string, unknown> {
  const xAxis: Record<string, unknown> = {
    title: { text: '台灣本地時間', font: { size: 11 } },
    type: 'date',
    tickfont: { size: 10 },
    ...(xRange ? { range: xRange } : {}),
  };

  const base: Record<string, unknown> = {
    height: CHART_HEIGHT,
    margin: { t: 32, b: 40, l: 60, r: 80 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(255,255,255,0.85)',
    font: { family: 'system-ui, sans-serif', size: 11 },
    title: { text: PANEL_TITLES[panelKey], font: { size: 12, color: '#374151' }, x: 0.01, xanchor: 'left' },
    dragmode: 'zoom',
    xaxis: xAxis,
  };

  if (panelKey === 'nrb' || panelKey === 'depol') {
    base.yaxis = { title: { text: '高度 (km)', font: { size: 11 } }, tickfont: { size: 10 } };
  }

  if (panelKey === 'temperature') {
    base.yaxis = { title: { text: '溫度 (°C)', font: { size: 11 } }, tickvals: [18, 22, 26, 30, 34], tickfont: { size: 10 } };
    base.legend = { orientation: 'h', x: 0, y: -0.25, font: { size: 10 } };
    base.showlegend = true;
  }

  if (panelKey === 'backgroundEnergy') {
    base.yaxis  = { title: { text: 'Background (log scale)', font: { size: 10 } }, tickvals: [-3, -2, -1, 0, 1, 2], ticktext: ['0.001', '0.01', '0.1', '1', '10', '100'], tickfont: { size: 9 } };
    base.yaxis2 = { title: { text: 'Energy', font: { size: 10 } }, overlaying: 'y', side: 'right', tickfont: { size: 9 } };
    base.legend = { orientation: 'h', x: 0, y: -0.25, font: { size: 10 } };
    base.showlegend = true;
  }

  return base;
}

const PLOTLY_CONFIG = {
  displayModeBar: true,
  modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'select2d'],
  responsive: true,
  displaylogo: false,
};

export default function LidarPanel({ panelKey, data, xRange, onRelayout }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const hasData = Boolean(data.panels[panelKey]);

  const render = useCallback(async () => {
    const el = divRef.current;
    if (!el || !hasData) return;
    const Plotly = await getPlotly();
    const traces = buildTraces(panelKey, data);
    const layout = buildLayout(panelKey, xRange);
    await Plotly.react(el, traces as never, layout as never, PLOTLY_CONFIG as never);
  }, [panelKey, data, xRange, hasData]);

  // Mount: draw chart and register relayout listener
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    let mounted = true;
    (async () => {
      if (!mounted || !hasData) return;
      const Plotly = await getPlotly();
      const traces = buildTraces(panelKey, data);
      const layout = buildLayout(panelKey, xRange);
      await Plotly.newPlot(el, traces as never, layout as never, PLOTLY_CONFIG as never);
      if (!mounted) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).on('plotly_relayout', onRelayout);
    })();

    return () => {
      mounted = false;
      getPlotly().then(P => P.purge(el)).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only on mount; updates handled below

  // Update chart when data/xRange changes (after initial mount)
  useEffect(() => {
    render();
  }, [render]);

  if (!hasData) {
    return (
      <div style={{
        height: CHART_HEIGHT, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#9ca3af', fontSize: 13,
        border: '1px dashed rgba(106,190,116,0.3)', borderRadius: 10,
      }}>
        {PANEL_TITLES[panelKey]}：無資料
      </div>
    );
  }

  return <div ref={divRef} style={{ width: '100%', minHeight: CHART_HEIGHT }} />;
}
