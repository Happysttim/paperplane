import { z } from 'zod';
import {
  ruleSchema,
  type Destination,
  type EmailAddress,
  type User,
} from '@/api/models';
const now = new Date().toISOString();
let user: User = {
  id: 1,
  name: '하늘',
  email: 'hello@example.com',
  provider: 'local',
  createdAt: now,
};
let destinations: Destination[] = [
  { id: 1, userId: 1, address: 'hello@example.com', verifiedAt: now },
];
let emails: EmailAddress[] = [
  {
    id: 1,
    userId: 1,
    src: 'shopping@paperplane.example',
    domainId: 1,
    created_at: now,
    totalForwards: 1,
    forwards: [
      {
        id: 1,
        emailId: 1,
        dest: 'hello@example.com',
        rule: [],
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: 2,
    userId: 1,
    src: 'work@paperplane.example',
    domainId: 1,
    created_at: now,
    totalForwards: 1,
    forwards: [
      {
        id: 2,
        emailId: 2,
        dest: 'hello@example.com',
        rule: [
          {
            type: 'and',
            postRule: {
              newsletter: 'all',
              subject: {
                type: 'or',
                regexp: [{ type: 'middle', value: '회의' }],
              },
            },
          },
        ],
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: 3,
    userId: 1,
    src: 'letter@paperplane.example',
    domainId: 1,
    created_at: now,
    totalForwards: 0,
    forwards: [],
  },
];
let nextId = 10;
let challengeAddress = '';
/** 예시 응답도 실제 공통 응답 형식을 사용합니다. */
function ok(data?: unknown, status = 200) {
  return Response.json({ status: 'ok', data }, { status });
}
/** 미지원 데모 기능은 성공으로 위장하지 않습니다. */
function failed(message: string, status = 400) {
  return Response.json({ status: 'failed', error: message }, { status });
}
/** 개발 중 명시적으로 선택한 미리보기에서만 메모리 API를 호출합니다. */
export function demoFetch(path: string, init: RequestInit): Promise<Response> {
  return Promise.resolve(handle(path, init));
}
/** 샘플 데이터 변경을 메모리에 반영합니다. 실제 메일을 보내지 않습니다. */
function handle(path: string, init: RequestInit): Response {
  const url = new URL(path, 'http://preview.local');
  const method = init.method ?? 'GET';
  const raw: unknown =
    typeof init.body === 'string' ? JSON.parse(init.body) : {};
  if (url.pathname === '/auth/csrf') return ok({ csrfToken: 'preview-csrf' });
  if (url.pathname === '/auth/refresh')
    return ok({ accessToken: 'preview-access' });
  if (
    url.pathname === '/auth/logout' ||
    url.pathname === '/auth/password/reset'
  )
    return ok();
  if (url.pathname === '/auth/login' || url.pathname === '/auth/register')
    return ok({ accessToken: 'preview-access', csrfToken: 'preview-csrf' });
  if (url.pathname === '/verify/email')
    return ok({ verifyToken: 'preview-verify' });
  if (url.pathname === '/verify/code')
    return z.object({ code: z.literal('123456') }).safeParse(raw).success
      ? ok()
      : failed('Invalid verification code');
  if (url.pathname === '/users/me') {
    if (method === 'PATCH')
      user = { ...user, ...z.object({ name: z.string() }).parse(raw) };
    if (method === 'DELETE') return ok();
    return ok(user);
  }
  if (url.pathname === '/domains')
    return ok([{ id: 1, name: 'paperplane.example' }]);
  if (url.pathname === '/email') {
    if (method === 'POST') {
      const { src } = z.object({ src: z.email() }).parse(raw);
      if (emails.some((email) => email.src === src))
        return failed('Email already exists', 409);
      const email = {
        id: nextId++,
        userId: 1,
        src,
        domainId: 1,
        created_at: now,
        totalForwards: 0,
        forwards: [],
      };
      emails.unshift(email);
      return ok(email, 201);
    }
    if (method === 'DELETE') {
      const { emailId } = z.object({ emailId: z.number() }).parse(raw);
      emails = emails.filter((email) => email.id !== emailId);
      return ok();
    }
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    return ok({
      emails: emails.slice((page - 1) * 10, page * 10),
      pages: Math.ceil(emails.length / 10),
      total: emails.length,
      now: page,
    });
  }
  if (url.pathname === '/destinations/verify') {
    challengeAddress = z.object({ address: z.email() }).parse(raw).address;
    return ok(
      { verificationToken: 'preview-destination', expiresIn: 600 },
      201,
    );
  }
  if (url.pathname === '/destinations/confirm') {
    const address = challengeAddress;
    challengeAddress = '';
    if (
      !address ||
      !z.object({ code: z.literal('123456') }).safeParse(raw).success
    )
      return failed('Invalid or expired verification');
    const item = { id: nextId++, userId: 1, address, verifiedAt: now };
    destinations.push(item);
    return ok(item);
  }
  if (url.pathname === '/destinations') {
    if (method === 'DELETE') {
      const { destinationId } = z
        .object({ destinationId: z.number() })
        .parse(raw);
      const item = destinations.find((dest) => dest.id === destinationId);
      destinations = destinations.filter((dest) => dest.id !== destinationId);
      emails = emails.map((email) => {
        const forwards = email.forwards.filter(
          (forward) => forward.dest !== item?.address,
        );
        return { ...email, forwards, totalForwards: forwards.length };
      });
      return ok();
    }
    return ok(destinations);
  }
  if (url.pathname === '/forward') {
    if (method === 'DELETE') {
      const { emailId, forwardId } = z
        .object({ emailId: z.number(), forwardId: z.number() })
        .parse(raw);
      const email = emails.find((item) => item.id === emailId);
      if (!email) return failed('Not found', 404);
      email.forwards = email.forwards.filter((item) => item.id !== forwardId);
      email.totalForwards = email.forwards.length;
      return ok();
    }
    const body = z
      .object({
        emailId: z.number(),
        forwardId: z.number().optional(),
        dest: z.email(),
        rule: ruleSchema,
      })
      .parse(raw);
    const email = emails.find((item) => item.id === body.emailId);
    if (!email) return failed('Not found', 404);
    const item = {
      id: body.forwardId ?? nextId++,
      emailId: email.id,
      dest: body.dest,
      rule: body.rule,
      created_at: now,
      updated_at: now,
    };
    email.forwards = [
      ...email.forwards.filter((forward) => forward.id !== item.id),
      item,
    ];
    email.totalForwards = email.forwards.length;
    return ok(item, method === 'POST' ? 201 : 200);
  }
  if (url.pathname === '/deliveries')
    return ok({
      deliveries: [
        {
          source: 'shopping@paperplane.example',
          delivery: {
            id: 1,
            eventId: 'preview-event',
            emailId: 1,
            destination: 'hello@example.com',
            messageId: 'preview-message',
            status: 'sent',
            detail: '예시 전달 기록입니다. 실제 발송하지 않았습니다.',
            createdAt: now,
          },
        },
      ],
      total: 1,
      page: 1,
    });
  return failed(
    '미리보기에서는 이 기능을 실행하지 않아요. 실제 API 연결 모드에서 확인해 주세요.',
    422,
  );
}
