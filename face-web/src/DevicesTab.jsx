import { useState, useEffect } from 'react';
import { Plus, Trash2, Power, PowerOff, Wifi } from 'lucide-react';
import { api } from './api';
import ConfirmModal from './ConfirmModal';

export default function DevicesTab({ connected, activeDevice, onConnect, onDisconnect }) {
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState({ nome: '', ip: '', porta: '80', serial: '', usuario: 'admin', senha: '', descricao: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    const list = await api.devices.list();
    setDevices(list);
  };

  const handleSave = async () => {
    if (!form.nome || !form.ip) return;
    const payload = { ...form };
    if (editing) payload.id = editing;
    await api.devices.save(payload);
    setForm({ nome: '', ip: '', porta: '80', serial: '', usuario: 'admin', senha: '', descricao: '' });
    setEditing(null);
    setShowForm(false);
    await loadDevices();
  };

  const handleEdit = (dev) => {
    setForm({ nome: dev.nome, ip: dev.ip, porta: dev.porta || '80', serial: dev.serial || '', usuario: dev.usuario || 'admin', senha: '', descricao: dev.descricao || '' });
    setEditing(dev.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await api.devices.remove(id);
    if (activeDevice?.id === id) onDisconnect();
    setConfirmDelete(null);
    await loadDevices();
  };

  const handleConnectDevice = async (dev) => {
    onConnect(dev);
  };

  return (
    <>
      <div className="glass-card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600 }}>Equipamentos Cadastrados</h3>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ nome: '', ip: '', porta: '80', serial: '', usuario: 'admin', senha: '', descricao: '' }); }}>
            <Plus size={18} style={{ marginRight: 6 }} />
            Novo Equipamento
          </button>
        </div>

        {showForm && (
          <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(124,58,237,0.05)', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.15)' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>{editing ? 'Editar Equipamento' : 'Novo Equipamento'}</h4>
            <div className="form-grid">
              <div>
                <label className="form-label">Nome do Equipamento *</label>
                <input className="form-input" placeholder="Ex: Portaria Principal" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <label className="form-label">IP *</label>
                <input className="form-input" placeholder="192.168.1.100" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Porta</label>
                <input className="form-input" placeholder="80" value={form.porta} onChange={e => setForm({ ...form, porta: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Nº de Série</label>
                <input className="form-input" placeholder="Serial do dispositivo" value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Usuário</label>
                <input className="form-input" placeholder="admin" value={form.usuario} onChange={e => setForm({ ...form, usuario: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" placeholder="********" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="form-label" style={{ marginTop: '0.5rem' }}>Descrição</label>
              <input className="form-input" placeholder="Localização, observações..." value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleSave}>Salvar</button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {devices.length === 0 ? (
          <div className="empty-state">
            <Wifi size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <p>Nenhum equipamento cadastrado. Clique em "Novo Equipamento" para adicionar.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>IP</th>
                  <th>Porta</th>
                  <th>Serial</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(dev => {
                  const isActive = activeDevice?.id === dev.id;
                  return (
                    <tr key={dev.id}>
                      <td style={{ fontWeight: 500 }}>{dev.nome}</td>
                      <td>{dev.ip}</td>
                      <td>{dev.porta || '80'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{dev.serial || '---'}</td>
                      <td>
                        <span className={`badge ${isActive ? 'success' : 'neutral'}`}>
                          {isActive ? 'Conectado' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {isActive ? (
                            <button className="btn-secondary" onClick={onDisconnect} style={{ padding: '0.5rem' }}>
                              <PowerOff size={16} />
                            </button>
                          ) : (
                            <button className="btn-primary" onClick={() => handleConnectDevice(dev)} style={{ padding: '0.5rem' }}>
                              <Power size={16} />
                            </button>
                          )}
                          <button className="btn-secondary" onClick={() => handleEdit(dev)} style={{ padding: '0.5rem' }}>
                            ✎
                          </button>
                          <button className="btn-secondary" onClick={() => setConfirmDelete(dev.id)} style={{ padding: '0.5rem', color: 'var(--danger)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir Equipamento"
        message="Tem certeza que deseja excluir este equipamento?"
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
