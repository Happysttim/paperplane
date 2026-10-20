# 저장소의 Node 22 환경과 pnpm 버전에 맞춰 빌드합니다.
FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@9.4.0

# 모노레포의 lockfile을 사용하므로 build context는 저장소 루트입니다.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm --filter @apps/api... install --frozen-lockfile

COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/src ./apps/api/src
COPY apps/api/scripts/build.mjs ./apps/api/scripts/build.mjs
RUN pnpm --filter @apps/api build \
    && pnpm --filter @apps/api --prod deploy /deployment

# 루트 Compose에서만 사용하는 일회성 마이그레이션 이미지입니다.
FROM build AS migrate
COPY apps/api/migration ./apps/api/migration
COPY apps/api/scripts/migrate.ts ./apps/api/scripts/migrate.ts
WORKDIR /workspace/apps/api
CMD ["pnpm", "db:migrate"]

# 빌드 도구와 소스, 환경 파일, 인증 키는 실행 이미지에 복사하지 않습니다.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV LISTEN_PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /deployment/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist

# node를 직접 실행하여 SIGTERM이 기존 종료 처리 함수에 전달되도록 합니다.
USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.LISTEN_PORT || '8080') + '/ready', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
