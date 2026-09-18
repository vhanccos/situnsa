# TODO — Pendientes post-inicialización

> Generado en la inicialización del proyecto (2026-09-18). Ver `docs/04-operations/initial-setup-plan.md`.

## 🔴 Remoto GitHub — ✅ configurado (2026-09-18)
- [x] Repo público `vhanccos/situnsa` creado por el usuario (vacío).
- [x] `git remote add origin https://github.com/vhanccos/situnsa.git` + `git push -u origin main`.
- [ ] Proteger rama `main` + exigir CI verde (`.github/workflows/ci.yml`).

## 🟡 Verificación con Docker — ✅ verificado en setup (2026-09-18)
- [x] `docker compose up -d postgres mailpit` → postgres healthy, mailpit UI 200
- [x] `pnpm --filter @pis/db db:push` → 4 tablas (`usuarios`, `expedientes`, `documentos`, `auditoria_transiciones`)
- [x] `pnpm --filter @pis/db db:seed` → 3 usuarios (Angela, Magnolia, tesista prueba)
- [x] API `GET /health` → `{"ok":true}` y `GET /docs` OK
- [x] `pnpm --filter @pis/web build` → dist generado sin errores
- [x] `pnpm check` (lint + typecheck 8/8 + 9 tests) verde
- [ ] `make prod-local` → E2E en puerto 80 (pendiente: requiere build multi-stage largo, gate antes del primer PR)

## 🟢 Fase 1 — Detalle del Expediente ✅ (2026-09-18)
- [x] Contratos: `ExpedienteDetalleDTO` + `PATCH /expedientes/:id` (409 concurrencia) + metadata upload
- [x] Migración `drizzle/0000_*` + seed SET005 (ids fijos) + `telefono`/`etapa`
- [x] API real: getById con joins, ActualizarDatos + SubirDocumento (UoW + hash), X-Accel cableado, stub-auth
- [x] Web `/expedientes/:id`: 4 tabs, autoguardado con indicador, tarjetas doc, resumen con historial
- [x] `make check` verde (12 tests) + e2e detalle (4 tabs + tarjeta) + screenshots verificados
- [x] Fix: plugin Tailwind v4 en `vite.config.ts` (sin esto la SPA renderiza sin estilos)

## 🟢 Fase 2 propuesta (a decidir)
- [ ] Wizard inscripción `.../nuevo.tsx` + `InscribirPlanUseCase` real (RF-01 completo)
- [ ] Generador documental (carátula/decretos) + botón INSERTAR DATOS (Fase 2)
- [ ] Better-Auth híbrido (DNI + Google `@unsa.edu.pe`) + CASL (reemplaza stub-auth)
- [ ] Workers pg-boss (notificaciones, plazos) + `make prod-local` gate antes del PR

## Herramientas verificadas en setup ✅
- Node v24.20.0 (≥20 OK) · pnpm 11.24.0 (≥9 OK) · Docker 29.7.2 + Compose v5.5.0 · Git 2.55.0
