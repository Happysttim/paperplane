import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getDeliveries,
  getDestinations,
  getDomains,
  getEmails,
  getMe,
} from '@/api/endpoints';

/** 공개 화면과 보호 화면에서 로그인 세션 조회 및 캐시를 공유합니다. */
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getMe,
    staleTime: Infinity,
    retry: false,
  });
}

/** 페이지 전환 중 기존 주소 목록을 유지합니다. */
export function useEmails(page: number) {
  return useQuery({
    queryKey: ['emails', page],
    queryFn: () => getEmails(page),
    placeholderData: keepPreviousData,
  });
}
/** 인증된 목적지 목록을 공유합니다. */
export function useDestinations() {
  return useQuery({ queryKey: ['destinations'], queryFn: getDestinations });
}
/** 주소 생성용 도메인 목록을 공유합니다. */
export function useDomains() {
  return useQuery({ queryKey: ['domains'], queryFn: getDomains });
}
/** 전달 기록의 서버 페이지를 조회합니다. */
export function useDeliveries(page: number) {
  return useQuery({
    queryKey: ['deliveries', page],
    queryFn: () => getDeliveries(page),
    placeholderData: keepPreviousData,
  });
}
