import { useState, useEffect, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useApp } from '../context/AppContext';
import { useTranslate } from '../i18n';
import api from '../api';
import MetricCard from '../components/MetricCard';

function useChartColors() {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  return {
    text: isDark ? '#eaecf0' : '#1a1d24',
    sub: isDark ? '#9ca3b0' : '#4b5260',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  };
}

function BarChart({ labels, values, colors, texts, yTitle, height = 310 }) {
  const c = useChartColors();
  return (
    <Plot
      data={[{
        x: labels, y: values, type: 'bar',
        marker: { color: colors },
        text: texts, textposition: 'outside', cliponaxis: false,
        textfont: { size: 12, color: c.text },
      }]}
      layout={{
        height, showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { tickfont: { size: 11, color: c.text }, automargin: true },
        yaxis: { title: { text: yTitle, font: { size: 11, color: c.sub } },
          range: [0, Math.max(...values) * 1.35],
          tickfont: { size: 10, color: c.sub }, gridcolor: c.grid, automargin: true },
        margin: { l: 40, r: 15, t: 25, b: 35 },
      }}
      config={{ displayModeBar: false }}
      useResizeHandler style={{ width: '100%' }}
    />
  );
}

export default function MainWorkspace() {
  const { scenarioIdx, inputParams, setInputParams, actualTargets, setActualTargets, refreshCaseIds } = useApp();
  const t = useTranslate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingCase, setSavingCase] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sensitivity state
  const [deltaM, setDeltaM] = useState(2.0);
  const [deltaTE, setDeltaTE] = useState(0.10);
  const [deltaSound, setDeltaSound] = useState(1.0);
  const [sensData, setSensData] = useState(null);
  const [sensLoading, setSensLoading] = useState(false);

  // Optimization state
  const [targetM, setTargetM] = useState(35.0);
  const [targetTE, setTargetTE] = useState(1.10);
  const [targetSound, setTargetSound] = useState(54.0);
  const [optResult, setOptResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);

  const [activeOptTab, setActiveOptTab] = useState('sensitivity');

  const params = inputParams;
  const calcRatio = (params.z2 / params.z1).toFixed(2);

  const updateParam = (key, val) => setInputParams(p => ({ ...p, [key]: val }));

  const runPrediction = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.post('/api/predict', {
        ...params, i: parseFloat(calcRatio),
        template_id: actualTargets?.id || 1,
      });
      setPrediction(r.data);
    } catch {} finally { setLoading(false); }
  }, [params, actualTargets]);

  useEffect(() => { runPrediction(); }, [runPrediction]);

  const runSensitivity = async () => {
    setSensLoading(true);
    try {
      const r = await api.post('/api/sensitivity', {
        inputs: { ...params, i: parseFloat(calcRatio), template_id: actualTargets?.id || 1 },
        delta_M: deltaM, delta_TE: deltaTE, delta_Sound: deltaSound,
      });
      setSensData(r.data);
    } catch {} finally { setSensLoading(false); }
  };

  const runOptimization = async () => {
    setOptLoading(true);
    try {
      const r = await api.post('/api/optimize', { target_M: targetM, target_TE: targetTE, target_Sound: targetSound });
      setOptResult(r.data);
    } catch {} finally { setOptLoading(false); }
  };

  const exportJSON = async () => {
    try {
      const r = await api.post('/api/export/json', { ...params, i: parseFloat(calcRatio), template_id: actualTargets?.id });
      const blob = new Blob([JSON.stringify(r.data, null, 4)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'HONDA_NVH_CAE_SIGNOFF_DECK.json'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const exportExcel = async () => {
    try {
      const r = await api.post('/api/export/excel', {
        ...params, i: parseFloat(calcRatio), template_id: actualTargets?.id,
      }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a'); a.href = url; a.download = 'HONDA_NVH_OUTPUT_REPORT.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const saveAsBenchmark = async () => {
    setSavingCase(true);
    setSaveSuccessMsg('');
    try {
      const res = await api.post('/api/case/add', {
        params: { ...params, i: parseFloat(calcRatio), template_id: actualTargets?.id || 1 },
        targets: prediction ? {
          Mtrue: prediction.M,
          TEtrue: prediction.STE,
          Sound: prediction.Sound,
        } : null,
      });
      if (res.data.status === 'success') {
        setSaveSuccessMsg(`✅ ${res.data.message}! Case #${res.data.id} is now permanently saved.`);
        if (setActualTargets && res.data.case?.targets) {
          setActualTargets(res.data.case.targets);
        }
        if (refreshCaseIds) {
          await refreshCaseIds();
        }
        setTimeout(() => setSaveSuccessMsg(''), 6000);
      }
    } catch {
      setSaveSuccessMsg('❌ Failed to save new benchmark case.');
    } finally {
      setSavingCase(false);
    }
  };

  if (scenarioIdx === 0) {
    const m = prediction?.M ?? 0;
    const te = prediction?.STE ?? 0;
    const s = prediction?.Sound ?? 0;
    const phys = prediction?.physics ?? {};
    const mPass = m >= 20 && m <= 100;
    const tePass = te >= 0.5 && te <= 2.5;
    const sPass = s >= 50 && s <= 70;
    const tM = actualTargets?.Mtrue ?? 0;
    const tTE = actualTargets?.TEtrue ?? 0;
    const tS = actualTargets?.Sound ?? 0;
    const diffM = m - tM, diffTE = te - tTE, diffS = s - tS;
    const pctM = tM ? (diffM / tM * 100) : 0;
    const pctTE = tTE ? (diffTE / tTE * 100) : 0;
    const pctS = tS ? (diffS / tS * 100) : 0;
    const barLabels = [t('CAE True'), t('AI Model')];

    return (
      <div className="page">
        <h2>📊 {t('Forward Design Verification')}</h2>
        <p className="subtitle">{t('Enter gear geometry and load parameters:')}</p>

        <div className="form-grid-3">
          <div className="form-section">
            <h3>📐 {t('Macro-Geometry')}</h3>
            <label>{t('Normal Module mn [mm]')}</label>
            <input type="number" value={params.mn} step={0.01} onChange={e => updateParam('mn', +e.target.value)} />
            <label>{t('Pinion Teeth z1')}</label>
            <input type="number" value={params.z1} step={1} onChange={e => updateParam('z1', +e.target.value)} />
            <label>{t('Wheel Teeth z2')}</label>
            <input type="number" value={params.z2} step={1} onChange={e => updateParam('z2', +e.target.value)} />
            <div className="info-box">⚙️ {t('Gear Ratio')}: <b>{calcRatio} : 1</b></div>
            <label>{t('Helix Angle β [deg]')}</label>
            <input type="number" value={params.beta} step={0.1} onChange={e => updateParam('beta', +e.target.value)} />
            <label>{t('Face Width b [mm]')}</label>
            <input type="number" value={params.b} step={0.5} onChange={e => updateParam('b', +e.target.value)} />
          </div>
          <div className="form-section">
            <h3>⚡ {t('Operating Loads')}</h3>
            <label>{t('Torque T1 [Nm]')}</label>
            <input type="number" value={params.T1} step={0.5} onChange={e => updateParam('T1', +e.target.value)} />
            <label>{t('Speed n1 [rpm]')}</label>
            <input type="number" value={params.n1} step={50} onChange={e => updateParam('n1', +e.target.value)} />
            <label>{t('Application Factor KA')}</label>
            <input type="number" value={params.K_A} step={0.01} onChange={e => updateParam('K_A', +e.target.value)} />
          </div>
          <div className="form-section">
            <h3>🛠️ {t('Micro-Geometry & Quality')}</h3>
            <label>{t('Tip Relief Cα [µm]')}</label>
            <input type="number" value={params.Calpha} step={0.5} onChange={e => updateParam('Calpha', +e.target.value)} />
            <label>{t('Flank Crowning Cβ [µm]')}</label>
            <input type="number" value={params.Cbeta} step={0.5} onChange={e => updateParam('Cbeta', +e.target.value)} />
            <label>{t('ISO Quality Grade Q')}</label>
            <select value={params.Q} onChange={e => updateParam('Q', +e.target.value)}>
              {[4,5,6,7,8,9,10].map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <hr />
        <h2>🎯 {t('Predicted NVH Metrics')}</h2>
        {loading ? <p>Loading...</p> : (
          <>
            <div className="metrics-row">
              <MetricCard label={t('Shaft Misalignment (M)')} value={m.toFixed(2)} unit="µm" pass={mPass} range="20–100 µm" />
              <MetricCard label={t('Transmission Error (STE)')} value={te.toFixed(3)} unit="µm" pass={tePass} range="0.5–2.5 µm" />
              <MetricCard label={t('Radiated Noise (LW)')} value={s.toFixed(2)} unit="dB" pass={sPass} range="50–70 dB" />
            </div>

            <hr />
            <h2>📈 {t('Model Accuracy: CAE vs AI')}</h2>
            <p className="subtitle">📌 {t(`Benchmark Case #${actualTargets?.id}`)}</p>

            <div className="charts-row">
              <div className="chart-card">
                <div className="chart-title">📐 {t('Misalignment (M)')}</div>
                <div className="chart-sub">Δ: <b>{diffM >= 0 ? '+' : ''}{diffM.toFixed(2)} µm</b> ({pctM >= 0 ? '+' : ''}{pctM.toFixed(1)}%)</div>
                <BarChart labels={barLabels} values={[tM, m]} colors={['#3B82F6','#38BDF8']}
                  texts={[`${tM.toFixed(2)} µm`, `${m.toFixed(2)} µm`]} yTitle="Misalignment [µm]" />
              </div>
              <div className="chart-card">
                <div className="chart-title">⚙️ {t('Trans. Error (STE)')}</div>
                <div className="chart-sub">Δ: <b>{diffTE >= 0 ? '+' : ''}{diffTE.toFixed(3)} µm</b> ({pctTE >= 0 ? '+' : ''}{pctTE.toFixed(1)}%)</div>
                <BarChart labels={barLabels} values={[tTE, te]} colors={['#10B981','#34D399']}
                  texts={[`${tTE.toFixed(3)} µm`, `${te.toFixed(3)} µm`]} yTitle="STE [µm]" />
              </div>
              <div className="chart-card">
                <div className="chart-title">🔊 {t('Noise (LW)')}</div>
                <div className="chart-sub">Δ: <b>{diffS >= 0 ? '+' : ''}{diffS.toFixed(2)} dB</b> ({pctS >= 0 ? '+' : ''}{pctS.toFixed(1)}%)</div>
                <BarChart labels={barLabels} values={[tS, s]} colors={['#8B5CF6','#C084FC']}
                  texts={[`${tS.toFixed(2)} dB`, `${s.toFixed(2)} dB`]} yTitle="Noise [dB]" />
              </div>
            </div>

            <hr />
            <h2>📋 {t('Output Summary Table (Engineering Report Format)')}</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>{t('Parameter Classification')}</th>
                    <th>{t('Engineering Parameter')}</th>
                    <th>{t('Benchmark CAE Value')}</th>
                    <th>{t('Model Predicted Value')}</th>
                    <th>{t('Difference')} (Δ)</th>
                    <th>{t('Relative Deviation')} (%)</th>
                    <th>{t('Unit')}</th>
                    <th>{t('Design Feasibility')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0</td>
                    <td>{t('Vibration & Acoustic Response')}</td>
                    <td>{t('Shaft Misalignment')} (M)</td>
                    <td>{tM.toFixed(2)}</td><td>{m.toFixed(2)}</td>
                    <td>{diffM.toFixed(2)}</td>
                    <td>{Math.abs(pctM).toFixed(2)}%</td>
                    <td>µm</td>
                    <td>{mPass ? '✅ Within Tolerance' : '❌ Out of Tolerance'}</td>
                  </tr>
                  <tr>
                    <td>1</td>
                    <td>{t('Vibration & Acoustic Response')}</td>
                    <td>{t('Dynamic Transmission Error')} (STE)</td>
                    <td>{tTE.toFixed(3)}</td><td>{te.toFixed(3)}</td>
                    <td>{diffTE >= 0 ? '+' : ''}{diffTE.toFixed(3)}</td>
                    <td>{Math.abs(pctTE).toFixed(2)}%</td>
                    <td>µm</td>
                    <td>{tePass ? '✅ Within Tolerance' : '❌ Out of Tolerance'}</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>{t('Vibration & Acoustic Response')}</td>
                    <td>{t('Radiated Noise Level')} (LW)</td>
                    <td>{tS.toFixed(2)}</td><td>{s.toFixed(2)}</td>
                    <td>{diffS >= 0 ? '+' : ''}{diffS.toFixed(2)}</td>
                    <td>{Math.abs(pctS).toFixed(2)}%</td>
                    <td>dB</td>
                    <td>{sPass ? '✅ Within Tolerance' : '❌ Out of Tolerance'}</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>{t('Calculated Machine Element Properties')}</td>
                    <td>{t('Pinion Pitch Diameter')} (d1)</td>
                    <td>{(phys.d1_mm??0).toFixed(2)}</td><td>{(phys.d1_mm??0).toFixed(2)}</td>
                    <td>0.00</td><td>0.00%</td><td>mm</td>
                    <td>{t('Reference Parameter')}</td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>{t('Calculated Machine Element Properties')}</td>
                    <td>{t('Shaft Center Distance')} (a)</td>
                    <td>{(phys.a??0).toFixed(2)}</td><td>{(phys.a??0).toFixed(2)}</td>
                    <td>0.00</td><td>0.00%</td><td>mm</td>
                    <td>{t('Reference Parameter')}</td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>{t('Calculated Machine Element Properties')}</td>
                    <td>{t('Tangential Tooth Contact Force')} (Ft)</td>
                    <td>{(phys.Ft_N??0).toFixed(2)}</td><td>{(phys.Ft_N??0).toFixed(2)}</td>
                    <td>0.00</td><td>0.00%</td><td>N</td>
                    <td>{t('Reference Parameter')}</td>
                  </tr>
                  <tr>
                    <td>6</td>
                    <td>{t('Calculated Machine Element Properties')}</td>
                    <td>{t('Specific Tooth Load')} (wt)</td>
                    <td>{(phys.wt_N_per_mm??0).toFixed(2)}</td><td>{(phys.wt_N_per_mm??0).toFixed(2)}</td>
                    <td>0.00</td><td>0.00%</td><td>N/mm</td>
                    <td>{t('Reference Parameter')}</td>
                  </tr>
                  <tr>
                    <td>7</td>
                    <td>{t('Calculated Machine Element Properties')}</td>
                    <td>{t('Tooth Meshing Frequency')} (fm)</td>
                    <td>{(phys.fm_Hz??0).toFixed(1)}</td><td>{(phys.fm_Hz??0).toFixed(1)}</td>
                    <td>0.0</td><td>0.00%</td><td>Hz</td>
                    <td>{t('Reference Parameter')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr />
            <h2>📥 {t('Export Engineering Reports & Benchmark Archival')}</h2>
            {saveSuccessMsg && <div className="success-box">{saveSuccessMsg}</div>}
            <div className="btn-row">
              <button className="export-btn" onClick={exportJSON}>💾 {t('Download CAE Sign-Off Deck (JSON)')}</button>
              <button className="export-btn" onClick={exportExcel}>📊 {t('Download Output Report (Excel .xlsx)')}</button>
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={saveAsBenchmark} disabled={savingCase}>
                ➕ {savingCase ? t('Saving...') : t('Save as Benchmark Case')}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // === Scenario 1: Optimization Mode ===
  const optParamLabels = {
    'mn': 'Normal Module (mn)',
    'z1': 'Pinion Teeth (z1)',
    'z2': 'Wheel Teeth (z2)',
    'beta': 'Helix Angle (β)',
    'b': 'Face Width (b)',
    'T1': 'Input Torque (T1)',
    'n1': 'Speed (n1)',
    'Calpha': 'Tip Relief (Cα)',
    'Cbeta': 'Flank Crowning (Cβ)',
    'Q': 'ISO Quality Grade (Q)',
    'K_A': 'Application Factor (KA)',
    'i': 'Gear Ratio (i)',
  };

  const optParamUnits = {
    'mn': 'mm', 'z1': 'teeth', 'z2': 'teeth', 'beta': 'deg', 'b': 'mm',
    'T1': 'Nm', 'n1': 'rpm', 'Calpha': 'µm', 'Cbeta': 'µm', 'Q': '', 'K_A': '', 'i': '',
  };

  return (
    <div className="page">
      <h2>🎯 {t('Target Optimization Mode: Gear Design Synthesis & Sensitivity Analysis')}</h2>
      <p className="subtitle">{t('Analyze parameter sensitivities to NVH targets or synthesize gear geometry directly from desired NVH performance values.')}</p>

      <div className="tab-bar">
        <button className={activeOptTab === 'sensitivity' ? 'tab active' : 'tab'} onClick={() => setActiveOptTab('sensitivity')}>
          📊 {t('Sensitivity Analysis & Trade-Offs')}
        </button>
        <button className={activeOptTab === 'synthesis' ? 'tab active' : 'tab'} onClick={() => setActiveOptTab('synthesis')}>
          📐 {t('Direct Gear Synthesis (Target NVH → Gear Design)')}
        </button>
      </div>

      {activeOptTab === 'sensitivity' && (
        <div>
          <h3>🧮 {t('Sensitivity Analysis & Parameter Trade-Off Matrix')}</h3>
          <p className="subtitle">{t('Specify desired target shifts (ΔM, ΔSTE, ΔLW) to calculate the precise input parameter changes required.')}</p>

          {sensData && (
            <div className="baseline-cards-row">
              <div className="baseline-card baseline-m">
                <span className="baseline-icon">📍</span>
                <span>{t('Baseline Misalignment (M)')}: <strong>{sensData.baseline.M} µm</strong></span>
              </div>
              <div className="baseline-card baseline-ste">
                <span className="baseline-icon">📍</span>
                <span>{t('Baseline STE')}: <strong>{sensData.baseline.STE} µm</strong></span>
              </div>
              <div className="baseline-card baseline-lw">
                <span className="baseline-icon">📍</span>
                <span>{t('Baseline Noise (LW)')}: <strong>{sensData.baseline.Sound} dB</strong></span>
              </div>
            </div>
          )}

          <div className="form-grid-3" style={{ marginTop: '1.5rem' }}>
            <div className="form-section">
              <label>{t('Target Misalignment Delta (ΔM) [µm]')}</label>
              <div className="stepper-input">
                <button className="stepper-btn" onClick={() => setDeltaM(v => Math.max(0.5, v - 0.5))}>−</button>
                <input type="number" value={deltaM} step={0.5} onChange={e => setDeltaM(+e.target.value)} />
                <button className="stepper-btn" onClick={() => setDeltaM(v => v + 0.5)}>+</button>
              </div>
            </div>
            <div className="form-section">
              <label>{t('Target STE Delta (ΔSTE) [µm]')}</label>
              <div className="stepper-input">
                <button className="stepper-btn" onClick={() => setDeltaTE(v => Math.max(0.01, +(v - 0.02).toFixed(3)))}>−</button>
                <input type="number" value={deltaTE} step={0.02} onChange={e => setDeltaTE(+e.target.value)} />
                <button className="stepper-btn" onClick={() => setDeltaTE(v => +(v + 0.02).toFixed(3))}>+</button>
              </div>
            </div>
            <div className="form-section">
              <label>{t('Target Noise Delta (ΔLW) [dB]')}</label>
              <div className="stepper-input">
                <button className="stepper-btn" onClick={() => setDeltaSound(v => Math.max(0.2, +(v - 0.2).toFixed(2)))}>−</button>
                <input type="number" value={deltaSound} step={0.2} onChange={e => setDeltaSound(+e.target.value)} />
                <button className="stepper-btn" onClick={() => setDeltaSound(v => +(v + 0.2).toFixed(2))}>+</button>
              </div>
            </div>
          </div>
          <button className="primary-btn" onClick={runSensitivity} disabled={sensLoading}>
            🔄 {sensLoading ? t('Computing Sensitivities...') : t('Run Sensitivity Analysis')}
          </button>

          {sensData && (
            <>
              {/* TABLE 1: TOP PRIORITY ACTION RECOMMENDATION TABLE (ALL 12 INPUT PARAMETERS) */}
              <h3 style={{ marginTop: '2rem' }}>
                📋 {t('Required Design Parameter Adjustments for Target Shift (Top Recommendations)')}
              </h3>
              <p className="subtitle">
                {t('Recommended changes across all 12 input parameters to satisfy target shifts:')}
              </p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('Design Parameter')}</th>
                      <th>{t('Baseline Value')}</th>
                      <th>{t('Target Addressed')}</th>
                      <th>{t('Required Shift')} (Δ)</th>
                      <th>{t('Change')} (%)</th>
                      <th>{t('Target Value After Shift')}</th>
                      <th>{t('Design Feasibility')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensData.action_rows.map((r, i) => {
                      const hasShift = r.req_shift !== null;
                      const sign = r.req_shift >= 0 ? '+' : '';
                      const pctSign = r.pct_change >= 0 ? '+' : '';
                      return (
                        <tr key={r.key}>
                          <td>{i}</td>
                          <td><strong>{t(r.param)}</strong></td>
                          <td>{r.current} {r.unit}</td>
                          <td><code>{r.target_metric}</code></td>
                          <td style={{ color: hasShift ? (r.req_shift > 0 ? '#38BDF8' : '#F59E0B') : 'var(--text-muted)' }}>
                            {hasShift ? `${sign}${r.req_shift} ${r.unit}` : '—'}
                          </td>
                          <td style={{ color: hasShift ? (r.pct_change > 0 ? '#38BDF8' : '#F59E0B') : 'var(--text-muted)' }}>
                            {hasShift ? `${pctSign}${r.pct_change}%` : '0.00%'}
                          </td>
                          <td>
                            <strong>{r.new_value} {r.unit}</strong>
                          </td>
                          <td>
                            {r.feasible ? (
                              <span style={{ color: '#10B981', fontWeight: 600 }}>✅ {t('Feasible')}</span>
                            ) : (
                              <span style={{ color: '#EF4444', fontWeight: 600 }}>⚠️ {t('Exceeds Bounds')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TABLE 2: COMPLETE 12-PARAMETER PARTIAL DERIVATIVE SENSITIVITY MATRIX */}
              <h3 style={{ marginTop: '2.5rem' }}>
                🧮 {t('Full 12-Parameter Partial Derivative & Shift Matrix (Engineering Reference)')}
              </h3>
              <p className="subtitle">
                {t('Detailed sensitivity derivatives (∂Y/∂X) and exact shifts required for each target individually:')}
              </p>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('Gear Parameter')}</th>
                      <th>{t('Current Value')}</th>
                      <th>{t('Sensitivity to M')}</th>
                      <th>{t('Req. Shift for ΔM')}</th>
                      <th>{t('Sensitivity to STE')}</th>
                      <th>{t('Req. Shift for ΔSTE')}</th>
                      <th>{t('Sensitivity to Noise')}</th>
                      <th>{t('Req. Shift for ΔNoise')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensData.matrix_rows.map((r, i) => (
                      <tr key={r.key}>
                        <td>{i}</td>
                        <td><strong>{t(r.param)}</strong></td>
                        <td>{r.current} {r.unit}</td>
                        <td>{r.sens_M >= 0 ? '+' : ''}{r.sens_M.toFixed(3)} µm/{r.unit || 'unit'}</td>
                        <td>{r.req_M != null ? `${r.req_M >= 0 ? '+' : ''}${r.req_M} ${r.unit}` : 'N/A'}</td>
                        <td>{r.sens_TE >= 0 ? '+' : ''}{r.sens_TE.toFixed(3)} µm/{r.unit || 'unit'}</td>
                        <td>{r.req_TE != null ? `${r.req_TE >= 0 ? '+' : ''}${r.req_TE} ${r.unit}` : 'N/A'}</td>
                        <td>{r.sens_Sound >= 0 ? '+' : ''}{r.sens_Sound.toFixed(3)} dB/{r.unit || 'unit'}</td>
                        <td>{r.req_Sound != null ? `${r.req_Sound >= 0 ? '+' : ''}${r.req_Sound} ${r.unit}` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="guide-note" style={{ marginTop: '1.5rem' }}>
                <strong>💡 {t('How to read this table')}:</strong> {t('"Sensitivity to M" shows how much M changes per unit change in that parameter (∂M/∂p). "Req. Shift for ΔM" shows how much that parameter must change to achieve your target ΔM. N/A means the parameter has zero or negligible sensitivity.')}
              </div>
            </>
          )}
        </div>
      )}

      {activeOptTab === 'synthesis' && (
        <div>
          <h3>📐 {t('Direct Gear Synthesis (Target NVH → Gear Design)')}</h3>
          <p className="subtitle">{t('Specify desired NVH performance targets and the AI model will reverse-engineer the optimal gear geometry parameters to achieve them.')}</p>

          <div className="form-grid-3">
            <div className="form-section">
              <label>{t('Target Misalignment M [µm]')}</label>
              <div className="stepper-input">
                <button className="stepper-btn" onClick={() => setTargetM(v => Math.max(1, v - 1))}>−</button>
                <input type="number" value={targetM} step={1} onChange={e => setTargetM(+e.target.value)} />
                <button className="stepper-btn" onClick={() => setTargetM(v => v + 1)}>+</button>
              </div>
            </div>
            <div className="form-section">
              <label>{t('Target Transmission Error STE [µm]')}</label>
              <div className="stepper-input">
                <button className="stepper-btn" onClick={() => setTargetTE(v => Math.max(0.1, +(v - 0.05).toFixed(2)))}>−</button>
                <input type="number" value={targetTE} step={0.05} onChange={e => setTargetTE(+e.target.value)} />
                <button className="stepper-btn" onClick={() => setTargetTE(v => +(v + 0.05).toFixed(2))}>+</button>
              </div>
            </div>
            <div className="form-section">
              <label>{t('Target Noise Level LW [dB]')}</label>
              <div className="stepper-input">
                <button className="stepper-btn" onClick={() => setTargetSound(v => Math.max(30, +(v - 0.5).toFixed(1)))}>−</button>
                <input type="number" value={targetSound} step={0.5} onChange={e => setTargetSound(+e.target.value)} />
                <button className="stepper-btn" onClick={() => setTargetSound(v => +(v + 0.5).toFixed(1))}>+</button>
              </div>
            </div>
          </div>
          <button className="primary-btn" onClick={runOptimization} disabled={optLoading}>
            🚀 {optLoading ? t('Synthesizing Gear Design...') : t('Synthesize Gear Design')}
          </button>

          {optResult && (
            <div style={{ marginTop: '1.5rem' }}>
              <div className="success-box">✅ {t('Gear Design Successfully Synthesized!')}</div>

              <h3 style={{ marginTop: '1.5rem' }}>📋 {t('Synthesized Gear Design Parameters')}</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>{t('Design Parameter')}</th>
                      <th>{t('Optimized Value')}</th>
                      <th>{t('Unit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(optResult.optimized_params).map(([k, v], idx) => (
                      <tr key={k}>
                        <td>{idx}</td>
                        <td><strong>{optParamLabels[k] || k}</strong></td>
                        <td>{typeof v === 'number' ? v.toFixed(2) : v}</td>
                        <td>{optParamUnits[k] || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{ marginTop: '1.5rem' }}>🎯 {t('NVH Target Achievement')}</h3>
              <div className="metrics-row">
                <div className="info-box">
                  <h4>{t('Misalignment (M)')}</h4>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.2rem', margin: '0.5rem 0 0' }}>
                    <li>{t('Target')}: <code>{targetM} µm</code></li>
                    <li>{t('Achieved')}: <b>{optResult.achieved.M} µm</b></li>
                    <li>{t('Deviation')}: <code>{(optResult.achieved.M - targetM).toFixed(2)} µm</code></li>
                  </ul>
                </div>
                <div className="info-box">
                  <h4>{t('Transmission Error (STE)')}</h4>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.2rem', margin: '0.5rem 0 0' }}>
                    <li>{t('Target')}: <code>{targetTE} µm</code></li>
                    <li>{t('Achieved')}: <b>{optResult.achieved.STE} µm</b></li>
                    <li>{t('Deviation')}: <code>{(optResult.achieved.STE - targetTE).toFixed(3)} µm</code></li>
                  </ul>
                </div>
                <div className="info-box">
                  <h4>{t('Noise Level (LW)')}</h4>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.2rem', margin: '0.5rem 0 0' }}>
                    <li>{t('Target')}: <code>{targetSound} dB</code></li>
                    <li>{t('Achieved')}: <b>{optResult.achieved.Sound} dB</b></li>
                    <li>{t('Deviation')}: <code>{(optResult.achieved.Sound - targetSound).toFixed(2)} dB</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}