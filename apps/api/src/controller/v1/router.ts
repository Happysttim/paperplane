import type { ResponseSchema } from '@/payload/response';
import { routeEmailBodySchema, routeHeaderSchema } from '@/payload/route';
import type { Request, Response } from 'express';
import { HttpStatus } from '../const';
import { compareHmac } from '@/utils/hash';
import type { PostRecord } from '@/schema/rules';
import { matchForwardRule } from '@/schema/rules';
import emailQuery from '@/query/email';
import { inArray } from 'drizzle-orm';
import { emails } from '@/schema';

const isNewsletter = (headers: { key: string; value: string }[]) =>
  headers.some(({ key, value }) => {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey === 'list-unsubscribe' ||
      normalizedKey === 'list-id' ||
      (normalizedKey === 'precedence' && /^(bulk|list)$/i.test(value.trim()))
    );
  });

// @Router /api/v1/router GET
const mailRouter = async (req: Request, res: Response<ResponseSchema>) => {
  const headerParse = routeHeaderSchema.safeParse(req.headers);
  const bodyParse = routeEmailBodySchema.safeParse(req.body);

  if (headerParse.error || bodyParse.error) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Bad request',
    });
  }

  const timestamp = headerParse.data['x-paperplane-timestamp'];
  const requestId = headerParse.data['x-request-id'];
  const signature = headerParse.data['x-paperplane-signature'];

  const plain = `${requestId}.${timestamp}`;

  if (!compareHmac(plain, signature)) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: 'failed',
      error: 'Bad request',
    });
  }

  const { attachments, content, date, from, subject, envelope, headers } =
    bodyParse.data;
  const postRecord: PostRecord = {
    attachment: attachments.map((value) => value.filename),
    content,
    date,
    from: from.address,
    subject,
    name: from.name,
    newsletter: isNewsletter(headers),
  };

  const query = await emailQuery.source.execute({
    srcs: inArray(emails.src, envelope.recipients),
  });

  const nextForwards = query.map((email) => {
    return {
      [email.src]: email.forwards.map((forward) => ({
        [forward.dest]:
          forward.rule === null || matchForwardRule(postRecord, forward.rule),
      })),
    };
  });

  return res.status(HttpStatus.OK).json({
    status: 'ok',
    data: nextForwards,
  });
};

export default { mailRouter };
