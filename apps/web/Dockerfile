FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@9.4.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm --filter @apps/web... install --frozen-lockfile
COPY apps/web ./apps/web
# 브라우저는 같은 출처의 /api를 사용하고 nginx가 API 컨테이너로 전달합니다.
ENV VITE_API_BASE_URL=/api/v1
RUN pnpm --filter @apps/web build

FROM nginx:stable-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
