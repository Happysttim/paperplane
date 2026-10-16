import { z } from 'zod';

const responseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    data: z.any().optional(),
  }),
  z.object({
    status: z.literal('failed'),
    error: z.string().optional(),
  }),
]);

type ResponseSchema = z.infer<typeof responseSchema>;

export { responseSchema, type ResponseSchema };
