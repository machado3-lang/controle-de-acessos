import { X } from 'lucide-react';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'OK', cancelLabel = 'Cancelar', variant = 'primary' }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div className="glass-card" style={{ maxWidth: '480px', width: '90%', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600, margin: 0 }}>{title || 'Confirmação'}</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 1.5rem 0' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'none' }}>
            {cancelLabel}
          </button>
          <button className="btn-primary" onClick={onConfirm} style={variant === 'danger' ? { background: 'linear-gradient(135deg, #f43f5e, #fb7185)' } : {}}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
