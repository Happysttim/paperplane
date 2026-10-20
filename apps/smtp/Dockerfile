FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@9.4.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/smtp/package.json ./apps/smtp/package.json
# 기존 lockfile의 esbuild를 빌드 도구로 재사용합니다.
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile
COPY apps/smtp/src ./apps/smtp/src
COPY apps/smtp/tsconfig.json ./apps/smtp/tsconfig.json
RUN pnpm --filter @apps/api exec esbuild ../smtp/src/index.ts --bundle --platform=node --format=esm --packages=external --target=node22 --outfile=../smtp/dist/index.mjs \
    && pnpm --filter smtp --prod deploy /deployment

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /deployment/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/smtp/dist ./dist
USER node
EXPOSE 10025
# 내부 SMTP 리스너의 TCP 연결 상태를 검사합니다.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
    CMD node -e "const s=require('node:net').connect(10025,'127.0.0.1',()=>{s.end();process.exit(0)});s.setTimeout(3000,()=>process.exit(1));s.on('error',()=>process.exit(1))"
CMD ["node", "dist/index.mjs"]
