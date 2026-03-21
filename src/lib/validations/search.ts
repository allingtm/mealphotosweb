import { z } from 'zod';

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['dish', 'business', 'cuisine', 'menu_item']).optional(),
  cuisine: z.string().max(50).optional(),
  dietary: z.string().max(20).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  ingredients: z.string().max(500).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;
