import { z } from 'zod';

export const mapPinsSchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  type_filter: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type MapPinsInput = z.infer<typeof mapPinsSchema>;
