import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
/** 로그아웃·계정 전환 시 이전 사용자의 조회 데이터를 제거합니다. */
export async function clearPrivateData() {
  await queryClient.cancelQueries();
  queryClient.clear();
}
/** 설정 변경 후 관련 목록과 파생 상태를 새로 조회합니다. */
export async function refreshWorkspace() {
  await Promise.all(
    ['emails', 'destinations', 'deliveries'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
