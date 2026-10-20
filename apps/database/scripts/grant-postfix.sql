\set ON_ERROR_STOP on
-- API 마이그레이션 후 관리 계정으로 실행합니다. 테이블이 없으면 실패합니다.
-- 사용자 정보, 인증 정보, 전달 규칙 및 이력에는 접근 권한을 주지 않습니다.
BEGIN;
GRANT SELECT (name) ON TABLE public.domains TO paperplane_postfix;
GRANT SELECT (src_email) ON TABLE public.emails TO paperplane_postfix;
COMMIT;
