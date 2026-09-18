# TODO — Pendientes post-inicialización

> Generado en la inicialización del proyecto (2026-09-18). Ver `docs/04-operations/initial-setup-plan.md`.

## 🔴 Bloqueante: remoto GitHub
- [ ] Crear repositorio en GitHub (org UNSA/FIPS) — decidir nombre: `pis-titulacion`.
- [ ] `git remote add origin git@github.com:<org>/pis-titulacion.git`
- [ ] `git add . && git commit -m "chore: inicialización monorepo (Fase 0-8)" && git push -u origin main`
- [ ] Proteger rama `main` + exigir CI verde (`.github/workflows/ci.yml`).
- [ ] **Decisión pendiente del usuario:** ¿repo público o privado? ¿quién crea el repo?

## 🟡 Verificación con Docker — ✅ verificado en setup (2026-09-18)
- [x] `docker compose up -d postgres mailpit` → postgres healthy, mailpit UI 200
- [x] `pnpm --filter @pis/db db:push` → 4 tablas (`usuarios`, `expedientes`, `documentos`, `auditoria_transiciones`)
- [x] `pnpm --filter @pis/db db:seed` → 3 usuarios (Angela, Magnolia, tesista prueba)
- [x] API `GET /health` → `{"ok":true}` y `GET /docs` OK
- [x] `pnpm --filter @pis/web build` → dist generado sin errores
- [x] `pnpm check` (lint + typecheck 8/8 + 9 tests) verde
- [ ] `make prod-local` → E2E en puerto 80 (pendiente: requiere build multi-stage largo, gate antes del primer PR)

## 🟢 Siguiente iteración (RF-01)
- [ ] Cablear `InscribirPlanUseCase` a Drizzle + UoW + pg-boss reales.
- [ ] Migración inicial `drizzle/` + seed de 13 programas.
- [ ] Wizard `apps/web/src/routes/.../nuevo.tsx` + `timeline-fsm` completo.
- [ ] Better-Auth híbrido (DNI + Google `@unsa.edu.pe`) + CASL.

## Herramientas verificadas en setup ✅
- Node v24.20.0 (≥20 OK) · pnpm 11.24.0 (≥9 OK) · Docker 29.7.2 + Compose v5.5.0 · Git 2.55.0
