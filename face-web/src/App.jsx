import { useState, useEffect } from 'react';
import {
  Monitor,
  Users,
  ScrollText,
  FileBarChart,
  Wifi,
  ScanFace,
  LayoutDashboard,
} from 'lucide-react';
import DashboardTab from './DashboardTab';
import DevicesTab from './DevicesTab';
import UsersTab from './UsersTab';
import LogsTab from './LogsTab';
import ReportsTab from './ReportsTab';
import RemoteTab from './RemoteTab';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'devices', label: 'Equipamentos', icon: Monitor },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'logs', label: 'Logs de Acesso', icon: ScrollText },
  { key: 'reports', label: 'Relatórios', icon: FileBarChart },
  { key: 'remote', label: 'Acesso Remoto', icon: Wifi },
];

function FaceLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [connected, setConnected] = useState(false);
  const [activeDevice, setActiveDevice] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('face_active_device');
    if (stored) {
      try {
        const dev = JSON.parse(stored);
        setActiveDevice(dev);
        setConnected(true);
      } catch {}
    }
  }, []);

  const handleConnect = (dev) => {
    setActiveDevice(dev);
    setConnected(true);
    localStorage.setItem('face_active_device', JSON.stringify(dev));
  };

  const handleDisconnect = () => {
    setActiveDevice(null);
    setConnected(false);
    localStorage.removeItem('face_active_device');
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <ScanFace size={32} style={{ color: '#7c3aed', marginRight: 8 }} />
          <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            <span style={{ color: '#e62e2e' }}>M</span>
            <span style={{ color: '#06b6d4' }}>ulti</span>
            <span style={{ color: '#e62e2e' }}>A</span>
            <span style={{ color: '#7c3aed' }}>cesso</span>
          </span>
        </div>

        <nav className="nav-menu">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <a
              key={key}
              className={`nav-item ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: connected ? 'var(--success)' : 'var(--danger)' }} />
            {connected ? `Conectado: ${activeDevice?.nome || activeDevice?.ip || '---'}` : 'Desconectado'}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header fade-in">
          <div>
            <h1 className="page-title">
              {NAV_ITEMS.find(n => n.key === activeTab)?.label}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'dashboard' && 'Visão geral do sistema MultiAcesso'}
              {activeTab === 'devices' && 'Gerenciar equipamentos de controle facial'}
              {activeTab === 'users' && 'Cadastro e gerenciamento de usuários'}
              {activeTab === 'logs' && 'Registro de acessos e eventos'}
              {activeTab === 'reports' && 'Relatórios de acesso e exportação'}
              {activeTab === 'remote' && 'Servidor Push e comandos remotos'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className={`badge ${connected ? 'success' : 'neutral'}`}>
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <DashboardTab
            connected={connected}
            activeDevice={activeDevice}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}
        {activeTab === 'devices' && (
          <DevicesTab
            connected={connected}
            activeDevice={activeDevice}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}
        {activeTab === 'users' && <UsersTab connected={connected} activeDevice={activeDevice} />}
        {activeTab === 'logs' && <LogsTab connected={connected} activeDevice={activeDevice} />}
        {activeTab === 'reports' && <ReportsTab connected={connected} activeDevice={activeDevice} />}
        {activeTab === 'remote' && <RemoteTab />}
      </main>
    </div>
  );
}

export default function App() {
  return <FaceLayout />;
}
