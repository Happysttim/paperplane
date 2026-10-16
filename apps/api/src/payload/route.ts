import { z } from 'zod';

const routeEmailBodySchema = z.object({
  headers: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    }),
  ),
  envelope: z.object({
    from: z.string(),
    recipients: z.array(z.email()).min(1),
  }),
  from: z.object({
    name: z.string(),
    address: z.email(),
  }),
  subject: z.string(),
  date: z.iso.datetime(),
  content: z.string(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentType: z.string(),
      size: z.number(),
    }),
  ),
  contentSize: z.number().int().nonnegative(),
});

const routeHeaderSchema = z.object({
  'x-paperplane-timestamp': z.string().regex(/[0-9].+/),
  'x-request-id': z.string(),
  'x-paperplane-signature': z.string(),
});

export { routeEmailBodySchema, routeHeaderSchema };
