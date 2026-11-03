import express from 'express';
import cors from 'cors';
import http from 'http';
import https from 'https';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'database.json');
const PUSH_DEVICES = {};
const PUSH_EVENTS = [];
const PUSH_RESULTS = [];
const PUSH_CMDS = [];

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadDB() {
  if (!existsSync(DB_FILE)) return { devices: {}, users: {}, logs: [], config: {} };
  try { return JSON.parse(readFileSync(DB_FILE, 'utf-8')); }
  catch { return { devices: {}, users: {}, logs: [], config: {} }; }
}

function saveDB(db) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3100;
const API_TOKEN = process.env.API_TOKEN || 'face-cloud-token-2024';

function auth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || token !== API_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

function nowISO() {
  return new Date().toISOString();
}

function nowStr() {
  return new Date().toLocaleString('pt-BR');
}

// ── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'face-cloud',
    version: '1.0.0',
    timestamp: nowISO(),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    return res.json({ token: API_TOKEN, session: randomUUID() });
  }
  res.status(401).json({ error: 'Credenciais inválidas' });
});

// ── Dispositivos (CRUD) ──────────────────────────────────────────────────────

app.get('/api/devices', auth, (req, res) => {
  const db = loadDB();
  res.json(Object.values(db.devices));
});

app.post('/api/devices', auth, (req, res) => {
  const db = loadDB();
  const { nome, ip, porta, serial, usuario, descricao } = req.body;
  if (!nome || !ip) return res.status(400).json({ error: 'Nome e IP são obrigatórios' });

  const id = randomUUID();
  db.devices[id] = {
    id, nome, ip, porta: porta || '80', serial: serial || '',
    usuario: usuario || 'admin', descricao: descricao || '',
    criado_em: nowISO(),
  };
  saveDB(db);
  res.status(201).json(db.devices[id]);
});

app.put('/api/devices/:id', auth, (req, res) => {
  const db = loadDB();
  const dev = db.devices[req.params.id];
  if (!dev) return res.status(404).json({ error: 'Dispositivo não encontrado' });

  const { nome, ip, porta, serial, usuario, descricao } = req.body;
  if (nome !== undefined) dev.nome = nome;
  if (ip !== undefined) dev.ip = ip;
  if (porta !== undefined) dev.porta = porta;
  if (serial !== undefined) dev.serial = serial;
  if (usuario !== undefined) dev.usuario = usuario;
  if (descricao !== undefined) dev.descricao = descricao;

  saveDB(db);
  res.json(dev);
});

app.delete('/api/devices/:id', auth, (req, res) => {
  const db = loadDB();
  if (!db.devices[req.params.id]) return res.status(404).json({ error: 'Dispositivo não encontrado' });
  delete db.devices[req.params.id];
  saveDB(db);
  res.json({ ok: true });
});

// ── Usuários ─────────────────────────────────────────────────────────────────

app.get('/api/users', auth, (req, res) => {
  const db = loadDB();
  res.json(Object.values(db.users));
});

app.post('/api/users', auth, (req, res) => {
  const db = loadDB();
  const { id, name, registration } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'ID e nome são obrigatórios' });

  const key = String(id);
  db.users[key] = { id: parseInt(id), name, registration: registration || '', atualizado: nowISO() };
  saveDB(db);
  res.status(201).json(db.users[key]);
});

app.put('/api/users/:id', auth, (req, res) => {
  const db = loadDB();
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { name, registration } = req.body;
  if (name !== undefined) user.name = name;
  if (registration !== undefined) user.registration = registration;
  user.atualizado = nowISO();

  saveDB(db);
  res.json(user);
});

app.delete('/api/users/:id', auth, (req, res) => {
  const db = loadDB();
  if (!db.users[req.params.id]) return res.status(404).json({ error: 'Usuário não encontrado' });
  delete db.users[req.params.id];
  saveDB(db);
  res.json({ ok: true });
});

app.post('/api/users/sync', auth, (req, res) => {
  const db = loadDB();
  const { users } = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ error: 'Lista de usuários inválida' });

  const agora = nowISO();
  for (const u of users) {
    if (u.id) {
      db.users[String(u.id)] = {
        id: u.id, name: u.name || '', registration: u.registration || '', atualizado: agora,
      };
    }
  }
  saveDB(db);
  res.json({ total: Object.keys(db.users).length });
});

// ── Logs ─────────────────────────────────────────────────────────────────────

app.get('/api/logs', auth, (req, res) => {
  const db = loadDB();
  const { limit, offset, user_id, data_inicio, data_fim } = req.query;

  let logs = [...(db.logs || [])];

  if (user_id) logs = logs.filter(l => String(l.user_id) === user_id);
  if (data_inicio) logs = logs.filter(l => l.data_hora >= data_inicio);
  if (data_fim) logs = logs.filter(l => l.data_hora <= data_fim + 'T23:59:59');

  logs.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));

  const off = parseInt(offset) || 0;
  const lim = parseInt(limit) || 100;

  res.json({
    total: logs.length,
    offset: off,
    limit: lim,
    logs: logs.slice(off, off + lim),
  });
});

app.post('/api/logs', auth, (req, res) => {
  const db = loadDB();
  const { logs } = req.body;
  if (!Array.isArray(logs)) return res.status(400).json({ error: 'Lista de logs inválida' });

  if (!db.logs) db.logs = [];
  for (const log of logs) {
    db.logs.unshift({
      data_hora: log.data_hora || nowISO(),
      user_id: log.user_id,
      nome: log.nome || '',
      status: log.status || 'Desconhecido',
      importado: nowISO(),
    });
  }
  if (db.logs.length > 5000) db.logs.length = 5000;
  saveDB(db);
  res.json({ imported: logs.length, total: db.logs.length });
});

app.delete('/api/logs', auth, (req, res) => {
  const db = loadDB();
  db.logs = [];
  saveDB(db);
  res.json({ ok: true });
});

// ── Config ───────────────────────────────────────────────────────────────────

app.get('/api/config', auth, (req, res) => {
  const db = loadDB();
  res.json(db.config || {});
});

app.post('/api/config', auth, (req, res) => {
  const db = loadDB();
  db.config = { ...(db.config || {}), ...req.body };
  saveDB(db);
  res.json(db.config);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOLO PUSH (compatível com o server.py existente)
// ═══════════════════════════════════════════════════════════════════════════════

function resolveDeviceId(req) {
  const serial = req.headers['x-device-serial'] || req.query.serial || '';
  const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';

  if (serial) return { key: `${serial}@${ip}`, serial, ip };

  const devId = req.headers['x-device-id'] || req.query.device_id || ip;
  return { key: devId, serial: null, ip };
}

function updatePushDevice(key, serial, ip, extra) {
  const existing = PUSH_DEVICES[key] || {};
  PUSH_DEVICES[key] = {
    last_seen: nowStr(),
    ip,
    serial: serial || existing.serial || 'desconhecido',
    poll_count: (existing.poll_count || 0) + 1,
    ...(extra || {}),
  };
}

function isOnline(info) {
  if (!info?.last_seen) return false;
  try {
    const [d, t] = info.last_seen.split(' ');
    const [dd, mm, yyyy] = d.split('/');
    const [hh, mi, ss] = t.split(':');
    const last = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss));
    return (Date.now() - last.getTime()) < 90000;
  } catch { return false; }
}

function extractEvents(body, deviceKey, serial, ip) {
  let count = 0;
  const sources = [
    ...(body.transactions || []),
    ...(body.events || []),
    ...(body.logs || []),
  ];
  for (const item of sources) {
    if (item.user_id || item.userId || item.id_user || item.event || item.type) {
      PUSH_EVENTS.unshift({
        received_at: nowStr(),
        device_id: deviceKey,
        serial: serial || 'desconhecido',
        ip,
        data: item,
      });
      count++;
    }
  }
  if (PUSH_EVENTS.length > 2000) PUSH_EVENTS.length = 2000;
  return count;
}

app.all(['/push', '/api/push/poll'], (req, res) => {
  const { key, serial, ip } = resolveDeviceId(req);
  updatePushDevice(key, serial, ip);

  if (req.method === 'POST') {
    const body = req.body || {};
    extractEvents(body, key, serial, ip);
  }

  if (PUSH_CMDS.length > 0) {
    const cmd = PUSH_CMDS.shift();
    return res.json(cmd);
  }

  res.json({ transactions: [] });
});

app.post(['/result', '/api/push/result'], (req, res) => {
  const data = req.body || {};
  const { key, serial, ip } = resolveDeviceId(req);

  PUSH_RESULTS.unshift({
    received_at: nowStr(),
    device_id: key,
    serial: serial || PUSH_DEVICES[key]?.serial || 'desconhecido',
    ip,
    data,
  });
  if (PUSH_RESULTS.length > 500) PUSH_RESULTS.length = 500;

  if (PUSH_DEVICES[key]) PUSH_DEVICES[key].last_seen = nowStr();
  res.json({ success: true });
});

app.post(['/event', '/api/push/event'], (req, res) => {
  const data = req.body || {};
  const { key, serial, ip } = resolveDeviceId(req);

  PUSH_EVENTS.unshift({
    received_at: nowStr(),
    device_id: key,
    serial: serial || PUSH_DEVICES[key]?.serial || 'desconhecido',
    ip,
    data,
  });
  if (PUSH_EVENTS.length > 2000) PUSH_EVENTS.length = 2000;

  if (PUSH_DEVICES[key]) {
    PUSH_DEVICES[key].last_seen = nowStr();
  } else {
    updatePushDevice(key, serial, ip);
  }
  res.json({ success: true });
});

app.get('/api/push/devices', auth, (req, res) => {
  const maxAgeH = parseInt(req.query.max_age_hours) || 24;
  const cutoff = Date.now() - maxAgeH * 3600 * 1000;

  const sorted = Object.entries(PUSH_DEVICES)
    .sort((a, b) => (b[1].last_seen || '').localeCompare(a[1].last_seen || ''));

  const seenSerials = new Set();
  const seenIPs = new Set();
  const result = {};

  for (const [key, info] of sorted) {
    try {
      const [d, t] = info.last_seen.split(' ');
      const [dd, mm, yyyy] = d.split('/');
      const [hh, mi, ss] = t.split(':');
      const last = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi), parseInt(ss));
      if (last.getTime() < cutoff) continue;
    } catch { continue; }

    const serial = info.serial || '';
    const ip = info.ip || '';

    if (serial && serial !== 'desconhecido') {
      if (seenSerials.has(serial)) continue;
      seenSerials.add(serial);
    } else if (ip) {
      if (seenIPs.has(ip)) continue;
      seenIPs.add(ip);
    }

    result[key] = { ...info, online: isOnline(info) };
  }

  res.json({ devices: result });
});

app.get('/api/push/events', auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ events: PUSH_EVENTS.slice(0, limit) });
});

app.get('/api/push/results', auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ results: PUSH_RESULTS.slice(0, limit) });
});

app.post('/api/push/cmd', auth, (req, res) => {
  const data = req.body;
  if (!data) return res.status(400).json({ error: 'Body inválido' });

  const cmdId = randomUUID().slice(0, 8);
  const cmd = {
    transactions: [{
      id: cmdId,
      method: data.method || 'POST',
      url: data.url || '/',
      body: data.body || {},
    }],
  };
  PUSH_CMDS.push(cmd);
  res.json({ success: true, cmd_id: cmdId, queued: PUSH_CMDS.length });
});

app.post('/api/push/clear', auth, (req, res) => {
  PUSH_RESULTS.length = 0;
  PUSH_CMDS.length = 0;
  res.json({ success: true });
});

app.post('/api/push/clear_events', auth, (req, res) => {
  PUSH_EVENTS.length = 0;
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROXY FCGI (comunicação direta com iDFace)
// ═══════════════════════════════════════════════════════════════════════════════

function proxyFCGI(protocol, ip, porta, command, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data || {});
    const port = porta || 80;
    const qsIdx = command.indexOf('?');
    const path = qsIdx >= 0 ? `/${command.slice(0, qsIdx)}.fcgi${command.slice(qsIdx)}` : `/${command}.fcgi`;
    const mod = protocol === 'http' ? http : https;
    const opts = {
      hostname: ip,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 10000,
      rejectUnauthorized: false,
    };
    if (protocol === 'https') opts.insecureHTTPParser = true;

    const req = mod.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ raw: body }); }
      });
    });
    req.on('error', (e) => reject(e.message));
    req.on('timeout', () => { req.destroy(); reject('Timeout'); });
    req.write(payload);
    req.end();
  });
}

function proxy(ip, porta, command, data) {
  return proxyFCGI('https', ip, porta, command, data).catch((err) => {
    if (
      err.includes('ECONNRESET') || err.includes('SSL') ||
      err.includes('tls') || err.includes('protocol') || err.includes('Parse Error')
    ) {
      return proxyFCGI('http', ip, porta, command, data);
    }
    throw err;
  });
}

async function ensureSession(ip, porta, usuario, senha, session) {
  if (session) return session;
  const login = await proxy(ip, porta, 'login', { login: usuario || 'admin', password: senha || 'admin' });
  if (!login.session) throw new Error('Falha no login do equipamento');
  return login.session;
}

app.post('/api/proxy/login', auth, async (req, res) => {
  const { ip, porta, usuario, senha } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, null);
    res.json({ session: sess, base_url: `http://${ip}:${porta || 80}` });
  } catch (e) {
    res.status(502).json({ error: 'Falha na comunicação com o equipamento', detalhe: e.toString() });
  }
});

app.post('/api/proxy/users/load', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const result = await proxy(ip, porta, `load_objects?session=${encodeURIComponent(sess)}`, { object: 'users' });
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Falha ao carregar usuários', detalhe: e.toString() });
  }
});

app.post('/api/proxy/users/create', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, values } = req.body;
  if (!ip || !values) return res.status(400).json({ error: 'IP e values são obrigatórios' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const result = await proxy(ip, porta, `create_objects?session=${encodeURIComponent(sess)}`, { object: 'users', values });
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Falha ao criar usuário', detalhe: e.toString() });
  }
});

app.post('/api/proxy/users/modify', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, id, name } = req.body;
  if (!ip || !id) return res.status(400).json({ error: 'IP e id são obrigatórios' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const result = await proxy(ip, porta, `modify_objects?session=${encodeURIComponent(sess)}`, {
      object: 'users',
      values: { name, registration: String(id) },
      where: { users: { id: { '=': parseInt(id) } } },
    });
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Falha ao modificar usuário', detalhe: e.toString() });
  }
});

app.post('/api/proxy/users/destroy', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, id } = req.body;
  if (!ip || !id) return res.status(400).json({ error: 'IP e id são obrigatórios' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const result = await proxy(ip, porta, `destroy_objects?session=${encodeURIComponent(sess)}`, {
      object: 'users',
      where: { users: { id: parseInt(id) } },
    });
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Falha ao excluir usuário', detalhe: e.toString() });
  }
});

app.post('/api/proxy/face/upload', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, user_id } = req.body;
  if (!ip || !user_id) return res.status(400).json({ error: 'IP e user_id são obrigatórios' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const result = await proxy(ip, porta, `user_set_image?session=${encodeURIComponent(sess)}&user_id=${parseInt(user_id)}&timestamp=${Math.floor(Date.now() / 1000)}`, req.body.image_data || {});
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Falha ao enviar foto', detalhe: e.toString() });
  }
});

app.post('/api/proxy/logs', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, limit } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);

    const tables = ['access_logs', 'logs', 'access', 'identifications', 'accesses', 'records', 'events_log'];
    let result = null;

    for (const table of tables) {
      try {
        const r = await proxy(ip, porta, `load_objects?session=${encodeURIComponent(sess)}`, {
          object: table,
          ...(limit ? { limit: parseInt(limit), order: { [table]: { id: 'desc' } } } : { limit: 20 }),
        });
        const values = Object.values(r).find(v => Array.isArray(v));
        if (values) {
          result = r;
          break;
        }
      } catch {}
    }

    res.json(result || { error: 'Nenhuma tabela de logs encontrada' });
  } catch (e) {
    res.status(502).json({ error: 'Falha ao carregar logs', detalhe: e.toString() });
  }
});

app.post('/api/proxy/config', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, config } = req.body;
  if (!ip || !config) return res.status(400).json({ error: 'IP e config são obrigatórios' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const result = await proxy(ip, porta, `set_configuration?session=${encodeURIComponent(sess)}`, config);
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: 'Falha ao configurar equipamento', detalhe: e.toString() });
  }
});

app.post('/api/proxy/info', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP é obrigatório' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);
    const [systemInfo, config] = await Promise.all([
      proxy(ip, porta, `get_system_info?session=${encodeURIComponent(sess)}`, {}).catch(() => ({})),
      proxy(ip, porta, `get_configuration?session=${encodeURIComponent(sess)}`, {}).catch(() => ({})),
    ]);
    res.json({
      session: sess,
      serial: systemInfo.serial || systemInfo.system?.serial || '',
      system: systemInfo,
      config,
    });
  } catch (e) {
    res.status(502).json({ error: 'Falha ao obter informações', detalhe: e.toString() });
  }
});

app.post('/api/proxy/action', auth, async (req, res) => {
  const { ip, porta, usuario, senha, session, action } = req.body;
  if (!ip || !action) return res.status(400).json({ error: 'IP e action são obrigatórios' });
  if (action === 'reboot' && !req.body.confirm) return res.status(400).json({ error: 'Confirmação necessária' });

  try {
    const sess = await ensureSession(ip, porta, usuario, senha, session);

    if (action === 'door') {
      const result = await proxy(ip, porta, `execute_actions?session=${encodeURIComponent(sess)}`, {
        actions: [{ action: 'door', parameters: 'door=1' }],
      });
      return res.json(result);
    }
    if (action === 'lock') {
      const result = await proxy(ip, porta, `set_configuration?session=${encodeURIComponent(sess)}`, { portal: { lock: true } });
      return res.json(result);
    }
    if (action === 'unlock') {
      const result = await proxy(ip, porta, `set_configuration?session=${encodeURIComponent(sess)}`, { portal: { lock: false } });
      return res.json(result);
    }
    if (action === 'reboot') {
      const result = await proxy(ip, porta, `reboot?session=${encodeURIComponent(sess)}`, {});
      return res.json(result);
    }

    res.status(400).json({ error: `Ação desconhecida: ${action}` });
  } catch (e) {
    res.status(502).json({ error: 'Falha ao executar ação', detalhe: e.toString() });
  }
});

// ── Error handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`FaceCloud rodando em http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Push: http://localhost:${PORT}/push`);
});
