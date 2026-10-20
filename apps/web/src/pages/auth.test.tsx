import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/api/endpoints';
import { queryClient } from '@/app/query-client';
import { getSocial, setSocial, setVerification } from '@/features/auth/flow';
import { ProfilePage } from './auth';

vi.mock('@/api/endpoints', () => ({ register: vi.fn(), resetPassword: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  queryClient.clear();
});
afterEach(() => {
  cleanup();
  setVerification(undefined);
  setSocial(undefined);
  queryClient.clear();
});

/** 실제 가입 단계 가드와 완료 경로를 함께 렌더링합니다. */
function renderProfile(mode: 'register' | 'social' | 'reset') {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage mode={mode} />} />
          <Route path="/emails" element={<h1>내 이메일 화면</h1>} />
          <Route path="/signup" element={<h1>회원가입 시작 화면</h1>} />
          <Route path="/login" element={<h1>로그인 화면</h1>} />
          <Route path="/password/reset" element={<h1>비밀번호 인증 시작 화면</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it.each(['register', 'social'] as const)('%s 가입 완료 후 인증 정보를 정리해도 내 이메일 화면에 도착한다', async (mode) => {
  const user = userEvent.setup();
  const account = { id: 1, name: '테스터', email: 'test@example.com', provider: 'local' as const, createdAt: '2026-10-19' };
  vi.mocked(api.register).mockResolvedValue(account);
  setVerification({ type: 'register', email: 'test@example.com', token: 'verified', verified: true, expiresAt: Date.now() + 60000, resendAt: 0 });
  if (mode === 'social') setSocial({ provider: 'google', providerId: 'test', verifyToken: 'social-token' });
  renderProfile(mode);
  await user.type(screen.getByLabelText('이름'), '테스터');
  if (mode === 'register') {
    await user.type(screen.getByLabelText('비밀번호', { exact: true }), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  }
  await user.click(screen.getByRole('button', { name: '가입 완료' }));
  expect(await screen.findByRole('heading', { name: '내 이메일 화면' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: '회원가입 시작 화면' })).toBeNull();
  expect(queryClient.getQueryData(['session'])).toEqual(account);
  expect(getSocial()).toBeUndefined();
});

it('비밀번호 변경 후 인증 시작 화면으로 돌아가지 않고 로그인 화면으로 이동한다', async () => {
  const user = userEvent.setup();
  vi.mocked(api.resetPassword).mockResolvedValue(undefined);
  setVerification({ type: 'password', email: 'test@example.com', token: 'verified', verified: true, expiresAt: Date.now() + 60000, resendAt: 0 });
  renderProfile('reset');
  await user.type(screen.getByLabelText('비밀번호', { exact: true }), 'Password1!');
  await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
  expect(await screen.findByRole('heading', { name: '로그인 화면' })).toBeTruthy();
});
