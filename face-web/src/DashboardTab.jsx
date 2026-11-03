import { useState, useEffect } from 'react';
import { Users, ScanFace, ScrollText, Activity } from 'lucide-react';
import { api } from './api';

export default function DashboardTab({ connected, activeDevice, onConnect, onDisconnect }) {
  const [userCount, setUserCount] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    api.devices.list().then(list => setDeviceCount(list.length));
    api.users.list().then(list => setUserCount(list.length));
    api.logs.list().then(list => {
      setLogCount(list.length);
      setRecentLogs(list.slice(0, 5));
    });
  }, []);

  const formatDate = (ts) => {
    try { return new Date(ts).toLocaleString('pt-BR'); }
    catch { return ts || '---'; }
  };

  return (
    <>
      <div className="stats-grid fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon"><MonitorIcon size={20} /></div>
          <div className="stat-value">{deviceCount}</div>
          <div className="stat-label">Equipamentos Cadastrados</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent-secondary)' }}><Users size={20} /></div>
          <div className="stat-value">{userCount}</div>
          <div className="stat-label">Usuários Cadastrados</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ color: 'var(--warning)' }}><ScrollText size={20} /></div>
          <div className="stat-value">{logCount}</div>
          <div className="stat-label">Total de Acessos</div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ color: 'var(--success)' }}><Activity size={20} /></div>
          <div className="stat-value">{connected ? 'Online' : 'Offline'}</div>
          <div className="stat-label">Status do Dispositivo</div>
        </div>
      </div>

      <div className="glass-card fade-in" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600 }}>Equipamento Ativo</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!connected ? (
              <button className="btn-primary" onClick={() => window.location.hash = '#devices'}>
                Conectar
              </button>
            ) : (
              <button className="btn-secondary" onClick={onDisconnect}>
                Desconectar
              </button>
            )}
          </div>
        </div>
        {activeDevice ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              ['Nome', activeDevice.nome],
              ['IP', `${activeDevice.ip}:${activeDevice.porta || '80'}`],
              ['Serial', activeDevice.serial || '---'],
              ['Usuário', activeDevice.usuario || 'admin'],
              ['Descrição', activeDevice.descricao || '---'],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ScanFace size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <p>Nenhum equipamento conectado. Acesse a aba Equipamentos para conectar.</p>
          </div>
        )}
      </div>

      <div className="glass-card fade-in" style={{ animationDelay: '0.3s' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Últimos Acessos</h3>
        {recentLogs.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => (
                  <tr key={i}>
                    <td>{formatDate(log.data_hora)}</td>
                    <td>{log.nome || `ID ${log.user_id}`}</td>
                    <td><span className={`badge ${log.status === 'Permitido' ? 'success' : 'danger'}`}>{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><p>Nenhum registro de acesso ainda.</p></div>
        )}
      </div>
    </>
  );
}

function MonitorIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
