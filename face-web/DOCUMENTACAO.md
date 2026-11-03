# MultiAcesso — Sistema de Controle Facial iDFace

## Visão Geral

Sistema completo para gerenciamento de dispositivos de controle facial **ControlID iDFace**. Permite cadastro de equipamentos, usuários, fotos faciais, monitoramento de acessos em tempo real, relatórios de acesso, e comunicação remota via servidor Push.

**Arquitetura:** Frontend React + Vite (`face-web`) | Backend Node.js + Express (`face-cloud`) | Banco: JSON (local no cloud) + localStorage (fallback no navegador).

---

## Estrutura do Projeto

```
Pontos/
├── docker-compose.yml            # Orquestração Docker (face-cloud + face-web)
│
├── face-cloud/                   # BACKEND — API + Push Protocol + Proxy FCGI
│   ├── server.js                 # Servidor Express com todas as rotas (498 linhas)
│   ├── package.json              # Dependências: express, cors, uuid
│   ├── Dockerfile                # Imagem Node 20 Alpine
│   └── data/
│       └── database.json         # Banco de dados JSON (devices, users, logs, config)
│
└── face-web/                     # FRONTEND — SPA React + Vite
    ├── index.html                # Entrypoint HTML
    ├── vite.config.js            # Config Vite (proxy /api → :3100)
    ├── nginx.conf                # Config Nginx para Docker
    ├── package.json              # Dependências: react, lucide-react
    ├── Dockerfile                # Multi-stage: build Node + Nginx
    ├── src/
    │   ├── main.jsx              # Bootstrap React
    │   ├── App.jsx               # Componente raiz (sidebar, navegação, 6 abas)
    │   ├── index.css             # Design system completo (dark mode, glassmorphism)
    │   ├── api.js                # API client (face-cloud + localStorage fallback)
    │   ├── ConfirmModal.jsx      # Modal de confirmação reutilizável
    │   ├── DashboardTab.jsx      # Aba: visão geral + stats + equipamento ativo
    │   ├── DevicesTab.jsx        # Aba: CRUD de equipamentos iDFace
    │   ├── UsersTab.jsx          # Aba: CRUD de usuários + upload foto facial
    │   ├── LogsTab.jsx           # Aba: logs de acesso ao vivo
    │   ├── ReportsTab.jsx        # Aba: relatórios com exportação CSV/HTML
    │   └── RemoteTab.jsx         # Aba: servidor Push + ações remotas + monitor
    ├── public/                   # Arquivos estáticos
    └── dist/                     # Build de produção (gerado)
```

---

## BACKEND — face-cloud

### Tecnologias

- **Node.js 20+** com ES Modules (`"type": "module"`)
- **Express 4.21** — servidor HTTP
- **CORS** — habilitado para todas origens
- **UUID** — geração de IDs únicos
- Armazenamento em **arquivo JSON** (`data/database.json`)

### Inicialização

```bash
cd Pontos/face-cloud
npm install
npm start        # Produção: porta 3100
npm run dev      # Desenvolvimento com --watch
```

### Variáveis de Ambiente

- `PORT` — porta do servidor (padrão: `3100`)
- `API_TOKEN` — token de autenticação Bearer (padrão: `face-cloud-token-2024`)

### Endpoints da API

#### Saúde

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check (público) |

#### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login admin/admin → devolve token + session UUID |

#### Dispositivos (CRUD)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/devices` | Lista todos dispositivos |
| POST | `/api/devices` | Cria novo dispositivo |
| PUT | `/api/devices/:id` | Atualiza dispositivo |
| DELETE | `/api/devices/:id` | Remove dispositivo |

#### Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/users` | Lista todos usuários |
| POST | `/api/users` | Cria novo usuário |
| PUT | `/api/users/:id` | Atualiza usuário |
| DELETE | `/api/users/:id` | Remove usuário |
| POST | `/api/users/sync` | Sincroniza lote de usuários |

#### Logs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/logs` | Lista logs (com filtros: limit, offset, user_id, data_inicio, data_fim) |
| POST | `/api/logs` | Importa logs |
| DELETE | `/api/logs` | Limpa todos logs |

#### Configurações

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/config` | Obtém configurações |
| POST | `/api/config` | Atualiza configurações |

### Protocolo Push (compatível com iDFace)

O equipamento iDFace faz polling periódico no servidor Push para enviar eventos e receber comandos.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/push` | Poll do equipamento (GET: busca comandos, POST: envia eventos + busca comandos) |
| GET/POST | `/api/push/poll` | Poll alternativo |
| POST | `/result` | Resultado de comando executado |
| POST | `/api/push/result` | Resultado alternativo |
| POST | `/event` | Evento de acesso |
| POST | `/api/push/event` | Evento alternativo |
| GET | `/api/push/devices` | Lista dispositivos (com status online/offline) |
| GET | `/api/push/events` | Eventos de acesso recebidos |
| GET | `/api/push/results` | Resultados de comandos |
| POST | `/api/push/cmd` | Enfileira comando para o equipamento |
| POST | `/api/push/clear` | Limpa fila de comandos e resultados |
| POST | `/api/push/clear_events` | Limpa histórico de eventos |

#### Headers do Push Protocol

O equipamento deve enviar:
- `X-Device-Serial` — número de série do dispositivo
- `X-Device-Id` — identificador alternativo
- `X-Firmware-Version` — versão do firmware

Os eventos são extraídos de:
- `transactions` — formato principal do iDFace
- `events` — formato alternativo
- `logs` — formato de log

### Proxy FCGI (comunicação direta com iDFace)

O backend atua como **proxy reverso** para equipamentos iDFace. A comunicação usa o protocolo **FCGI** (`.fcgi`) via HTTP/HTTPS. O proxy tenta primeiro HTTPS e faz fallback para HTTP em caso de erros de TLS.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/proxy/login` | Autentica no equipamento (`{ login/name, password }` → session) |
| POST | `/api/proxy/users/load` | Carrega usuários do equipamento |
| POST | `/api/proxy/users/create` | Cria usuário no equipamento |
| POST | `/api/proxy/users/modify` | Modifica usuário no equipamento |
| POST | `/api/proxy/users/destroy` | Remove usuário do equipamento |
| POST | `/api/proxy/face/upload` | Envia foto facial para o equipamento |
| POST | `/api/proxy/logs` | Carrega logs de acesso do equipamento |
| POST | `/api/proxy/info` | Obtém informações do equipamento (serial, firmware, status) |
| POST | `/api/proxy/config` | Configura push server no equipamento |
| POST | `/api/proxy/action` | Executa ação remota (door, lock, unlock, reboot) |

#### Proxy FCGI — Fluxo de comunicação

1. **Login**: POST para `login.fcgi` com `{ login, password }` → recebe `session`
2. **Comandos**: usa `session` nas chamadas seguintes como query param
3. Fallback automático HTTPS → HTTP se houver erros de TLS

#### Ações remotas disponíveis

| Ação | Endpoint FCGI | Payload |
|------|---------------|---------|
| Abrir porta | `execute_actions.fcgi` | `{ actions: [{ action: "door", parameters: "door=1" }] }` |
| Bloquear | `set_configuration.fcgi` | `{ portal: { lock: true } }` |
| Liberar | `set_configuration.fcgi` | `{ portal: { lock: false } }` |
| Reiniciar | `reboot.fcgi` | `{}` (requer confirmação) |

### Autenticação

Todas as rotas internas (`/api/devices`, `/api/users`, `/api/logs`, `/api/config`, `/api/push/*`, `/api/proxy/*`) exigem header:

```
Authorization: Bearer <API_TOKEN>
```

A rota `/api/health` e `/push` são públicas.

---

## FRONTEND — face-web

### Tecnologias

- **React 19** — biblioteca de UI
- **Vite 8** — bundler e dev server
- **lucide-react** — ícones
- **CSS Variables** — design system completo

### Inicialização

```bash
cd Pontos/face-web
npm install
npm run dev      # Dev server → http://localhost:5173 (proxy /api → :3100)
npm run build    # Build produção → dist/
npm run preview  # Preview do build
```

### Funcionalidades por Aba

#### Dashboard
- Stats cards: equipamentos cadastrados, usuários, total de acessos, status do dispositivo
- Equipamento ativo com detalhes (nome, IP, serial, descrição)
- Últimos acessos registrados
- Botão conectar/desconectar

#### Equipamentos
- CRUD completo de equipamentos iDFace
- Campos: nome, IP, porta, serial, usuário, senha, descrição
- Lista com status (conectado/offline)
- Ações: conectar, editar, excluir
- Validação de campos obrigatórios

#### Usuários
- CRUD completo de usuários
- Campos: ID numérico, nome completo, matrícula
- Lista com busca em tempo real (por ID ou nome)
- Upload de foto facial (JPG/PNG)
- Feedback visual de operações

#### Logs de Acesso
- Tabela com data/hora, user ID, nome, status (Permitido/Negado)
- Auto-refresh a cada 10 segundos (toggle)
- Exportação para CSV
- Limpar logs

#### Relatórios
- Filtro por data início/fim e ID do usuário (opcional)
- Exportação em CSV (abre no Excel)
- Exportação em HTML imprimível (formulário para impressão)
- Observações sobre o uso

#### Acesso Remoto
- **Servidor Push**: URL + token, testar conexão, status
- **Ações remotas**: abrir porta, bloquear acesso, liberar acesso, reiniciar equipamento
- **Monitor**: 
  - Dispositivos conectados (serial, IP, status online/offline, último contato)
  - Eventos de acesso ao vivo (últimos 10)
  - Resultados de comandos (últimos 10)
- Auto-refresh a cada 15 segundos (toggle)
- Botões: limpar eventos, limpar tudo

### Design System

O design segue o mesmo padrão do **MultiPonto** com paleta adaptada:

- **Paleta**: Roxo (`#7c3aed`) + Ciano (`#06b6d4`) + Rosa (`#f43f5e`)
- **Fundo**: Dark mode com `#0b1120` e blobs decorativos
- **Glassmorphism**: Cards com `backdrop-filter: blur(16px)` e bordas semi-transparentes
- **Sidebar**: 260px com navegação por ícones Lucide
- **Tabelas**: `data-table` com hover, cabeçalho uppercase
- **Badges**: `success` (ciano), `warning` (amarelo), `danger` (rosa), `neutral` (cinza)
- **Animações**: `fade-in`, `pulse`, hover com translateY
- **Componentes reutilizáveis**: glass-card, form-input, btn-primary, btn-secondary, confirm-modal

### Variáveis CSS

```css
:root {
  --bg-primary: #0b1120;
  --bg-secondary: #111827;
  --glass-bg: rgba(17, 24, 39, 0.7);
  --glass-border: rgba(255, 255, 255, 0.08);
  --accent-primary: #7c3aed;
  --accent-secondary: #06b6d4;
  --accent-tertiary: #f43f5e;
  --accent-gradient: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --success: #06b6d4;
  --warning: #f59e0b;
  --danger: #f43f5e;
}
```

### API Client (api.js)

O frontend possui uma camada de API que:

1. **Tenta o backend primeiro** (`/api/*`) com autenticação Bearer
2. **Faz fallback para localStorage** se o backend estiver offline
3. **Proxy FCGI**: Comunicação direta com iDFace via `face-cloud` como proxy

```javascript
// Exemplo de uso:
import { api } from './api';

// Listar dispositivos (cloud → localStorage fallback)
const devices = await api.devices.list();

// Proxy: conectar direto no iDFace
const { session } = await api.proxy.login('192.168.1.100', '80', 'admin', 'senha');

// Push: enviar comando remoto
await api.push.sendCmd('https://servidor.com', 'token', 'POST', '/reboot.fcgi', {});
```

---

## INFRAESTRUTURA

### Docker Compose

```yaml
# docker-compose.yml (dentro de Pontos/)
services:
  face-cloud:
    build: ./face-cloud
    container_name: face-cloud
    ports:
      - "3101:3100"     # host:3101 → container:3100
    volumes:
      - face-cloud-data:/app/data
    environment:
      - PORT=3100
      - API_TOKEN=face-cloud-token-2024

  face-web:
    build: ./face-web
    container_name: face-web
    ports:
      - "81:80"          # host:81 → container:80
    depends_on:
      - face-cloud
```

```bash
docker compose up -d face-cloud face-web   # Sobe os serviços
docker compose logs -f face-cloud          # Logs em tempo real
```

### Deploy Manual

```bash
# 1. Build + Docker
cd Pontos
docker compose build face-cloud face-web
docker compose up -d face-cloud face-web

# 2. Acessar
# Frontend: http://localhost:81
# Backend:  http://localhost:3101/api/health
```

### Volumes

- `face-cloud-data` — Persistência dos dados em `/app/data/database.json`

---

## BANCO DE DADOS

### JSON local (face-cloud/data/database.json)

```json
{
  "devices": {
    "<uuid>": {
      "id": "uuid",
      "nome": "Portaria Principal",
      "ip": "192.168.1.100",
      "porta": "80",
      "serial": "IDFACE123",
      "usuario": "admin",
      "descricao": "Acesso funcionários",
      "criado_em": "2026-05-21T10:00:00.000Z"
    }
  },
  "users": {
    "<id>": {
      "id": 123,
      "name": "João Silva",
      "registration": "123",
      "atualizado": "2026-05-21T10:00:00.000Z"
    }
  },
  "logs": [
    {
      "data_hora": "2026-05-21T10:30:00.000Z",
      "user_id": 123,
      "nome": "João Silva",
      "status": "Permitido",
      "importado": "2026-05-21T10:30:00.000Z"
    }
  ],
  "config": {
    "push_url": "https://meu-servidor.com",
    "push_token": "meu-token"
  }
}
```

### localStorage (navegador — fallback)

O frontend usa localStorage para operação standalone offline:

- `face_devices` — equipamentos cadastrados
- `face_users` — usuários cadastrados
- `face_logs` — logs de acesso
- `face_config` — configurações
- `face_active_device` — equipamento ativo
- `face_push_url` / `face_push_token` — servidor push

---

## PROTOCOLO DE COMUNICAÇÃO COM iDFace

### Fluxo Push (nuvem)

```
┌─────────────┐         GET/POST /push         ┌──────────────┐
│             │ ◄────────────────────────────►  │              │
│  iDFace     │         POST /result            │  face-cloud  │
│  (equip.)   │ ◄────────────────────────────   │  (servidor)  │
│             │         POST /event             │              │
│             │ ◄────────────────────────────   │              │
└─────────────┘                                  └──────┬───────┘
                                                         │
                                                         │ /api/*
                                                         │
                                                  ┌──────▼───────┐
                                                  │   face-web   │
                                                  │  (frontend)  │
                                                  └──────────────┘
```

### Fluxo Proxy (local)

```
┌─────────────┐    POST /api/proxy/*   ┌──────────────┐    HTTP/HTTPS    ┌─────────────┐
│  face-web   │ ──────────────────────►│  face-cloud  │ ───────────────►│   iDFace    │
│  (navegador)│                        │  (proxy)     │ ◄───────────────│  (equip.)   │
└─────────────┘                        └──────────────┘    .fcgi        └─────────────┘
```

---

## Próximos Passos / Sugestões de Melhoria

### Pendências do código original (Python Tkinter) não migradas

- [ ] **Gerar relatórios Excel (.xlsx) e PDF** — atualmente só CSV e HTML
- [ ] **WebSocket para logs ao vivo** — substituir polling por conexão real-time
- [ ] **Autenticação com Supabase** (como o MultiPonto) — login por email/senha
- [ ] **Multi-usuário** — diferentes níveis de acesso (admin, operador, visualizador)
- [ ] **Upload de foto via FormData** — o proxy FCGI precisa enviar o binário da imagem

### Melhorias de UX

- [ ] **Dark/Light mode toggle**
- [ ] **Responsividade** — adaptar sidebar para mobile
- [ ] **Notificações toast** — substituir mensagens inline por notificações
- [ ] **Paginação nas tabelas** — especialmente logs e usuários
- [ ] **Gráficos** — adicionar Chart.js ou Recharts para dashboard visual

### Infraestrutura

- [ ] **Deploy na Vercel + Render** (como o MultiPonto)
- [ ] **CI/CD** — GitHub Actions para build automático
- [ ] **Banco PostgreSQL via Supabase** — substituir JSON storage
- [ ] **Variáveis de ambiente** — `.env.example` com documentação

---

## Observações Finais

- O frontend funciona **standalone** via localStorage sem backend
- O backend **não requer** banco externo — usa JSON file storage
- O proxy FCGI tenta HTTPS primeiro, com fallback HTTP automático
- Para desenvolvimento, use `npm run dev` em ambos os projetos simultaneamente
- Para produção, use Docker Compose ou deploy separado

---

*Documentação gerada em 21/05/2026 — Projeto MultiAcesso v1.0.0*
