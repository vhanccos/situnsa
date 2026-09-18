# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile
RUN pnpm build

# ---------- Stage 2: Runner API (lean ~120MB) ----------
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages ./packages
RUN npm install -g pnpm@9 && pnpm install --prod --frozen-lockfile || npm install --omit=dev
EXPOSE 3001
CMD ["node", "dist/server.js"]

# ---------- Stage 3: Runner Nginx (SPA estática) ----------
FROM nginx:1.27-alpine AS web
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
