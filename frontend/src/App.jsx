import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import MainWorkspace from './pages/MainWorkspace';
import ParityPage from './pages/ParityPage';
import MultiComparePage from './pages/MultiComparePage';
import StandardsGuidePage from './pages/StandardsGuidePage';
import './App.css';

function Header() {
  return (
    <header className="top-header">
      <div className="header-brand">
        <div className="header-logo">NVH</div>
        <div>
          <div className="header-title">Helix Gear NVH Platform</div>
          <div className="header-subtitle">AI-Powered Analysis</div>
        </div>
      </div>
      <div className="header-right">
        <span className="header-badge">Engineering</span>
        <span className="header-version">v6.3</span>
      </div>
    </header>
  );
}

export default function App() {
  const { activePage } = useApp();
  return (
    <>
      <Header />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {activePage === 'main' && <MainWorkspace />}
          {activePage === 'parity' && <ParityPage />}
          {activePage === 'multi' && <MultiComparePage />}
          {activePage === 'guide' && <StandardsGuidePage />}
        </main>
      </div>
    </>
  );
}