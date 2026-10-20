import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { getMe } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { User } from '@/api/models';
import { LandingPage } from './landing';

vi.mock('@/api/endpoints', () => ({ getMe: vi.fn() }));

const user: User = {
  id: 1, name: '테스터', email: 'test@example.com',
  provider: 'local', createdAt: '2026-10-19T00:00:00Z',
};

/** 실제 세션 캐시와 라우터를 사용하는 메인 화면을 구성합니다. */
function renderLanding(cachedUser?: User) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (cachedUser) client.setQueryData(['session'], cachedUser);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter><LandingPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(getMe).mockReset();
});
afterEach(cleanup);

it('로그인 후 메인으로 돌아오면 기존 세션으로 내 이메일과 주소 생성 링크를 표시한다', () => {
  renderLanding(user);
  expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
  expect(screen.getByRole('link', { name: '내 이메일' }).getAttribute('href')).toBe('/emails');
  expect(screen.getByRole('link', { name: '나만의 주소 만들기' }).getAttribute('href')).toBe('/emails/new');
  expect(getMe).not.toHaveBeenCalled();
});

it('새로고침 세션 복구 중에는 로그인 링크를 숨기고 복구 후 사용자 메뉴를 표시한다', async () => {
  let restore: ((value: User) => void) | undefined;
  vi.mocked(getMe).mockImplementation(() => new Promise<User>((resolve) => { restore = resolve; }));
  renderLanding();
  expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
  expect(screen.getAllByRole('button', { name: '로그인 확인 중…' })).toHaveLength(2);
  restore?.(user);
  expect(await screen.findByRole('link', { name: '내 이메일' })).toBeTruthy();
});

it('세션이 없는 방문자는 로그인 후 주소 생성 화면으로 이동한다', async () => {
  vi.mocked(getMe).mockRejectedValue(new ApiError(401, 'No session'));
  renderLanding();
  expect(await screen.findByRole('link', { name: '로그인' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '나만의 주소 만들기' }).getAttribute('href')).toBe('/login?returnTo=%2Femails%2Fnew');
});
