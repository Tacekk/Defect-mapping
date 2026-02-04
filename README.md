# Glass Inspector

A web application for mapping defects on automotive glass during quality inspection.

## Features

- **Inspection Module**: Touch-optimized interface for inspectors to mark defects on glass templates
- **Admin Module**: Manage products, workstations, defect types, and users
- **Board/Analytics**: Heatmaps, KPI metrics, and defect analysis dashboards
- **Offline Support**: PWA with IndexedDB for offline operation
- **Multi-language**: Czech and English localization

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui
- TanStack Query (data fetching)
- Zustand (state management)
- react-konva (canvas for defect mapping)
- i18next (internationalization)
- Workbox (PWA/Service Worker)

### Backend
- Node.js + Fastify
- Prisma ORM
- PostgreSQL
- JWT authentication

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd glass-inspector
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development database:
   ```bash
   pnpm docker:dev
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```

5. Generate Prisma client and push schema:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

6. Seed the database:
   ```bash
   pnpm --filter api db:seed
   ```

7. Start development servers:
   ```bash
   pnpm dev
   ```

The frontend will be available at http://localhost:5173
The API will be available at http://localhost:3001

### Test Accounts

After seeding the database, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@glass-inspector.local | admin123 |
| Inspector | inspector@glass-inspector.local | inspector123 |
| Quality | quality@glass-inspector.local | quality123 |

## Project Structure

```
glass-inspector/
├── apps/
│   ├── api/          # Fastify backend
│   │   ├── prisma/   # Database schema & migrations
│   │   └── src/      # Source code
│   └── web/          # React frontend
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── stores/
│           └── lib/
├── packages/
│   └── shared/       # Shared types & validators
├── docker-compose.yml
└── turbo.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm build` | Build all packages |
| `pnpm docker:dev` | Start development database (PostgreSQL + Redis + MinIO) |
| `pnpm docker:down` | Stop development database |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |

## License

Private - All rights reserved.
