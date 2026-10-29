import { useTranslate } from '../i18n';

export default function StandardsGuidePage() {
  const t = useTranslate();

  return (
    <div className="page standards-guide-page">
      <h2>📘 {t('Engineering Evaluation & Verification Standards Guide')}</h2>
      <p className="subtitle">{t('Reference criteria for NVH design feasibility and model accuracy assessment')}</p>

      {/* Section 1 */}
      <div className="guide-section-card">
        <h3>1. {t('Design Feasibility Gates')} — {t('Operating Criteria')}</h3>
        <p className="guide-desc">
          {t('These thresholds define acceptable operating ranges for each NVH parameter. Values outside these ranges indicate potential design issues requiring review.')}
        </p>
        <div className="table-wrapper">
          <table className="data-table guide-table">
            <thead>
              <tr>
                <th>{t('Parameter')}</th>
                <th>{t('Symbol')}</th>
                <th>{t('Acceptable Range')}</th>
                <th>{t('EV / Cabin Target')}</th>
                <th>{t('Unit')}</th>
                <th>{t('Classification')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{t('Mesh Misalignment')}</td>
                <td>M</td>
                <td>20.0 – 100.0</td>
                <td>—</td>
                <td>µm</td>
                <td><span className="badge badge-info">{t('Structural')}</span></td>
              </tr>
              <tr>
                <td>{t('Static Transmission Error')}</td>
                <td>STE</td>
                <td>0.50 – 2.50</td>
                <td>EV ≤ 1.50</td>
                <td>µm</td>
                <td><span className="badge badge-warning">{t('Vibration')}</span></td>
              </tr>
              <tr>
                <td>{t('Sound Power Level')}</td>
                <td>LW</td>
                <td>50.0 – 70.0</td>
                <td>Cabin ≤ 60</td>
                <td>dB</td>
                <td><span className="badge badge-danger">{t('Acoustic')}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="guide-note">
          <strong>{t('Note')}:</strong> {t('EV targets represent electric vehicle cabin requirements. Cabin targets apply to interior noise regulations per ISO 362.')}
        </div>
      </div>

      {/* Section 2 */}
      <div className="guide-section-card">
        <h3>2. {t('Model Accuracy & Benchmark Agreement Tiers')}</h3>
        <p className="guide-desc">
          {t('Accuracy classification is based on absolute deviation between CAE benchmark and AI model predictions.')}
        </p>
        <div className="table-wrapper">
          <table className="data-table guide-table">
            <thead>
              <tr>
                <th>{t('Parameter')}</th>
                <th>{t('High Accuracy')}</th>
                <th>{t('Moderate Accuracy')}</th>
                <th>{t('Low Accuracy')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>M ({t('Misalignment')})</td>
                <td><span className="tier-high">|Δ| ≤ 6.0 µm</span></td>
                <td><span className="tier-mod">6.0 &lt; |Δ| ≤ 15.0 µm</span></td>
                <td><span className="tier-low">|Δ| &gt; 15.0 µm</span></td>
              </tr>
              <tr>
                <td>STE ({t('Trans. Error')})</td>
                <td><span className="tier-high">|Δ| ≤ 0.35 µm</span></td>
                <td><span className="tier-mod">0.35 &lt; |Δ| ≤ 0.80 µm</span></td>
                <td><span className="tier-low">|Δ| &gt; 0.80 µm</span></td>
              </tr>
              <tr>
                <td>LW ({t('Sound Level')})</td>
                <td><span className="tier-high">|Δ| ≤ 2.5 dB</span></td>
                <td><span className="tier-mod">2.5 &lt; |Δ| ≤ 5.0 dB</span></td>
                <td><span className="tier-low">|Δ| &gt; 5.0 dB</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3 */}
      <div className="guide-section-card">
        <h3>3. {t('Design Feasibility Assessment Logic')}</h3>
        <p className="guide-desc">
          {t('Each predicted parameter is evaluated against the feasibility gate and assigned one of the following statuses:')}
        </p>
        <div className="feasibility-legend">
          <div className="legend-item">
            <span className="status-dot dot-pass" /> <strong>{t('PASS')}</strong> — {t('Value within acceptable operating range')}
          </div>
          <div className="legend-item">
            <span className="status-dot dot-marginal" /> <strong>{t('MARGINAL')}</strong> — {t('Value near boundary; review recommended')}
          </div>
          <div className="legend-item">
            <span className="status-dot dot-fail" /> <strong>{t('FAIL')}</strong> — {t('Value outside acceptable range; redesign required')}
          </div>
        </div>
      </div>

      {/* Section 4 */}
      <div className="guide-section-card">
        <h3>4. {t('Relative Deviation Classification')}</h3>
        <p className="guide-desc">
          {t('Percentage-based deviation thresholds used in the Output Summary Table:')}
        </p>
        <div className="table-wrapper">
          <table className="data-table guide-table">
            <thead>
              <tr>
                <th>{t('Deviation Range')}</th>
                <th>{t('Accuracy Assessment')}</th>
                <th>{t('Color Code')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>|Δ%| ≤ 10%</td>
                <td><span className="tier-high">{t('High Accuracy')}</span></td>
                <td style={{ color: '#10B981' }}>Green</td>
              </tr>
              <tr>
                <td>10% &lt; |Δ%| ≤ 20%</td>
                <td><span className="tier-mod">{t('Moderate Accuracy')}</span></td>
                <td style={{ color: '#F59E0B' }}>Amber</td>
              </tr>
              <tr>
                <td>|Δ%| &gt; 20%</td>
                <td><span className="tier-low">{t('Low Accuracy')}</span></td>
                <td style={{ color: '#EF4444' }}>Red</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5 */}
      <div className="guide-section-card">
        <h3>5. {t('Reference Standards')}</h3>
        <ul className="ref-list">
          <li><strong>ISO 6336</strong> — {t('Calculation of load capacity of spur and helical gears')}</li>
          <li><strong>ISO 1328</strong> — {t('Cylindrical gears — ISO system of flank tolerance classification')}</li>
          <li><strong>ISO 362</strong> — {t('Measurement of noise emitted by accelerating road vehicles')}</li>
          <li><strong>DIN 3990</strong> — {t('Calculation of load capacity of cylindrical gears')}</li>
          <li><strong>AGMA 2001-D04</strong> — {t('Fundamental Rating Factors for Involute Spur and Helical Gear Teeth')}</li>
        </ul>
      </div>
    </div>
  );
}