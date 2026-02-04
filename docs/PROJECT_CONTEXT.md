# Glass Inspector - Project Context

> Tento soubor slouží jako kontext pro AI asistenta při pokračování práce na projektu.

## O projektu

**Glass Inspector** je webová aplikace pro mapování vad na autosklech během výrobní kontroly. Aplikace je navržena jako PWA (Progressive Web App) s offline podporou, optimalizovaná pro dotykové ovládání (tablety, All-in-One PC).

## Tech Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | React 18, Vite, TypeScript, TailwindCSS, shadcn/ui |
| State | Zustand, TanStack Query |
| Offline | Dexie.js (IndexedDB), Service Worker (Workbox) |
| Canvas | react-konva (defect mapping) |
| Backend | Node.js, Fastify, Prisma ORM |
| Database | PostgreSQL |
| Cache | Redis |
| Storage | MinIO (S3-compatible) |
| i18n | react-i18next (CZ/EN) |

## Struktura projektu

```
glass-inspector/
├── apps/
│   ├── api/                 # Fastify Backend
│   │   ├── prisma/          # DB schema + seed
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Auth, validation
│   │   │   └── utils/       # Helpers
│   │   └── Dockerfile
│   └── web/                 # React Frontend
│       ├── src/
│       │   ├── pages/       # Login, Inspection, Admin, Board
│       │   ├── components/  # UI, admin, inspection, board
│       │   ├── stores/      # Zustand stores
│       │   ├── hooks/       # Custom hooks
│       │   ├── db/          # IndexedDB (Dexie)
│       │   ├── i18n/        # Translations
│       │   └── lib/         # API client, utils
│       └── Dockerfile
├── packages/
│   └── shared/              # Shared types + Zod validators
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Development
└── nginx/                   # Reverse proxy
```

## Hlavní moduly

### 1. Kontrola (Inspection)
- Výběr pracoviště a produktu
- Zahájení inspekční session
- Interaktivní canvas pro mapování vad (klik = vada)
- Fotodokumentace vad (kamera/upload)
- Automatický časovač inspekce

### 2. Admin
- CRUD: Uživatelé, Produkty, Pracoviště, Typy vad
- Upload šablon produktů
- Přehled sessions
- Audit logy

### 3. Board (Dashboard)
- KPI metriky (kontrolované kusy, defektní rate, trend)
- Heatmapa vad na šabloně produktu
- Pareto chart (top typy vad)

## Spuštění projektu

```bash
# Instalace závislostí
pnpm install

# Start databáze (PostgreSQL + Redis + MinIO)
pnpm docker:dev

# Setup databáze
pnpm db:generate
pnpm db:push
pnpm --filter api db:seed

# Spuštění dev serveru
pnpm dev
```

## Testovací účty

| Role | Email | Heslo |
|------|-------|-------|
| Admin | admin@glass-inspector.local | admin123 |
| Inspektor | inspector@glass-inspector.local | inspector123 |
| Kvalita | quality@glass-inspector.local | quality123 |

## URL adresy (development)

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **MinIO Console**: http://localhost:9001

## API Endpoints

| Prefix | Popis |
|--------|-------|
| `/api/auth` | Login, logout, refresh token |
| `/api/users` | CRUD uživatelů (admin) |
| `/api/products` | CRUD produktů |
| `/api/workstations` | CRUD pracovišť |
| `/api/defect-types` | CRUD typů vad |
| `/api/sessions` | Inspekční sessions + items + defects |
| `/api/photos` | Upload/delete fotek vad |
| `/api/analytics` | KPI, heatmap data |
| `/api/templates` | Upload šablon produktů |
| `/health`, `/ready` | Health checks |

## Klíčové soubory

- `apps/api/prisma/schema.prisma` - DB model
- `packages/shared/src/types/index.ts` - Sdílené TypeScript typy
- `packages/shared/src/validators/index.ts` - Zod validační schémata
- `apps/web/src/components/inspection/DefectCanvas.tsx` - Hlavní canvas pro mapování
- `apps/web/src/stores/inspectionStore.ts` - State inspekce
- `apps/web/src/db/index.ts` - IndexedDB pro offline

## Offline podpora

Aplikace podporuje offline režim:
1. **Service Worker** (Workbox) - cache statických souborů
2. **IndexedDB** (Dexie.js) - lokální uložení dat
3. **Sync Queue** - fronta operací k synchronizaci
4. `useOfflineSync` hook - automatická synchronizace při obnovení spojení

## Role a oprávnění

| Role | Kontrola | Admin | Board |
|------|----------|-------|-------|
| ADMIN | ✓ | ✓ | ✓ |
| INSPECTOR | ✓ | ✗ | ✗ |
| QUALITY | ✗ | částečně | ✓ |

## Možná vylepšení / TODO

- [ ] Testy (Vitest pro frontend, Jest pro backend)
- [ ] Plný CD pipeline (deploy na VPS)
- [ ] WebSocket pro real-time aktualizace Boardu
- [ ] Export dat (CSV, PDF reporty)
- [ ] Notifikace (push notifications)
- [ ] Dark mode
- [ ] Rozšířené filtry v Admin sessions

## Poznámky pro AI asistenta

1. Projekt používá **pnpm** jako package manager
2. Monorepo je spravováno přes **Turborepo**
3. Všechny typy a validátory jsou v `packages/shared`
4. Frontend komponenty používají **shadcn/ui** styl (Radix UI + Tailwind)
5. API používá **Fastify** (ne Express)
6. Autentizace je přes **JWT + refresh tokens**
