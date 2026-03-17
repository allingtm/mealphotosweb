import { z } from 'zod';

export const createDishSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(160).optional(),
  price_pence: z.number().int().positive().optional(),
  comments_enabled: z.boolean().default(true),
  menu_item_id: z.string().uuid().optional(),
  premise_id: z.string().uuid().optional(),
});

export const deleteDishSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDishInput = z.infer<typeof createDishSchema>;
