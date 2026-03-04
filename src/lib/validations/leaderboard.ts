import { z } from 'zod';
import { CUISINE_OPTIONS } from './meal';

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'country', 'city']).default('global'),
  time_range: z.enum(['week', 'month', 'all_time']).default('week'),
  cuisine: z.enum(CUISINE_OPTIONS).nullable().optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
