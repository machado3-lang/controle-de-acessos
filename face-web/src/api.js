const API_BASE = '/api';
const API_TOKEN = 'face-cloud-token-2024';

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
});

async function apiFetch(path, options = {}) {
  try {
    const r = await fetch(`${API_BASE}${path}`, {
      headers: headers(),
      ...options,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch (e) {
    throw e;
  }
}

export const api = {
  auth: {
    async login(username, password) {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return r.json();
    },
  },

  devices: {
    list: () => apiFetch('/devices').catch(() => JSON.parse(localStorage.getItem('face_devices') || '[]')),
    save: async (dev) => {
      try {
        if (dev.id) {
          return await apiFetch(`/devices/${dev.id}`, {
            method: 'PUT',
            body: JSON.stringify(dev),
          });
        }
        return await apiFetch('/devices', {
          method: 'POST',
          body: JSON.stringify(dev),
        });
      } catch {
        const all = JSON.parse(localStorage.getItem('face_devices') || '[]');
        if (dev.id) {
          const idx = all.findIndex(d => d.id === dev.id);
          if (idx >= 0) all[idx] = dev;
        } else {
          dev.id = Date.now().toString(36);
          all.push(dev);
        }
        localStorage.setItem('face_devices', JSON.stringify(all));
        return dev;
      }
    },
    remove: async (id) => {
      try {
        return await apiFetch(`/devices/${id}`, { method: 'DELETE' });
      } catch {
        const all = JSON.parse(localStorage.getItem('face_devices') || '[]');
        localStorage.setItem('face_devices', JSON.stringify(all.filter(d => d.id !== id)));
        return { ok: true };
      }
    },
    getActive: () => Promise.resolve(JSON.parse(localStorage.getItem('face_active_device') || 'null')),
    setActive: (dev) => localStorage.setItem('face_active_device', JSON.stringify(dev)),
  },

  users: {
    list: () => apiFetch('/users').catch(() => {
      const stored = localStorage.getItem('face_users');
      return stored ? Object.values(JSON.parse(stored)) : [];
    }),
    save: async (user) => {
      try {
        const exists = await apiFetch('/users').catch(() => []);
        const found = Array.isArray(exists) ? exists.find(u => u.id === user.id) : null;
        if (found) {
          return await apiFetch(`/users/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify(user),
          });
        }
        return await apiFetch('/users', {
          method: 'POST',
          body: JSON.stringify(user),
        });
      } catch {
        const all = JSON.parse(localStorage.getItem('face_users') || '{}');
        all[user.id] = user;
        localStorage.setItem('face_users', JSON.stringify(all));
        return user;
      }
    },
    remove: async (id) => {
      try {
        return await apiFetch(`/users/${id}`, { method: 'DELETE' });
      } catch {
        const all = JSON.parse(localStorage.getItem('face_users') || '{}');
        delete all[id];
        localStorage.setItem('face_users', JSON.stringify(all));
        return { ok: true };
      }
    },
    sync: async (users) => {
      try {
        return await apiFetch('/users/sync', {
          method: 'POST',
          body: JSON.stringify({ users }),
        });
      } catch {
        const obj = {};
        for (const u of users) obj[u.id] = u;
        localStorage.setItem('face_users', JSON.stringify(obj));
        return { total: users.length };
      }
    },
  },

  logs: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/logs${qs ? '?' + qs : ''}`).catch(() => {
        const logs = JSON.parse(localStorage.getItem('face_logs') || '[]');
        return { total: logs.length, offset: 0, limit: 100, logs };
      });
    },
    add: async (log) => {
      try {
        return await apiFetch('/logs', {
          method: 'POST',
          body: JSON.stringify({ logs: [log] }),
        });
      } catch {
        const all = JSON.parse(localStorage.getItem('face_logs') || '[]');
        all.unshift(log);
        if (all.length > 500) all.length = 500;
        localStorage.setItem('face_logs', JSON.stringify(all));
        return { ok: true };
      }
    },
    clear: async () => {
      try {
        return await apiFetch('/logs', { method: 'DELETE' });
      } catch {
        localStorage.setItem('face_logs', '[]');
        return { ok: true };
      }
    },
  },

  config: {
    get: () => apiFetch('/config').catch(() => JSON.parse(localStorage.getItem('face_config') || '{}')),
    set: async (key, val) => {
      try {
        return await apiFetch('/config', {
          method: 'POST',
          body: JSON.stringify({ [key]: val }),
        });
      } catch {
        const cfg = JSON.parse(localStorage.getItem('face_config') || '{}');
        cfg[key] = val;
        localStorage.setItem('face_config', JSON.stringify(cfg));
        return cfg;
      }
    },
  },

  push: {
    async health(url) {
      const r = await fetch(`${url}/api/health`);
      return r.json();
    },
    async devices(url, token) {
      const r = await fetch(`${url}/api/push/devices?max_age_hours=24`, {
        headers: { 'X-Access-Token': token, 'Authorization': `Bearer ${token}` },
      });
      return r.json();
    },
    async events(url, token) {
      const r = await fetch(`${url}/api/push/events?limit=50`, {
        headers: { 'X-Access-Token': token, 'Authorization': `Bearer ${token}` },
      });
      return r.json();
    },
    async results(url, token) {
      const r = await fetch(`${url}/api/push/results?limit=30`, {
        headers: { 'X-Access-Token': token, 'Authorization': `Bearer ${token}` },
      });
      return r.json();
    },
    async sendCmd(url, token, method, endpoint, body) {
      const r = await fetch(`${url}/api/push/cmd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Token': token, 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ method, url: endpoint, body }),
      });
      return r.json();
    },
    async clear(url, token) {
      await fetch(`${url}/api/push/clear`, {
        method: 'POST',
        headers: { 'X-Access-Token': token, 'Authorization': `Bearer ${token}` },
      });
    },
    async clearEvents(url, token) {
      await fetch(`${url}/api/push/clear_events`, {
        method: 'POST',
        headers: { 'X-Access-Token': token, 'Authorization': `Bearer ${token}` },
      });
    },
  },

  proxy: {
    async login(ip, porta, usuario, senha) {
      const r = await fetch(`${API_BASE}/proxy/login`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha }),
      });
      return r.json();
    },
    async loadUsers(ip, porta, usuario, senha, session) {
      const r = await fetch(`${API_BASE}/proxy/users/load`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session }),
      });
      return r.json();
    },
    async createUser(ip, porta, usuario, senha, session, id, name) {
      const r = await fetch(`${API_BASE}/proxy/users/create`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session, values: [{ id, name, registration: String(id) }] }),
      });
      return r.json();
    },
    async updateUser(ip, porta, usuario, senha, session, id, name) {
      const r = await fetch(`${API_BASE}/proxy/users/modify`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session, id, name }),
      });
      return r.json();
    },
    async deleteUser(ip, porta, usuario, senha, session, id) {
      const r = await fetch(`${API_BASE}/proxy/users/destroy`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session, id }),
      });
      return r.json();
    },
    async loadLogs(ip, porta, usuario, senha, session, limit) {
      const r = await fetch(`${API_BASE}/proxy/logs`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session, limit }),
      });
      return r.json();
    },
    async getInfo(ip, porta, usuario, senha, session) {
      const r = await fetch(`${API_BASE}/proxy/info`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session }),
      });
      return r.json();
    },
    async action(ip, porta, usuario, senha, session, action, confirm) {
      const r = await fetch(`${API_BASE}/proxy/action`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session, action, confirm }),
      });
      return r.json();
    },
    async configurePush(ip, porta, usuario, senha, session, pushUrl, serial) {
      const config = {
        push_server: {
          push_remote_address: pushUrl,
          push_request_timeout: '30000',
          push_request_period: '5',
        },
      };
      if (serial) config.push_server.push_attributes = `serial=${serial}`;
      const r = await fetch(`${API_BASE}/proxy/config`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ip, porta, usuario, senha, session, config }),
      });
      return r.json();
    },
  },
};
