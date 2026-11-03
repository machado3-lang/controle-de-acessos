import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Download } from 'lucide-react';
import { api } from './api';

export default function LogsTab({ connected, activeDevice }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => { loadLogs(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadLogs = async () => {
    setLoading(true);
    const list = await api.logs.list();
    setLogs(list);
    setLoading(false);
  };

  const handleClear = async () => {
    await api.logs.clear();
    setLogs([]);
  };

  const handleExport = () => {
    const csv = [
      ['Data/Hora', 'User ID', 'Nome', 'Status'],
      ...logs.map(l => [l.data_hora, l.user_id, l.nome, l.status]),
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts) => {
    try { return new Date(ts).toLocaleString('pt-BR'); }
    catch { return ts || '---'; }
  };

  return (
    <div className="glass-card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: 600 }}>Registro de Acessos</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
            Auto 10s
          </label>
          <button className="btn-primary" onClick={loadLogs} disabled={loading}>
            <RefreshCw size={16} style={{ marginRight: 6 }} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
          <button className="btn-secondary" onClick={handleExport} disabled={logs.length === 0}>
            <Download size={16} style={{ marginRight: 6 }} />
            CSV
          </button>
          <button className="btn-secondary" onClick={handleClear} disabled={logs.length === 0} style={{ color: 'var(--danger)' }}>
            <Trash2 size={16} style={{ marginRight: 6 }} />
            Limpar
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state" style={{ flex: 1 }}>
          <p>Nenhum registro de acesso encontrado.</p>
          {connected && (
            <button className="btn-primary" onClick={loadLogs} style={{ marginTop: '1rem' }}>
              Carregar Logs do Equipamento
            </button>
          )}
        </div>
      ) : (
        <div className="data-table-container" style={{ flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>User ID</th>
                <th>Nome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i}>
                  <td>{formatDate(log.data_hora)}</td>
                  <td style={{ fontWeight: 500 }}>{log.user_id}</td>
                  <td>{log.nome}</td>
                  <td>
                    <span className={`badge ${log.status === 'Permitido' || log.status === '✅ Permitido' ? 'success' : 'danger'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total: {logs.length} registro(s)
          </div>
        </div>
      )}
    </div>
  );
}
