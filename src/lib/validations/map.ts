import { z } from 'zod';

export const mapPinsQuerySchema = z.object({
  min_lng: z.coerce.number().min(-180).max(180),
  min_lat: z.coerce.number().min(-90).max(90),
  max_lng: z.coerce.number().min(-180).max(180),
  max_lat: z.coerce.number().min(-90).max(90),
  limit: z.coerce.number().int().min(1).max(200).default(200),
  time_range: z.enum(['today', 'this_week', 'this_month', 'all_time']).default('all_time'),
  min_rating: z.coerce.number().min(0).max(10).default(0),
  recipe_only: z.coerce.boolean().default(false),
});
