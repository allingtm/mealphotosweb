import { z } from 'zod';

export const createDishRequestSchema = z.object({
  dish_name: z.string().min(1).max(100),
  location_city: z.string().min(1).max(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const upvoteDishRequestSchema = z.object({
  request_id: z.string().uuid(),
});

export type CreateDishRequestInput = z.infer<typeof createDishRequestSchema>;
