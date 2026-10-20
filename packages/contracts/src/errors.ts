import { z } from 'zod';

export const ProblemDetails = z.object({
  type: z.literal('about:blank'),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  errors: z.array(z.object({ param: z.string(), message: z.string() })).optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetails>;
