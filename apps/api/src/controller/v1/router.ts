import { HttpStatus } from '@/controller/const';
import type { Request, Response } from 'express';
import type { ResponseSchema } from '@/payload/response';
import { routeEmailBodySchema } from '@/payload/route';
import type { z } from 'zod';
import { matchForwardRule, type PostRecord } from '@/schema/rules';
import emailQuery from '@/query/email';
export const toPostRecord = (
  mail: z.infer<typeof routeEmailBodySchema>,
): PostRecord => ({
  attachment: mail.attachments.map((item) => item.filename),
  content: mail.content,
  date: mail.date,
  from: mail.from.address,
  name: mail.from.name,
  subject: mail.subject,
  newsletter: mail.headers.some(
    ({ key, value }) =>
      ['list-unsubscribe', 'list-id'].includes(key.toLowerCase()) ||
      (key.toLowerCase() === 'precedence' &&
        /^(bulk|list)$/i.test(value.trim())),
  ),
});
const mailRouter = async (req: Request, res: Response<ResponseSchema>) => {
  const mail = routeEmailBodySchema.parse(req.body);
  const record = toPostRecord(mail);
  const rows = await emailQuery.routes.execute({
    sources: mail.envelope.recipients.map((value) => value.toLowerCase()),
  });
  const data = rows.map((row) => ({
    source: row.src,
    destination: row.dest,
    matches: row.rule === null || matchForwardRule(record, row.rule),
  }));
  res.status(HttpStatus.OK).json({ status: 'ok', data });
};
export default { mailRouter };
