import React from 'react';
import { useTranslate } from '../i18n';

export default function StandardsGuidePage() {
  const t = useTranslate();

  const nvhGates = [
    {
      metric: 'Shaft Misalignment (M)',
      target: '20.0 – 100.0 µm',
      ideal: '25.0 – 45.0 µm',
      standard: 'ISO 6336-1 Annex E',
      impact: 'Contact pressure distribution along tooth flank and casing stiffness'
    },
    {
      metric: 'Transmission Error (STE)',
      target: '0.50 – 2.50 µm',
      ideal: '< 1.20 µm (Quiet EV)',
      standard: 'ISO 1328-1 / VDI 2737',
      impact: 'Primary dynamic excitation for high-frequency gear mesh whine'
    },
    {
      metric: 'Radiated Noise Level (LW)',
      target: '50.0 – 70.0 dB',
      ideal: '< 58.0 dB (Cabin)',
      standard: 'ISO 3744 / DIN 45635',
      impact: 'Airborne acoustic power emitted from gearbox casing walls'
    },
  ];

  const paramEnvelopes = [
    { param: 'Normal Module (mn)', bounds: '1.0 – 5.0 mm', type: 'Continuous', coupling: 'Tooth bending compliance and root shear strength' },
    { param: 'Pinion Teeth (z1)', bounds: '14 – 45 teeth', type: 'Discrete Int', coupling: 'Mesh excitation frequency fm = (n1 × z1)/60 and contact ratio' },
    { param: 'Wheel Teeth (z2)', bounds: '50 – 180 teeth', type: 'Discrete Int', coupling: 'Overall kinematic ratio i = z2/z1 and center distance a' },
    { param: 'Helix Angle (β)', bounds: '10.0 – 45.0 deg', type: 'Continuous', coupling: 'Face contact ratio (overlap) damping high-frequency harmonics' },
    { param: 'Face Width (b)', bounds: '15.0 – 70.0 mm', type: 'Continuous', coupling: 'Specific line load wt = Ft/b and shaft span bending resistance' },
    { param: 'Input Torque (T1)', bounds: '10.0 – 350.0 Nm', type: 'Continuous', coupling: 'Source of tangential tooth force Ft driving elastic deflection' },
    { param: 'Pinion Speed (n1)', bounds: '3000 – 18000 rpm', type: 'Continuous', coupling: 'Rotational speed setting mesh frequency harmonics' },
    { param: 'Application Factor (KA)', bounds: '1.0 – 2.0', type: 'Continuous', coupling: 'Service shock allowance factor per ISO 6336-1' },
    { param: 'Tip Relief (Cα)', bounds: '2.0 – 25.0 µm', type: 'Continuous', coupling: 'Mitigates corner impact during tooth meshing entry' },
    { param: 'Flank Crowning (Cβ)', bounds: '2.0 – 25.0 µm', type: 'Continuous', coupling: 'Prevents longitudinal end-loading caused by shaft deflection' },
    { param: 'ISO Quality Grade (Q)', bounds: 'Grade 4 – 10', type: 'Discrete Int', coupling: 'Flank tolerance band (ISO 1328); Grade 4-5 is precision EV' },
    { param: 'Pressure Angle (α)', bounds: '14.5 – 25.0 deg', type: 'Continuous', coupling: 'Governs radial separating force and contact pressure ellipse' },
  ];

  return (
    <div className="page standards-guide-page">
      <h2>📘 {t('Engineering Standards, Feasibility Envelopes & Methodology Guide')}</h2>
      <p className="subtitle">
        {t('Comprehensive reference documentation detailing automotive NVH evaluation criteria, parameter bounds, and multi-dataset classification formulas.')}
      </p>

      {/* SECTION 1: NVH TOLERANCE GATES */}
      <div className="guide-section-card">
        <h3>1. {t('Target NVH Performance Gates & Operating Thresholds')}</h3>
        <p className="guide-desc">
          Automotive transmission gear pairs are evaluated against strict structural and acoustic feasibility gates[cite: 1]. Calculations exceeding these bands flag Out of Tolerance on verification reports.
        </p>
        <div className="table-wrapper">
          <table className="data-table guide-table">
            <thead>
              <tr>
                <th>{t('NVH Metric')}</th>
                <th>{t('Global Feasibility Band')}</th>
                <th>{t('Automotive / EV Target')}</th>
                <th>{t('Standard Reference')}</th>
                <th>{t('Physical Impact')}</th>
              </tr>
            </thead>
            <tbody>
              {nvhGates.map((g, idx) => (
                <tr key={idx}>
                  <td><strong>{t(g.metric)}</strong></td>
                  <td><code>{g.target}</code></td>
                  <td><span className="badge badge-info">{g.ideal}</span></td>
                  <td>{g.standard}</td>
                  <td>{t(g.impact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: COMPOSITE NVH PENALTY & TIERING FORMULA */}
      <div className="guide-section-card">
        <h3>2. {t('Multi-Dataset Benchmark Classification Formulation')}</h3>
        <p className="guide-desc">
          Benchmark cases (#1 to #101+) are categorized using a normalized <strong>Composite NVH Penalty Function (J_NVH)</strong>[cite: 5]. Each metric is normalized across the global repository min-max span:
        </p>
        <div className="guide-note" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
          J_NVH = (0.30 × M_norm) + (0.40 × STE_norm) + (0.30 × Sound_norm)
        </div>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.85rem', fontSize: '0.85rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
          <li>
            <strong style={{ color: '#10B981' }}>🏆 Best Performers (Top 15% Lowest Penalty):</strong> Represents optimal design variants where all three outputs are well-damped, satisfying EV cabin targets (M ≤ 40 µm, STE ≤ 1.20 µm, LW ≤ 55 dB)[cite: 5]. Marked with a soft emerald chip and star icon (★)[cite: 5].
          </li>
          <li>
            <strong style={{ color: '#EF4444' }}>⚠️ High NVH / Outliers (Bottom 15% Highest Penalty):</strong> Cases exhibiting extreme contact localization, excessive transmission error, or gate violations[cite: 1, 5]. Marked with a soft rose chip for quick diagnostic isolation[cite: 5].
          </li>
          <li>
            <strong>Nominal Cases (Middle 70%):</strong> Standard production operating range[cite: 5].
          </li>
        </ul>
      </div>

      {/* SECTION 3: 12-PARAMETER DESIGN ENVELOPES & COUPLING */}
      <div className="guide-section-card">
        <h3>3. {t('12-Parameter Design Envelopes & Physical Coupling Registry')}</h3>
        <p className="guide-desc">
          In the <strong>Target Optimization Workspace</strong>, parameter adjustments are bounded by strict manufacturing, packaging, and tooling limits[cite: 4]. Shifts recommended beyond these ranges trigger <code>⚠️ Exceeds Envelope</code>[cite: 4]:
        </p>
        <div className="table-wrapper">
          <table className="data-table guide-table">
            <thead>
              <tr>
                <th>{t('Design Parameter')}</th>
                <th>{t('Valid Design Envelope')}</th>
                <th>{t('Variable Type')}</th>
                <th>{t('Coupled NVH Mechanism')}</th>
              </tr>
            </thead>
            <tbody>
              {paramEnvelopes.map((p, idx) => (
                <tr key={idx}>
                  <td><strong>{t(p.param)}</strong></td>
                  <td><code>{p.bounds}</code></td>
                  <td><span className="badge badge-warning">{p.type}</span></td>
                  <td style={{ fontSize: '0.78rem' }}>{t(p.coupling)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: HOW TO RESOLVE EXCEEDED BOUNDS */}
      <div className="guide-section-card">
        <h3>4. {t('Resolving Exceeds Envelope in Target Optimization')}</h3>
        <p className="guide-desc">
          When an engineering target delta requires a parameter change that exceeds physical limits (e.g., attempting to solve a large transmission error delta solely through tooth count changes, which would demand hundreds of teeth)[cite: 4]:
        </p>
        <div className="guide-note">
          <strong>💡 {t('Design Recommendation')}:</strong> {t('Do not rely on a single parameter to satisfy steep NVH deltas. Distribute the required attenuation across coupled micro-geometry modifications: increase Flank Crowning (Cβ) to ease angular tilt, adjust Tip Relief (Cα) to eliminate tip corner interference, and increase Helix Angle (β) to elevate face contact ratio. This achieves desired acoustic damping without pushing macro-geometry outside packaging boundaries.')}
        </div>
      </div>
    </div>
  );
}