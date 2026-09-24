# SITUNSA — Sistema de Titulación y Segunda Especialidad (FIPS / UNSA)

Monorepo Lean para digitalizar el trámite de titulación: registro y validación de
expedientes, seguimiento de 7 etapas / 38 subetapas, gestión documental con
cadena de custodia SHA-256 y paneles por rol (administración, tesista, asesor).

> Las fuentes primarias (PDFs normativos, entrevistas) son locales y no se
> versionan. La especificación procesada vive en [`docs/`](docs/).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite + React 19 + TanStack Router/Query + Tailwind v4 + shadcn-style UI |
| Backend | Fastify standalone + ts-rest + Zod (contrato único en `packages/contracts`) |
| Dominio | `@pis/domain`: FSM, Result pattern, Specifications, hash chain (0 I/O) |
| Datos | PostgreSQL 16 + Drizzle ORM + `pg-boss` (colas, sin Redis) |
| Archivos | Disco local + Nginx `X-Accel-Redirect` (Node nunca bufferiza PDFs) |
| Calidad | Biome + `strict` TS + Vitest + Playwright + Turbo + pnpm workspaces |

Reglas de trabajo para agentes IA: ver [`AGENTS.md`](AGENTS.md).

## Requisitos

- Node.js ≥ 20, pnpm ≥ 9, Docker + Compose, Git.

## Setup (5 minutos)

```bash
# 1. Instalar dependencias
make install            # pnpm install

# 2. Variables de entorno
cp .env.example .env    # ajustar POSTGRES_* si hace falta

# 3. Fresh setup reproducible (infra + migraciones + seed; idempotente,
#    seguro repetirlo: en un volumen vacío crea todo desde cero)
make setup

# 4. Levantar entorno dev (Postgres + Mailpit en Docker, apps en host con HMR)
make dev
```

> **Persistencia de datos:** el volumen `pgdata` sobrevive a `down` y
> reinicios; solo `down -v` lo borra. En un setup fresco (volumen vacío)
> `make setup` aplica las migraciones versionadas de `packages/db/drizzle/`
> y el seed (`db:seed:base` = solo catálogos, apto para prod;
> `db:seed` = base + demo (SET004 completado 38/38, SET005 en plan,
> SET007 en dictamen 12/38), solo dev. `db:push` es solo un atajo de
> prototipado: no usar en CI/prod.

### Servicios en dev

| Servicio | URL | Notas |
|---|---|---|
| Web (Vite HMR) | http://localhost:5173 | `VITE_API_URL` vacío = mismo origen vía proxy `/api` |
| API (Fastify) | http://localhost:3001 | `GET /health`, `GET /docs` |
| Postgres 16 | localhost:5432 | `DATABASE_URL` en `.env` |
| Mailpit UI / SMTP | http://localhost:8025 / :1025 | Correos de dev, sin envío real |

### Credenciales dev (seed demo, `DEMO_PASSWORD`, solo local)

| Rol | Usuario (DNI) | Clave |
|---|---|---|
| Admin | `00000001` | `x` |
| Secretaría | `00000002` | `x` |
| Tesista | `12345678` / `11223344` | `x` |
| Asesor | `87654321` | `x` |

Auth real: acceso JWT 15 min (Bearer, solo en memoria) + refresh rotativo
HttpOnly 8 h, bloqueo 5 intentos × 15 min, Google OIDC solo para usuarios
existentes (sin autocreación). Permisos `modulo.accion` + alcance por
registro (403 auditado). El stub `x-user-dni` solo vive con `AUTH_STUB=1`
(dev/curl); en prod se exige Bearer.

## Flujo de trabajo

```bash
make dev          # codificar (HMR <50ms, tsx --watch)
make check        # antes de cada commit: Biome + typecheck + Vitest
make prod-local   # antes de cada PR: MISMA imagen que Render en :80
                  # (migrate + seed demo + Nginx + API; credencial demo: x)
make prod-down    # bajar el entorno de paridad
```

## Estructura

```text
apps/api      Fastify: transport (*.routes.ts) → use-cases (1 carpeta/acción,
              Result + UoW + FSM) → domain/persistencia
apps/web      SPA: src/routes (TanStack Router), src/api (fetch + Zod del
              contrato), src/components/{ui,domain,layout}
packages/domain      Kernel puro: fsm, días hábiles, specifications, checklist,
                     seguimiento (38 subetapas), hash chain, modalidades
packages/contracts   Fuente única de verdad: Zod + ts-rest (todo path bajo /api)
packages/db          Drizzle + migraciones versionadas en drizzle/
e2e/            Playwright (smoke + flujos por rol)
deploy/         Dockerfile multi-stage + nginx.conf (X-Accel) + compose prod
docs/           01-requirements (RF/RNF/trazabilidad), 02-domain (glosario,
                FSM, permisos, calendario, reverse-legacy), 04-operations
```

### Convenciones clave

- `apps/*` puede importar `packages/*`; jamás al revés; `domain` no toca I/O.
- Errores de negocio = `Result<T, DomainError>`, nunca `throw`; sin `any`.
- Toda tabla nueva = migración Drizzle (`pnpm --filter @pis/db db:generate`).
- Contratos: si cambia `packages/contracts`, se actualizan web **y** api en el mismo PR.
- Upload multipart = ruta nativa Fastify (excepción documentada en `AGENTS.md`).
- Frontend importa valores de dominio por ruta profunda
  (`@pis/domain/dist/...`), nunca del barrel si arrastra `node:crypto`.
- En Codespaces, pushear con `env GITHUB_TOKEN="" GH_TOKEN="" git push`
  (el helper del sistema inyecta el token limitado y da 403).

## Estado

Implementado: login por rol, dashboard admin, Mi Trámite, portal asesor,
Detalle del Expediente (Datos legacy-exactos + autoguardado, Documentos E1/E2
con upload real, Resumen con seguimiento e historial), registro con validación,
talleres, asesores y mensajes administrativos.

Port S-FIPS (4 oleadas): convenciones API + auth/sesiones, RBAC y controles,
proceso operativo (observar/V°B°/finalizar), taller y pagos, cierre del
trámite (jurados/sustentación/validaciones).

Pendiente: generador documental (botón Insertar Datos), transporte SMTP
real (los workers hoy loguean), UI admin del proceso configurable.
