.PHONY: install dev build lint format test typecheck check prod prod-local prod-down db-push db-seed

install: ## Instala dependencias con pnpm
	pnpm install

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

db-push:
	pnpm --filter @pis/db db:push

db-seed:
	pnpm --filter @pis/db db:seed
