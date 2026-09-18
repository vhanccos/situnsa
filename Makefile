.PHONY: install dev build lint format test typecheck check prod prod-local prod-down db-push db-seed

install: ## Instala dependencias con pnpm
	pnpm install

setup: ## Fresh setup reproducible: infra + migraciones + seed (idempotente)
	docker compose up -d postgres mailpit
	@echo "Esperando Postgres…"; until docker exec pis-postgres pg_isready -U $${POSTGRES_USER:-pis} >/dev/null 2>&1; do sleep 2; done
	pnpm --filter @pis/db db:migrate
	pnpm --filter @pis/db db:seed

dev: ## Levanta Postgres/Mailpit en Docker + Vite y Fastify en host
	docker compose up -d postgres mailpit
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

format:
	pnpm format

test: ## Vitest en todo el monorepo
	pnpm test

typecheck:
	pnpm typecheck

check: ## Gate de calidad: Biome + typecheck + tests
	pnpm check

prod-local prod: ## Emulación 100% fiel de producción (Nginx + API + DB)
	docker compose -f deploy/docker-compose.prod.yml up --build

prod-down:
	docker compose -f deploy/docker-compose.prod.yml down

db-push: ## Atajo de prototipado (NO auditable; prefiere db-migrate)
	pnpm --filter @pis/db db:push

db-migrate: ## Aplica migraciones versionadas de drizzle/
	pnpm --filter @pis/db db:migrate

db-seed: ## Catálogos + demo (idempotente, solo dev)
	pnpm --filter @pis/db db:seed

db-seed-base: ## Solo catálogos (seguro en prod)
	pnpm --filter @pis/db db:seed:base
