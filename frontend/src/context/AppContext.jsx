import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api';

const AppContext = createContext();

const DEFAULT_PARAMS = {
  mn: 2.0, z1: 18, z2: 118, i: 6.56, beta: 22.0, b: 32.0,
  T1: 43.5, n1: 12200, K_A: 1.13, Calpha: 10.0, Cbeta: 8.0, Q: 5,
};

const DEFAULT_TARGETS = { id: 1, Mtrue: 31.7, TEtrue: 0.93, Sound: 51.9 };

export function AppProvider({ children }) {
  const [langMode, setLangMode] = useState(() => localStorage.getItem('nvh-lang') || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('nvh-theme') || 'dark');
  const [activePage, setActivePage] = useState('main');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [inputParams, setInputParams] = useState(DEFAULT_PARAMS);
  const [actualTargets, setActualTargets] = useState(DEFAULT_TARGETS);
  const [caseIds, setCaseIds] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nvh-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('nvh-lang', langMode);
  }, [langMode]);

  const refreshCaseIds = useCallback(async () => {
    try {
      const { data } = await api.get('/api/case-ids');
      if (Array.isArray(data)) {
        setCaseIds(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshCaseIds();
  }, [refreshCaseIds]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Centralized, robust loadCase function
  const loadCase = useCallback(async (caseId) => {
    const numericId = Number(caseId);
    if (!numericId) return;
    try {
      const { data } = await api.get(`/api/case/${numericId}`);
      if (data && !data.error && data.params && data.targets) {
        setInputParams({ ...data.params });
        setActualTargets({ ...data.targets });
        setActivePage('main');
      }
    } catch (err) {
      console.error('Failed to load benchmark case:', err);
    }
  }, []);

  const value = {
    langMode, setLangMode,
    theme, setTheme, toggleTheme,
    activePage, setActivePage,
    scenarioIdx, setScenarioIdx,
    inputParams, setInputParams,
    actualTargets, setActualTargets,
    caseIds, setCaseIds, refreshCaseIds,
    loadCase,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}