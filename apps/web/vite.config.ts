import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

/** 환경 파일의 API 주소로 개발용 프록시를 구성합니다. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  const apiTarget = env.API_SERVER_URL || 'http://127.0.0.1:8080';
  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    build: {
      target: ['chrome100', 'edge100', 'firefox100', 'safari15.4'],
      rollupOptions: {
        output: {
          /** 변경 빈도가 낮은 외부 라이브러리를 별도 캐시 가능한 파일로 나눕니다. */
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('zod')) return 'validation';
            return 'vendor';
          },
        },
      },
    },
    test: { environment: 'jsdom', clearMocks: true },
  };
});
