# MultiAcesso — Controle de Acesso Facial iDFace

Sistema de gerenciamento de dispositivos de controle facial **ControlID iDFace**: cadastro de equipamentos, usuários, fotos faciais, monitoramento de acessos, relatórios e comunicação remota via servidor Push.

## Arquitetura

- **Frontend:** React + Vite (`face-web`)
- **Backend:** Node.js + Express (`face-cloud`)
- **Banco:** JSON local no backend + `localStorage` (fallback no navegador)
- **Comunicação:** proxy HTTP para os equipamentos + servidor Push

## Estrutura

```
controle-de-acessos/
├── face-cloud/            # Backend (Express)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── face-web/              # Frontend (React + Vite)
│   ├── src/
│   ├── DOCUMENTACAO.md    # Documentação detalhada
│   ├── package.json
│   └── Dockerfile
├── .env.example
└── docker-compose.yml
```

## Como rodar

### Desenvolvimento

```bash
# Backend
cd face-cloud
npm install
npm run dev            # porta 3100

# Frontend (outro terminal)
cd face-web
npm install
npm run dev            # porta 5173 (proxy /api → 3100)
```

### Docker

```bash
cp .env.example .env
# preencha API_TOKEN
docker compose up -d --build
```

- Frontend: `http://localhost:81`
- Backend: `http://localhost:3101`

## Documentação

- [face-web/DOCUMENTACAO.md](face-web/DOCUMENTACAO.md) — visão funcional, API, protocolo dos equipamentos e banco JSON.

## Observações

- O frontend usa `/api` e o Nginx faz proxy para `face-cloud:3100`.
- O token padrão (`face-cloud-token-2024`) é o mesmo usado em `face-web/src/api.js`. Para trocar, atualize os dois (ou migre para uma variável de build `VITE_FACECLOUD_TOKEN`).
- Dados de runtime (`face-cloud/data/*.json`) não são versionados.
- O **MultiPonto** (sistema de pontos) é um projeto separado, no repositório `sistema-de-pontos`.
