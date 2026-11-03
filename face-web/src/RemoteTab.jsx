import { useState, useEffect, useCallback } from 'react';
import { Wifi, Globe, Shield, DoorOpen, Lock, Unlock, RotateCw, RefreshCw, Trash2 } from 'lucide-react';
import { api } from './api';

export default function RemoteTab() {
  const [url, setUrl] = useState(() => localStorage.getItem('face_push_url') || '');
  const [token, setToken] = useState(() => localStorage.getItem('face_push_token') || '');
  const [status, setStatus] = useState({ text: 'Não configurado', color: 'var(--text-muted)' });
  const [devices, setDevices] = useState({});
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('face_push_url');
    const savedToken = localStorage.getItem('face_push_token');
    if (savedUrl) setUrl(savedUrl);
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    localStorage.setItem('face_push_url', url);
  }, [url]);

  useEffect(() => {
    localStorage.setItem('face_push_token', token);
  }, [token]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshMonitor, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, url, token]);

  const testConnection = async () => {
    if (!url) return;
    setStatus({ text: 'Testando...', color: 'var(--warning)' });
    try {
      const data = await api.push.health(url);
      setStatus({
        text: `Online | Dispositivos: ${data.devices_seen || 0} | Comandos: ${data.pending_cmds || 0}`,
        color: 'var(--success)',
      });
      setServerStatus(data);
    } catch (e) {
      setStatus({ text: `Erro: ${e.message}`, color: 'var(--danger)' });
    }
  };

  const refreshMonitor = useCallback(async () => {
    if (!url || !token) return;
    setLoading(true);
    try {
      const [devData, evData, resData] = await Promise.all([
        api.push.devices(url, token),
        api.push.events(url, token),
        api.push.results(url, token),
      ]);
      setDevices(devData.devices || {});
      setEvents(evData.events || []);
      setResults(resData.results || []);
    } catch {}
    setLoading(false);
  }, [url, token]);

  const sendCmd = async (method, endpoint, body, label) => {
    if (!url || !token) return;
    try {
      await api.push.sendCmd(url, token, method, endpoint, body);
      setTimeout(refreshMonitor, 2000);
    } catch {}
  };

  const clearAll = async () => {
    if (!url || !token) return;
    await api.push.clear(url, token);
    await refreshMonitor();
  };

  const clearEvents = async () => {
    if (!url || !token) return;
    await api.push.clearEvents(url, token);
    await refreshMonitor();
  };

  return (
    <>
      <div className="glass-card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600 }}><Globe size={20} style={{ marginRight: 8 }} /> Servidor Push</h3>
          <button className="btn-secondary" onClick={testConnection}>
            Testar Conexão
          </button>
        </div>

        <div className="form-grid">
          <div>
            <label className="form-label">URL do Servidor</label>
            <input
              className="form-input"
              placeholder="https://seu-projeto.railway.app"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Token de Acesso</label>
            <input
              className="form-input"
              type="password"
              placeholder="minha_chave_secreta"
              value={token}
              onChange={e => setToken(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: status.color }} />
          <span style={{ fontSize: '0.85rem', color: status.color }}>{status.text}</span>
        </div>
      </div>

      <div className="glass-card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600 }}><Shield size={20} style={{ marginRight: 8 }} /> Ações Remotas</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => sendCmd('POST', '/execute_actions.fcgi', { actions: [{ action: 'door', parameters: 'door=1' }] }, 'Abrir Porta')} disabled={!url}>
            <DoorOpen size={18} style={{ marginRight: 6 }} /> Abrir Porta
          </button>
          <button className="btn-primary" onClick={() => sendCmd('POST', '/set_configuration.fcgi', { portal: { lock: true } }, 'Bloquear')} disabled={!url} style={{ background: 'linear-gradient(135deg, #f43f5e, #fb7185)' }}>
            <Lock size={18} style={{ marginRight: 6 }} /> Bloquear Acesso
          </button>
          <button className="btn-primary" onClick={() => sendCmd('POST', '/set_configuration.fcgi', { portal: { lock: false } }, 'Liberar')} disabled={!url} style={{ background: 'linear-gradient(135deg, #06b6d4, #22d3ee)' }}>
            <Unlock size={18} style={{ marginRight: 6 }} /> Liberar Acesso
          </button>
          <button className="btn-secondary" onClick={() => sendCmd('POST', '/reboot.fcgi', {}, 'Reiniciar')} disabled={!url}>
            <RotateCw size={18} style={{ marginRight: 6 }} /> Reiniciar
          </button>
        </div>
      </div>

      <div className="glass-card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600 }}><Wifi size={20} style={{ marginRight: 8 }} /> Monitor</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
              Auto 15s
            </label>
            <button className="btn-primary" onClick={refreshMonitor} disabled={loading}>
              <RefreshCw size={16} style={{ marginRight: 6 }} />
              Atualizar
            </button>
            <button className="btn-secondary" onClick={clearEvents}>
              <Trash2 size={16} style={{ marginRight: 6 }} /> Limpar Eventos
            </button>
            <button className="btn-secondary" onClick={clearAll}>
              <Trash2 size={16} style={{ marginRight: 6 }} /> Limpar Tudo
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Dispositivos Conectados</h4>
          {Object.keys(devices).length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum dispositivo conectado ao servidor.</p>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>IP</th>
                    <th>Status</th>
                    <th>Último contato</th>
                    <th>Polls</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(devices).map(([key, info]) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 500 }}>{info.serial || key.split('@')[0]}</td>
                      <td>{info.ip}</td>
                      <td>
                        <span className={`badge ${info.online ? 'success' : 'danger'}`}>
                          {info.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{info.last_seen}</td>
                      <td>{info.poll_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Eventos de Acesso (últimos)</h4>
          {events.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum evento recebido.</p>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recebido</th>
                    <th>Dispositivo</th>
                    <th>Usuário</th>
                    <th>Evento</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 10).map((ev, i) => {
                    const data = ev.data || {};
                    const uid = data.user_id || data.userId || data.id_user || '';
                    const nome = data.name || data.user_name || (uid ? `ID ${uid}` : 'Desconhecido');
                    const evNum = data.event || data.event_type || data.type || '';
                    const isAllowed = String(evNum) === '7';
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: '0.85rem' }}>{ev.received_at}</td>
                        <td>{ev.serial || ev.device_id}</td>
                        <td>{nome}</td>
                        <td>
                          <span className={`badge ${isAllowed ? 'success' : 'danger'}`}>
                            {isAllowed ? 'Acesso Permitido' : `Evento ${evNum}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h4 style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Resultados de Comandos</h4>
          {results.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum resultado de comando.</p>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recebido</th>
                    <th>Dispositivo</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '0.85rem' }}>{r.received_at}</td>
                      <td>{r.serial || r.device_id}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {JSON.stringify(r.data).slice(0, 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
