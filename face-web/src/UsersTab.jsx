import { useState, useEffect, useRef } from 'react';
import { Search, Upload, Trash2, Plus, X, Camera } from 'lucide-react';
import { api } from './api';
import ConfirmModal from './ConfirmModal';

export default function UsersTab({ connected }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const list = await api.users.list();
    setUsers(list);
  };

  const filtered = users.filter(u =>
    String(u.id).includes(search) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!formId || !formName) return;
    const id = parseInt(formId);
    if (isNaN(id)) return;

    const user = { id, name: formName.trim() };
    await api.users.save(user);
    setFormId('');
    setFormName('');
    setEditingId(null);
    setMessage({ type: 'success', text: 'Usuário salvo com sucesso!' });
    await loadUsers();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (u) => {
    setFormId(String(u.id));
    setFormName(u.name);
    setEditingId(u.id);
  };

  const handleDelete = async (id) => {
    await api.users.remove(id);
    setConfirmDelete(null);
    setMessage({ type: 'success', text: 'Usuário removido!' });
    await loadUsers();
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePhotoUpload = async () => {
    if (!connected) return;
    const file = fileRef.current?.files?.[0];
    if (!file || !editingId) return;
    setUploading(true);
    try {
      setMessage({ type: 'success', text: 'Foto enviada com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Erro ao enviar foto' });
      setTimeout(() => setMessage(null), 3000);
    }
    setUploading(false);
  };

  return (
    <>
      {message && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
          background: message.type === 'success' ? 'rgba(6,182,212,0.1)' : 'rgba(244,63,94,0.1)',
          border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
        }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1 }}>
        <div className="glass-card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                placeholder="Buscar por ID ou nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filtered.length} de {users.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <p>{users.length === 0 ? 'Nenhum usuário cadastrado.' : 'Nenhum resultado encontrado.'}</p>
            </div>
          ) : (
            <div className="data-table-container" style={{ flex: 1 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Matrícula</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.id}</td>
                      <td>{u.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.registration || '---'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn-secondary" onClick={() => handleEdit(u)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                            ✎ Editar
                          </button>
                          <button className="btn-secondary" onClick={() => setConfirmDelete(u.id)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card fade-in" style={{ width: '340px', flexShrink: 0 }}>
          <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>
            {editingId ? 'Editar Usuário' : 'Novo Usuário'}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">ID (Numérico)</label>
              <input className="form-input" type="number" placeholder="Ex: 123" value={formId} onChange={e => setFormId(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Nome Completo</label>
              <input className="form-input" placeholder="Nome do usuário" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>

            <button className="btn-primary" onClick={handleSave} disabled={!formId || !formName}>
              <Plus size={18} style={{ marginRight: 6 }} />
              {editingId ? 'Atualizar' : 'Salvar'}
            </button>

            {editingId && (
              <button className="btn-secondary" onClick={() => { setFormId(''); setFormName(''); setEditingId(null); }}>
                Cancelar Edição
              </button>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1.5rem 0' }} />

          <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Foto Facial</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Selecione um usuário na lista e envie a foto.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
          <button
            className="btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={!connected || !editingId || uploading}
            style={{ width: '100%', background: uploading ? 'rgba(255,255,255,0.1)' : undefined }}
          >
            <Camera size={18} style={{ marginRight: 6 }} />
            {uploading ? 'Enviando...' : 'Enviar Foto'}
          </button>
          {!connected && (
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
              Conecte a um equipamento para enviar fotos.
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir Usuário"
        message="Tem certeza que deseja excluir este usuário?"
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
