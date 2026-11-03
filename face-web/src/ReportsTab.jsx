import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { api } from './api';

export default function ReportsTab() {
  const [dateStart, setDateStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [userId, setUserId] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleExport = async (format) => {
    setGenerating(true);
    const logs = await api.logs.list();

    const filtered = logs.filter(l => {
      if (userId && String(l.user_id) !== userId) return false;
      try {
        const dt = new Date(l.data_hora);
        if (dateStart && dt < new Date(dateStart)) return false;
        if (dateEnd && dt > new Date(dateEnd + 'T23:59:59')) return false;
      } catch {}
      return true;
    });

    if (filtered.length === 0) {
      setGenerating(false);
      return;
    }

    const rows = filtered.map(l => [
      l.data_hora,
      l.user_id,
      l.nome,
      l.status,
    ]);

    if (format === 'csv') {
      const csv = [
        ['Data/Hora', 'User ID', 'Nome', 'Status'],
        ...rows,
      ].map(r => r.join(';')).join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${dateStart}_${dateEnd}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    if (format === 'html') {
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Relatório de Acesso</title>
<style>
  body { font-family: sans-serif; padding: 2rem; background: #f8f9fa; }
  h1 { color: #333; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { padding: 0.5rem; border: 1px solid #dee2e6; text-align: left; }
  th { background: #7c3aed; color: white; }
  tr:nth-child(even) { background: #f2f2f2; }
</style></head>
<body>
  <h1>Relatório de Acesso - MultiAcesso</h1>
  <p>Período: ${dateStart} a ${dateEnd} | Registros: ${rows.length}</p>
  <table>
    <thead><tr><th>Data/Hora</th><th>ID</th><th>Nome</th><th>Status</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody>
  </table>
  <p style="margin-top:1rem;color:#666;font-size:0.85rem;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
</body></html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${dateStart}_${dateEnd}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setGenerating(false);
  };

  return (
    <div className="glass-card fade-in">
      <h3 style={{ fontWeight: 600, marginBottom: '1.5rem' }}>Relatórios de Acesso</h3>

      <div className="form-grid" style={{ maxWidth: '600px' }}>
        <div>
          <label className="form-label">Data Início</label>
          <input className="form-input" type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Data Fim</label>
          <input className="form-input" type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
        </div>
        <div>
          <label className="form-label">ID do Usuário (opcional)</label>
          <input className="form-input" placeholder="Deixe vazio para todos" value={userId} onChange={e => setUserId(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Formato de Exportação</h4>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => handleExport('csv')} disabled={generating}>
            <Download size={18} style={{ marginRight: 6 }} />
            {generating ? 'Gerando...' : 'CSV'}
          </button>
          <button className="btn-primary" onClick={() => handleExport('html')} disabled={generating} style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}>
            <FileText size={18} style={{ marginRight: 6 }} />
            {generating ? 'Gerando...' : 'HTML (imprimível)'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Observações</h4>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8, paddingLeft: '1.5rem' }}>
          <li>Os relatórios são gerados a partir dos logs armazenados localmente.</li>
          <li>Para dados mais completos, conecte ao equipamento e sincronize os logs primeiro.</li>
          <li>O formato HTML pode ser aberto no navegador e impresso como relatório.</li>
        </ul>
      </div>
    </div>
  );
}
