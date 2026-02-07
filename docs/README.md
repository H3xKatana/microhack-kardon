# Kardon Documentation

Documentation for the Kardon project management platform.

## Quick Links

- [Docker Compose Setup](deployment/docker-compose/README.md) - Get running with Docker
- [Architecture Overview](architecture/README.md) - System design and components
- [Database ER Model](db/ER_Model.md) - Entity relationship diagram
- [AI Integration](ai/README.md) - Setting up AI providers
- [Features](features/README.md) - Platform capabilities

## Project Overview

Kardon is a modern project management platform built with:

- **Frontend**: React Router 7, TypeScript, MobX
- **Backend**: Django REST Framework
- **Database**: PostgreSQL with Redis caching
- **Real-time**: Hocuspopus collaborative editing
- **Storage**: MinIO for file uploads

## Getting Started

### Prerequisites

- Node.js 22.18.0+
- pnpm 10.24.0+
- Docker & Docker Compose
- Python 3.11+

### Installation

1. Clone and install:

```bash
git clone https://github.com/H3xKatana/microhack-kardon.git
cd microhack-kardon
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

3. Start services:

```bash
docker compose -f docker-compose-local.yml up -d
```

4. Run migrations:

```bash
cd apps/api && python manage.py migrate
```

5. Start development:

```bash
pnpm dev
```

## Documentation Structure

```
docs/
├── deployment/
│   └── docker-compose/    - Docker setup guides
├── architecture/          - System architecture docs
├── db/                   - Database documentation
│   └── ER_Model.md       - Entity relationship diagram
├── ai/                   - AI integration guide
└── features/             - Feature documentation
```

## Development

### Project Structure

```
apps/
├── web/        - Main React application
├── space/      - Public/external pages
├── admin/      - Administration panel
├── api/        - Django REST API
├── live/       - Real-time collaboration server
└── proxy/      - Caddy reverse proxy

packages/
├── ui/         - Shared UI components
├── editor/     - Rich text editor
├── types/      - TypeScript definitions
└── ...
```

### Available Scripts

| Command      | Description                       |
| ------------ | --------------------------------- |
| `pnpm dev`   | Start all apps in development     |
| `pnpm build` | Build all apps for production     |
| `pnpm check` | Run linting and type checks       |
| `pnpm fix`   | Fix linting and formatting issues |

## Service Ports

| Service    | Port | Description            |
| ---------- | ---- | ---------------------- |
| Web        | 3000 | Main application       |
| Space      | 3002 | Public pages           |
| Admin      | 3001 | Admin panel            |
| API        | 8000 | REST API               |
| Live       | 3100 | Real-time server       |
| MinIO      | 9090 | Object storage console |
| PostgreSQL | 5432 | Database               |
| Redis      | 6379 | Cache                  |

## Contributing

1. Make your changes
2. Run checks: `pnpm check`
3. Fix issues: `pnpm fix`
4. Test your changes

## Resources

- [Repository](https://github.com/H3xKatana/microhack-kardon)
- [Issues](https://github.com/H3xKatana/microhack-kardon/issues)

## License

MIT License
