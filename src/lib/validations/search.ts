import { z } from 'zod';

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['dish', 'business', 'cuisine']).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;
