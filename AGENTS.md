# AGENTS.md — Protocolo de Codificación (IA + humanos)

## 1. Estructura del monorepo
- `apps/api` → Fastify standalone + ts-rest. Transport (`*.routes.ts`) → Use Cases (`use-cases/[accion]/`) → Domain/Persistencia.
- `apps/web` → Vite + React 19 SPA. Rutas en `src/routes/`, cliente ts-rest en `src/api/`, UI en `src/components/{ui,domain}/`.
- `packages/domain` → Kernel puro, 0 I/O. FSM, Result, Specifications, hash chain.
- `packages/contracts` → Single source of truth (Zod + ts-rest). Web y API solo importan de aquí.
- `packages/db` → Drizzle + Postgres 16. Toda tabla nueva = migración Drizzle.
- `e2e/` → Playwright. `deploy/` → paridad prod (Nginx + API + DB).

Reglas de importación: `apps/*` puede importar `packages/*`; `packages/*` NUNCA importa `apps/*`; `domain` no importa `db` ni `contracts`.

## 2. Flujo obligatorio
1. `make dev` para codificar (Postgres/Mailpit en Docker, apps en host).
2. `make check` antes de cada commit (Biome + typecheck + Vitest).
3. `make prod-local` antes de abrir PR (gate de paridad Nginx X-Accel en puerto 80).

## 3. Patrón obligatorio — Use Cases
```ts
// Result pattern + UoW + FSM check. Nunca throw para reglas de negocio.
const gate = assertTransition(exp.estado, "PLAN_APROBADO");
if (!gate.ok) return fail(gate.error);
await uow.run(async (db) => { /* update + auditoría hash + enqueue pg-boss */ });
```

## 4. Prohibiciones explícitas
- ❌ `any` (Biome lo bloquea). Usa `unknown` + narrowing o Zod.
- ❌ `throw` para errores de negocio (usa `Result<T, DomainError>`).
- ❌ Modificar tablas sin migración Drizzle (`pnpm --filter @pis/db db:generate`).
- ❌ Redis, MinIO o cualquier servicio extra (Lean: Postgres + disco + Nginx).
- ❌ Buffers de PDF en memoria Node (usa `X-Accel-Redirect`).
- ❌ Cambiar contratos sin actualizar web Y api en el mismo PR.

## 5. Convenciones
- Idioma: código en inglés, comentarios/docs en español.
- Commits: `feat(rf-01): ...`, `fix(api): ...`, `docs(...)`.
- Tests: 1 spec por use-case + tests puros de dominio (<100ms).

## 6. Restricciones técnicas vigentes (setup 2026-09-18, verificadas)
- `@pis/domain` es isomórfico solo en parte: `audit/cryptographic-trail.ts`
  usa `node:crypto`. El frontend (Vite/browser) debe importar valores de
  dominio por ruta profunda (`@pis/domain/dist/expediente/dias-habiles.js`),
  nunca del barrel si arrastra módulos Node. Los `import type` se borran en
  compilación y son seguros.
- `packages/db`: drizzle-kit no resuelve sufijos `.js` → `.ts` (NodeNext) con
  `require()` plano. `db:push`/`db:generate` compilan primero (`tsc → dist/`)
  y apuntan al schema compilado (`DRIZZLE_SCHEMA`, ver `drizzle.config.ts`).
  No cambiar este flujo sin verificar `db:push` contra Postgres local.
- Web usa `fetch` + `Schema.parse()` de `@pis/contracts` (no `@ts-rest/react-query`:
  su API de cliente cambió entre versiones y rompe el typecheck). Los paths
  deben coincidir con `packages/contracts/src/*.contract.ts`.
- Upload multipart es ruta nativa Fastify (`documentos.routes.ts`), no ts-rest
  (`@ts-rest/fastify` no maneja multipart fiable). El use-case sí usa Result.
  Autenticación actual = stub `x-user-dni` (`middleware/stub-auth.ts`).
