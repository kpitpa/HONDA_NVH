import { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useApp } from '../context/AppContext';
import { useTranslate } from '../i18n';
import api from '../api';

export default function MultiComparePage() {
  const { theme } = useApp();
  const t = useTranslate();
  const isDark = theme === 'dark';
  const cText = isDark ? '#eaecf0' : '#1a1d24';
  const cSub = isDark ? '#9ca3b0' : '#4b5260';
  const cGrid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const [casesMeta, setCasesMeta] = useState([]);
  const [hoveredCase, setHoveredCase] = useState(null);
  const [selected, setSelected] = useState([1, 22, 93]);
  const [data, setData] = useState(null);
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'best' | 'worst'

  useEffect(() => {
    api.get('/api/case-ids')
      .then(r => {
        if (Array.isArray(r.data)) {
          if (r.data.length && typeof r.data[0] === 'object') {
            setCasesMeta(r.data);
          } else {
            setCasesMeta(r.data.map(id => ({ id, tier: 'nominal' })));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selected.length >= 2) {
      api.get(`/api/multi-compare?ids=${selected.join(',')}`).then(r => setData(r.data)).catch(() => {});
    }
  }, [selected]);

  const toggleId = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const filteredCases = useMemo(() => {
    if (tierFilter === 'best') return casesMeta.filter(c => c.tier === 'best');
    if (tierFilter === 'worst') return casesMeta.filter(c => c.tier === 'worst');
    return casesMeta;
  }, [casesMeta, tierFilter]);

  const charts = [
    { title: '📐 M [µm]', trueCol: 'Mtrue', predCol: 'Pred_M', unit: 'µm', fmt: 1 },
    { title: '⚙️ STE [µm]', trueCol: 'TEtrue', predCol: 'Pred_STE', unit: 'µm', fmt: 2 },
    { title: '🔊 LW [dB]', trueCol: 'Sound', predCol: 'Pred_Sound', unit: 'dB', fmt: 1 },
  ];

  const matrixRows = [
    ['Normal Module (mn)', 'mn', 'mm', 2, null],
    ['Pinion Teeth (z1)', 'z1', 'teeth', 0, null],
    ['Wheel Teeth (z2)', 'z2', 'teeth', 0, null],
    ['Gear Ratio (i)', 'i', 'ratio', 2, null],
    ['Helix Angle (β)', 'beta', 'deg', 1, null],
    ['Face Width (b)', 'b', 'mm', 1, null],
    ['Torque (T1)', 'T1', 'Nm', 1, null],
    ['Speed (n1)', 'n1', 'rpm', 0, null],
    ['Tip Relief (Cα)', 'Calpha', 'µm', 1, null],
    ['Flank Crowning (Cβ)', 'Cbeta', 'µm', 1, null],
    ['ISO Quality Grade (Q)', 'Q', 'grade', 0, null],
    ['Tangential Force (Ft)', 'Ft_N', 'N', 1, null],
    ['Specific Line Load (wt)', 'wt_N_per_mm', 'N/mm', 1, null],
    ['Mesh Frequency (fm)', 'fm_Hz', 'Hz', 1, null],
    ['True CAE Misalignment', 'Mtrue', 'µm', 2, 'min'],
    ['Predicted Misalignment (M)', 'Pred_M', 'µm', 2, 'min'],
    ['True CAE Trans. Error', 'TEtrue', 'µm', 3, 'min'],
    ['Predicted Trans. Error (STE)', 'Pred_STE', 'µm', 3, 'min'],
    ['True CAE Sound Level', 'Sound', 'dB', 2, 'min'],
    ['Predicted Sound Level (LW)', 'Pred_Sound', 'dB', 2, 'min'],
  ];

  const getBest = (col, fmt, unit, mode) => {
    if (!mode || !data || data.length < 2) return '—';
    const vals = data.map(r => ({ v: r[col], id: r.id })).filter(x => x.v != null);
    if (!vals.length) return '—';
    const best = mode === 'min' ? vals.reduce((a, b) => a.v < b.v ? a : b) : vals.reduce((a, b) => a.v > b.v ? a : b);
    return `🏆 Case #${best.id} (${Number(best.v).toFixed(fmt)} ${unit})`;
  };

  const exportComparisonExcel = async () => {
    try {
      const r = await api.get(`/api/export/multi-compare-excel?ids=${selected.join(',')}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = 'HONDA_NVH_COMPARISON_MATRIX.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="page">
      <h2>📊 {t('Multi-Dataset Comparison')}</h2>
      <p className="subtitle">{t('Select 2–4 datasets to compare:')}</p>

      {/* FILTER & LEGEND TOOLBAR */}
      <div className="chip-filter-bar">
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {t('Filter Cases')}:
        </span>
        <button
          className={`chip-filter-btn ${tierFilter === 'all' ? 'active' : ''}`}
          onClick={() => setTierFilter('all')}
        >
          {t('All Datasets')} ({casesMeta.length})
        </button>
        <button
          className={`chip-filter-btn ${tierFilter === 'best' ? 'active' : ''}`}
          onClick={() => setTierFilter('best')}
          style={{ borderColor: 'rgba(34, 197, 94, 0.5)', color: tierFilter === 'best' ? 'white' : '#4ade80' }}
        >
          🏆 {t('Best Performers')} ({casesMeta.filter(c => c.tier === 'best').length})
        </button>
        <button
          className={`chip-filter-btn ${tierFilter === 'worst' ? 'active' : ''}`}
          onClick={() => setTierFilter('worst')}
          style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: tierFilter === 'worst' ? 'white' : '#f87171' }}
        >
          ⚠️ {t('High NVH / Outliers')} ({casesMeta.filter(c => c.tier === 'worst').length})
        </button>
      </div>

      {/* CHIP SELECTION GRID */}
      <div className="multi-select-grid">
        {filteredCases.map(item => {
          const cid = item.id;
          const isSelected = selected.includes(cid);
          const isHovered = hoveredCase?.id === cid;
          const tierClass = item.tier === 'best' ? 'tier-best' : item.tier === 'worst' ? 'tier-worst' : '';

          return (
            <div
              key={cid}
              className="chip-wrapper"
              onMouseEnter={() => setHoveredCase(item)}
              onMouseLeave={() => setHoveredCase(null)}
            >
              <button
                className={`chip ${tierClass} ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleId(cid)}
              >
                #{cid} {item.tier === 'best' ? '★' : ''}
              </button>

              {isHovered && item.mn !== undefined && (
                <div className="chip-tooltip">
                  <div className="chip-tooltip-title">
                    Case #{cid} {t('Specs')} {item.tier === 'best' ? '• 🏆 Best' : item.tier === 'worst' ? '• ⚠️ High NVH' : ''}
                  </div>
                  <div className="chip-tooltip-grid">
                    <div>mn: <b>{item.mn} mm</b></div>
                    <div>β: <b>{item.beta}°</b></div>
                    <div>z1/z2: <b>{item.z1}/{item.z2}</b></div>
                    <div>b: <b>{item.b} mm</b></div>
                    <div>T1: <b>{item.T1} Nm</b></div>
                    <div>n1: <b>{item.n1} rpm</b></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length < 2 && <div className="warning-box">⚠️ {t('Select at least 2')}</div>}

      {data && data.length >= 2 && (
        <>
          <div className="charts-row">
            {charts.map(ch => {
              const labels = data.map(r => `#${r.id}`);
              const yMax = Math.max(...data.map(r => Math.max(r[ch.trueCol], r[ch.predCol]))) * 1.35;
              return (
                <div className="chart-card" key={ch.trueCol}>
                  <div className="chart-title">{ch.title}</div>
                  <Plot
                    data={[
                      { name: t('CAE'), x: labels, y: data.map(r => r[ch.trueCol]), type: 'bar',
                        marker: { color: '#3B82F6' }, text: data.map(r => r[ch.trueCol].toFixed(ch.fmt)),
                        textposition: 'outside', cliponaxis: false, textfont: { size: 10, color: cText } },
                      { name: t('AI'), x: labels, y: data.map(r => r[ch.predCol]), type: 'bar',
                        marker: { color: '#10B981' }, text: data.map(r => r[ch.predCol].toFixed(ch.fmt)),
                        textposition: 'outside', cliponaxis: false, textfont: { size: 10, color: cText } },
                    ]}
                    layout={{
                      barmode: 'group', height: 340,
                      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
                      xaxis: { tickfont: { size: 11, color: cText } },
                      yaxis: { title: { text: ch.unit, font: { size: 11, color: cSub } }, range: [0, yMax],
                        tickfont: { size: 10, color: cSub }, gridcolor: cGrid },
                      legend: { orientation: 'h', y: -0.18, x: 0.5, xanchor: 'center', font: { size: 10, color: cText } },
                      margin: { l: 40, r: 15, t: 25, b: 65 },
                    }}
                    config={{ displayModeBar: false }}
                    useResizeHandler style={{ width: '100%' }}
                  />
                </div>
              );
            })}
          </div>

          <hr />
          <h2>📋 {t('Multi-Dataset Engineering Specification & NVH Matrix')}</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>{t('Parameter / Metric')}</th>
                  <th>{t('Unit')}</th>
                  {data.map(r => <th key={r.id}>Case #{r.id}</th>)}
                  <th>{t('Best Performing Case')}</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map(([name, col, unit, fmt, bestMode], idx) => (
                  <tr key={col}>
                    <td>{idx}</td>
                    <td>{t(name)}</td>
                    <td>{unit}</td>
                    {data.map(r => <td key={r.id}>{r[col] != null ? Number(r[col]).toFixed(fmt) : '—'}</td>)}
                    <td>{getBest(col, fmt, unit, bestMode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="btn-row" style={{ marginTop: '1.5rem' }}>
            <button className="export-btn" onClick={exportComparisonExcel}>📊 {t('Download Comparison Matrix (Excel .xlsx)')}</button>
          </div>
        </>
      )}
    </div>
  );
}