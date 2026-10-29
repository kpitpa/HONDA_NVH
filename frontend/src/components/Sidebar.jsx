import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslate } from '../i18n';
import api from '../api';

export default function Sidebar() {
  const { langMode, setLangMode, theme, toggleTheme, activePage, setActivePage, scenarioIdx, setScenarioIdx,
          setInputParams, setActualTargets } = useApp();
  const t = useTranslate();
  const [caseIds, setCaseIds] = useState([]);
  const [selectedCase, setSelectedCase] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.get('/api/case-ids').then(r => setCaseIds(r.data)).catch(() => {});
  }, []);

  const loadCase = async () => {
    try {
      const r = await api.get(`/api/case/${selectedCase}`);
      setInputParams(r.data.params);
      setActualTargets(r.data.targets);
      setActivePage('main');
    } catch {}
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-body">
        <div className="sidebar-section">
          <h3>{t('Navigation')}</h3>
          <button className={`sidebar-btn ${activePage === 'main' ? 'active' : ''}`}
            onClick={() => setActivePage('main')}>
            {t('Main NVH Workspace')}
          </button>
          <button className={`sidebar-btn ${activePage === 'parity' ? 'active' : ''}`}
            onClick={() => setActivePage('parity')}>
            {t('Parity Chart')}
          </button>
          <button className={`sidebar-btn ${activePage === 'multi' ? 'active' : ''}`}
            onClick={() => setActivePage('multi')}>
            {t('Multi-Dataset Compare')}
          </button>
        </div>

        <hr className="sidebar-divider" />

        <div className="sidebar-section">
          <h3>{t('Operating Mode')}</h3>
          <label className="radio-label">
            <input type="radio" checked={scenarioIdx === 0} onChange={() => { setScenarioIdx(0); setActivePage('main'); }} />
            {t('Design Verification')}
          </label>
          <label className="radio-label">
            <input type="radio" checked={scenarioIdx === 1} onChange={() => { setScenarioIdx(1); setActivePage('main'); }} />
            {t('Target Optimization')}
          </label>
        </div>

        <hr className="sidebar-divider" />

        <div className="sidebar-section">
          <h3>{t('Benchmark')}</h3>
          <select value={selectedCase} onChange={e => setSelectedCase(Number(e.target.value))} className="sidebar-select">
            {caseIds.map(id => <option key={id} value={id}>Case #{id}</option>)}
          </select>
          <button className="sidebar-btn load-btn" onClick={loadCase}>
            {t('Load Benchmark')}
          </button>
        </div>

        <hr className="sidebar-divider" />

        <div className="sidebar-section">
          <button className={`sidebar-btn ${activePage === 'guide' ? 'active' : ''}`}
            onClick={() => setActivePage('guide')}>
            📘 {t('Engineering Guide')}
          </button>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="settings-trigger" onClick={() => setShowSettings(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          {t('Settings')}
        </button>
      </div>

      {showSettings && (
        <>
          <div className="settings-overlay" onClick={() => setShowSettings(false)} />
          <div className="settings-panel">
            <h3>
              {t('Settings')}
              <button className="settings-close" onClick={() => setShowSettings(false)}>✕</button>
            </h3>
            <div className="settings-group">
              <div className="settings-group-label">{t('Appearance')}</div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">{t('Dark Mode')}</div>
                  <div className="settings-row-desc">{t('Toggle between light and dark themes')}</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                  <span className="toggle-track" />
                  <span className="toggle-knob" />
                </label>
              </div>
            </div>
            <div className="settings-group">
              <div className="settings-group-label">{t('Language')}</div>
              <div className="settings-row">
                <div className="settings-row-label">{t('Display Language')}</div>
                <select value={langMode} onChange={e => setLangMode(e.target.value)} className="settings-select">
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="both">Both / 両方</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}