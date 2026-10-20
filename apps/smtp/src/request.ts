import { randomUUID } from 'node:crypto';
import config from './config';
import { generateHmac, sha256 } from './hash';
import type {
  RouteEmailBody,
  RouteForward,
  Response,
  DeliveryRecordBody,
} from './type';

/** 외부 JSON의 상태와 라우팅 항목을 검사해 잘못된 응답을 전달에 사용하지 않습니다. */
const isRouteForward = (value: unknown): value is RouteForward => {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  if (value.status === 'failed') return true;
  return value.status === 'ok' && 'data' in value && Array.isArray(value.data) &&
    value.data.every((route: unknown) =>
      typeof route === 'object' && route !== null &&
      'source' in route && typeof route.source === 'string' && route.source.length > 0 &&
      'destination' in route && typeof route.destination === 'string' && route.destination.length > 0 &&
      'matches' in route && typeof route.matches === 'boolean');
};

/** API 조회를 제한 시간 안에 완료하고 HTTP·응답 형식 오류를 실패로 반환합니다. */
const requestForward = async (body: RouteEmailBody): Promise<RouteForward> => {
  const requestId = randomUUID();
  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify(body);

  const plain = [requestId, timestamp, sha256(rawBody)].join('.');
  const signature = generateHmac(plain);

  try {
    const response = await fetch(config.requestRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paperplane-timestamp': timestamp,
        'x-request-id': requestId,
        'x-paperplane-signature': signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return { status: 'failed' };
    const payload: unknown = await response.json();
    return isRouteForward(payload) ? payload : { status: 'failed' };
  } catch {
    return {
      status: 'failed',
    };
  }
};

/** 발송 이력 기록의 HTTP 상태와 응답 상태를 확인합니다. */
const requestRecord = async (body: DeliveryRecordBody): Promise<Response> => {
  const requestId = randomUUID();
  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify(body);

  const plain = [requestId, timestamp, sha256(rawBody)].join('.');
  const signature = generateHmac(plain);

  try {
    const response = await fetch(config.requestRecord, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paperplane-timestamp': timestamp,
        'x-request-id': requestId,
        'x-paperplane-signature': signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return { status: 'failed' };
    const payload: unknown = await response.json();
    if (typeof payload === 'object' && payload !== null && 'status' in payload && payload.status === 'ok') {
      return { status: 'ok' };
    }
    return { status: 'failed' };
  } catch {
    return {
      status: 'failed',
    };
  }
};

export { requestForward, requestRecord };
