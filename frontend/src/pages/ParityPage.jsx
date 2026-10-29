import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useApp } from '../context/AppContext';
import { useTranslate } from '../i18n';
import api from '../api';

export default function ParityPage() {
  const { theme } = useApp();
  const t = useTranslate();
  const isDark = theme === 'dark';
  const cText = isDark ? '#eaecf0' : '#1a1d24';
  const cSub = isDark ? '#9ca3b0' : '#4b5260';
  const cGrid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const cDots = isDark ? '#94A3B8' : '#6b7280';
  const [caseIds, setCaseIds] = useState([]);
  const [caseA, setCaseA] = useState(1);
  const [caseB, setCaseB] = useState(93);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('M');

  useEffect(() => { api.get('/api/case-ids').then(r => setCaseIds(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (caseA && caseB) api.get(`/api/parity/${caseA}/${caseB}`).then(r => setData(r.data)).catch(() => {});
  }, [caseA, caseB]);

  if (!data) return <div className="page"><p>{t('Loading...')}</p></div>;

  const tabs = [
    { key: 'M', label: '📐 Shaft Misalignment (M)', shortLabel: 'M', trueCol: 'Mtrue', predCol: 'Pred_M', tol: 6.0, unit: 'µm', fmt: 2, fullName: 'Shaft Misalignment (M)' },
    { key: 'STE', label: '⚙️ Transmission Error (STE)', shortLabel: 'STE', trueCol: 'TEtrue', predCol: 'Pred_STE', tol: 0.35, unit: 'µm', fmt: 3, fullName: 'Transmission Error (STE)' },
    { key: 'LW', label: '🔊 Radiated Noise Level (LW)', shortLabel: 'LW', trueCol: 'Sound', predCol: 'Pred_Sound', tol: 2.5, unit: 'dB', fmt: 2, fullName: 'Radiated Noise Level (LW)' },
  ];
  const cfg = tabs.find(t => t.key === activeTab);
  const allData = data.all_data;
  const a = data.case_a, b = data.case_b;

  const trueVals = allData.map(r => r[cfg.trueCol]);
  const predVals = allData.map(r => r[cfg.predCol]);
  const minV = Math.min(...trueVals, ...predVals) * 0.9;
  const maxV = Math.max(...trueVals, ...predVals) * 1.08;
  const line = Array.from({ length: 100 }, (_, i) => minV + (maxV - minV) * i / 99);

  const errA = Math.abs(a[cfg.predCol] - a[cfg.trueCol]);
  const errB = Math.abs(b[cfg.predCol] - b[cfg.trueCol]);
  const inZoneA = errA <= cfg.tol;
  const inZoneB = errB <= cfg.tol;
  const shift = b[cfg.predCol] - a[cfg.predCol];

  // Summary table rows for all 3 metrics
  const summaryRows = tabs.map(tb => {
    const eA = Math.abs(a[tb.predCol] - a[tb.trueCol]);
    const eB = Math.abs(b[tb.predCol] - b[tb.trueCol]);
    const designShift = b[tb.predCol] - a[tb.predCol];
    return {
      name: tb.fullName,
      unit: tb.unit,
      fmt: tb.fmt,
      trueA: a[tb.trueCol],
      predA: a[tb.predCol],
      errA: eA,
      trueB: b[tb.trueCol],
      predB: b[tb.predCol],
      errB: eB,
      shift: designShift,
    };
  });

  return (
    <div className="page">
      <h2>📈 {t('1:1 Parity Chart Comparison Between 2 Datasets')}</h2>
      <p className="subtitle">
        {t('Select two datasets below. Each tab displays a spacious')} <strong>{t('1:1 Parity Plot')}</strong> {t('with a')} <strong style={{ color: '#10B981' }}>{t('Green High-Accuracy Zone')}</strong> {t('on the left, paired with a')} <strong>{t('Direct Bar Comparison')}</strong> {t('on the right.')}
      </p>

      <div className="form-grid-2">
        <div className="form-section">
          <label>🔶 {t('Select Dataset A (Baseline / Reference)')}</label>
          <select value={caseA} onChange={e => setCaseA(+e.target.value)} className="sidebar-select">
            {caseIds.map(id => <option key={id} value={id}>Case #{id}</option>)}
          </select>
        </div>
        <div className="form-section">
          <label>⭐ {t('Select Dataset B (Comparison Variant)')}</label>
          <select value={caseB} onChange={e => setCaseB(+e.target.value)} className="sidebar-select">
            {caseIds.map(id => <option key={id} value={id}>Case #{id}</option>)}
          </select>
        </div>
      </div>

      <div className="tab-bar">
        {tabs.map(tb => (
          <button key={tb.key} className={activeTab === tb.key ? 'tab active' : 'tab'} onClick={() => setActiveTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      <div className="charts-row-2">
        <div className="chart-card">
          <div className="chart-title">🎯 {t('1:1 Parity Accuracy Plot')} — {cfg.fullName}</div>
          <div className="chart-sub">{t('Green Band = High Accuracy Zone')} (±{cfg.tol} {cfg.unit})</div>
          <Plot
            data={[
              { x: [...line, ...line.slice().reverse()], y: [...line.map(v => v + cfg.tol), ...line.slice().reverse().map(v => v - cfg.tol)],
                fill: 'toself', fillcolor: 'rgba(16,185,129,0.16)', line: { color: 'rgba(16,185,129,0.45)', width: 1, dash: 'dot' }, name: `Safe Zone (±${cfg.tol} ${cfg.unit})`, hoverinfo: 'skip' },
              { x: line, y: line, mode: 'lines', line: { color: cText, width: 2 }, name: '1:1 Ideal Line' },
              { x: trueVals, y: predVals, mode: 'markers', marker: { size: 7, color: cDots, opacity: 0.45 },
                text: allData.map(r => `Case #${r.id}`), hovertemplate: `<b>%{text}</b><br>True CAE: %{x:.${cfg.fmt}f} ${cfg.unit}<br>Predicted: %{y:.${cfg.fmt}f} ${cfg.unit}<extra></extra>`, name: `Other ${allData.length} Cases` },
              { x: [a[cfg.trueCol], b[cfg.trueCol]], y: [a[cfg.predCol], b[cfg.predCol]],
                mode: 'lines', line: { color: '#F97316', width: 2.5, dash: 'dash' }, name: `Shift (#${caseA} → #${caseB})` },
              { x: [a[cfg.trueCol]], y: [a[cfg.predCol]], mode: 'markers+text',
                marker: { size: 15, color: '#FACC15', symbol: 'diamond' }, text: [`#${caseA}(A)`], textposition: 'top right',
                textfont: { size: 11, color: '#FACC15' }, name: `Case #${caseA} (A)`, cliponaxis: false },
              { x: [b[cfg.trueCol]], y: [b[cfg.predCol]], mode: 'markers+text',
                marker: { size: 17, color: '#38BDF8', symbol: 'star' }, text: [`#${caseB}(B)`], textposition: 'bottom left',
                textfont: { size: 11, color: '#38BDF8' }, name: `Case #${caseB} (B)`, cliponaxis: false },
            ]}
            layout={{
              height: 420, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { title: { text: `True CAE [${cfg.unit}]`, font: { size: 11, color: cSub } }, range: [minV, maxV], tickfont: { size: 10, color: cSub }, gridcolor: cGrid },
              yaxis: { title: { text: `Predicted [${cfg.unit}]`, font: { size: 11, color: cSub } }, range: [minV, maxV], tickfont: { size: 10, color: cSub }, gridcolor: cGrid },
              legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 9, color: cText } },
              margin: { l: 50, r: 20, t: 15, b: 85 },
            }}
            config={{ displayModeBar: false }}
            useResizeHandler style={{ width: '100%' }}
          />
        </div>

        <div className="chart-card">
          <div className="chart-title">📊 {t('Direct A vs. B Value Comparison')}</div>
          <div className="chart-sub">Case #{caseA} (A) vs. Case #{caseB} (B)</div>
          <Plot
            data={[
              { name: t('Benchmark CAE'), x: [`Case #${caseA} (A)`, `Case #${caseB} (B)`], y: [a[cfg.trueCol], b[cfg.trueCol]],
                type: 'bar', marker: { color: '#3B82F6' }, text: [a[cfg.trueCol].toFixed(cfg.fmt), b[cfg.trueCol].toFixed(cfg.fmt)],
                textposition: 'outside', cliponaxis: false, textfont: { size: 11, color: cText } },
              { name: t('AI Predicted'), x: [`Case #${caseA} (A)`, `Case #${caseB} (B)`], y: [a[cfg.predCol], b[cfg.predCol]],
                type: 'bar', marker: { color: '#10B981' }, text: [a[cfg.predCol].toFixed(cfg.fmt), b[cfg.predCol].toFixed(cfg.fmt)],
                textposition: 'outside', cliponaxis: false, textfont: { size: 11, color: '#38BDF8' } },
            ]}
            layout={{
              barmode: 'group', height: 420,
              paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { tickfont: { size: 11, color: cText } },
              yaxis: { title: { text: `[${cfg.unit}]`, font: { size: 11, color: cSub } }, range: [0, Math.max(a[cfg.trueCol], b[cfg.trueCol], a[cfg.predCol], b[cfg.predCol]) * 1.35],
                tickfont: { size: 10, color: cSub }, gridcolor: cGrid },
              legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { size: 10, color: cText } },
              margin: { l: 50, r: 20, t: 15, b: 85 },
            }}
            config={{ displayModeBar: false }}
            useResizeHandler style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Executive Summary */}
      <div className="exec-summary-box">
        <div className="exec-summary-title">💡 {t('Executive Summary')} ({cfg.fullName}):</div>
        <ul className="exec-summary-list">
          <li>
            <strong>Case #{caseA} (A):</strong> {t('Model error is')} <code>{errA.toFixed(cfg.fmt)}</code> {cfg.unit} → {inZoneA
              ? <span className="zone-pass">✅ {t('Inside Green High-Accuracy Zone')}</span>
              : <span className="zone-fail">⚠️ {t('Outside High-Accuracy Zone')}</span>}
          </li>
          <li>
            <strong>Case #{caseB} (B):</strong> {t('Model error is')} <code>{errB.toFixed(cfg.fmt)}</code> {cfg.unit} → {inZoneB
              ? <span className="zone-pass">✅ {t('Inside Green High-Accuracy Zone')}</span>
              : <span className="zone-fail">⚠️ {t('Outside High-Accuracy Zone')}</span>}
          </li>
          <li>
            <strong>{t('Net Design Change (A → B)')}:</strong> <code>{shift >= 0 ? '+' : ''}{shift.toFixed(cfg.fmt)}</code> {cfg.unit}
          </li>
        </ul>
      </div>

      {/* Complete Summary Table */}
      <h2 style={{ marginTop: '2.5rem' }}>📋 {t('Complete 2-Dataset Parity & Residual Summary Table')}</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>{t('NVH Target Metric')}</th>
              <th>Case #{caseA} {t('True CAE')}</th>
              <th>Case #{caseA} {t('Predicted')}</th>
              <th>Case #{caseA} {t('Error')} (Δ)</th>
              <th>Case #{caseB} {t('True CAE')}</th>
              <th>Case #{caseB} {t('Predicted')}</th>
              <th>Case #{caseB} {t('Error')} (Δ)</th>
              <th>{t('Design Shift (B - A)')}</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, idx) => {
              const shiftStr = `${row.shift >= 0 ? '+' : ''}${row.shift.toFixed(row.fmt)} ${row.unit}`;
              return (
                <tr key={idx}>
                  <td>{idx}</td>
                  <td><strong>{row.name} [{row.unit}]</strong></td>
                  <td>{row.trueA.toFixed(row.fmt)}</td>
                  <td>{row.predA.toFixed(row.fmt)}</td>
                  <td style={{ color: row.errA <= tabs[idx].tol ? '#10B981' : '#F59E0B' }}>
                    {row.errA >= 0 ? '+' : ''}{(a[tabs[idx].predCol] - a[tabs[idx].trueCol]).toFixed(row.fmt)}
                  </td>
                  <td>{row.trueB.toFixed(row.fmt)}</td>
                  <td>{row.predB.toFixed(row.fmt)}</td>
                  <td style={{ color: row.errB <= tabs[idx].tol ? '#10B981' : '#F59E0B' }}>
                    {(b[tabs[idx].predCol] - b[tabs[idx].trueCol]) >= 0 ? '+' : ''}{(b[tabs[idx].predCol] - b[tabs[idx].trueCol]).toFixed(row.fmt)}
                  </td>
                  <td><strong>{shiftStr}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}