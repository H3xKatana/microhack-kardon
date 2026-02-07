# Kardon

Self-hosted project management built for the Microhack hackathon.

## What is this?

Kardon is a project management platform you run on your own servers. Similar to Linear or Jira, but you keep full control of your data.

## Why self-hosted?

- Keep project data on your infrastructure
- No per-seat pricing
- Use cheaper AI models (Kimi, MiniMax instead of GPT-4)
- Meet compliance requirements (GDPR, SOC2, local data laws)
- Customize and extend as needed

## Stack

- **Frontend**: React Router 7, TypeScript, MobX, Tailwind CSS
- **Backend**: Django REST Framework, PostgreSQL, Redis (Valkey)
- **Real-time**: Hocuspocus + Yjs for collaborative editing
- **File storage**: MinIO (S3-compatible)
- **Task queue**: RabbitMQ + Celery
- **AI**: OpenAI, Anthropic, or Google Gemini APIs

## Quick Start

```bash
# Install
pnpm install

# Configure
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# Start infrastructure
docker compose -f docker-compose-local.yml up -d

# Database setup
cd apps/api && python manage.py migrate && cd ../..

# Run
cd /home/morta/hackathon/microhack-kardon && pnpm dev
```

Access at http://localhost:3000

## Structure

```
apps/
  web/       - Main React app (localhost:3000)
  space/     - Public pages (localhost:3002)
  admin/     - Admin panel (localhost:3001)
  api/       - Django API (localhost:8000)
  live/      - Real-time collaboration (localhost:3100)

packages/    - Shared components and utilities
```

## Features

- Project management (issues, cycles, modules, roadmaps)
- Real-time collaborative editing
- Rich text editor with markdown support
- File uploads and attachments
- Multiple auth methods (email, OAuth, magic links)
- AI text generation via external APIs
- Workspace-based permissions

## Configuration

### AI (optional)

Add to `apps/api/.env`:

```bash
LLM_API_KEY=your_key
LLM_PROVIDER=openai  # or anthropic, gemini
LLM_MODEL=gpt-4o-mini
```

Chinese models work via OpenAI-compatible endpoints:

```bash
LLM_PROVIDER=openai
OPENAI_API_BASE=https://api.moonshot.cn/v1
LLM_API_KEY=kimi_key
LLM_MODEL=kimi-k2.5
```

### Proxy Auth (optional)

Run behind Cloudflare Access, Authelia, etc:

```bash
PROXY_AUTH_ENABLED=1
PROXY_AUTH_MODE=authelia
```

## Development

```bash
pnpm dev      # Start all apps
pnpm build    # Production build
pnpm check    # Lint + type check
pnpm fix      # Fix formatting issues
```

## Compliance

Implements technical controls for:

- **GDPR** - Data export, deletion, secure storage
- **Law 18-07 (Algeria)** - Data localization, consent
- **SOC 2** - Audit logging, access controls, encryption

Formal certification requires additional audit processes.

## Docs

- [Docker Setup](docs/deployment/docker-compose/README.md)
- [Architecture](docs/architecture/README.md)

## License

MIT - Built for Microhack hackathon
