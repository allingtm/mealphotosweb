import { z } from 'zod';

export const createDishSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(160).optional(),
  price_pence: z.number().int().positive().optional(),
  comments_enabled: z.boolean().default(true),
  menu_item_id: z.string().uuid().optional(),
  premise_id: z.string().uuid().optional(),
});

export const updateDishSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120).optional(),
  description: z.string().max(160).nullable().optional(),
  price_pence: z.number().int().positive().nullable().optional(),
  comments_enabled: z.boolean().optional(),
});

export const deleteDishSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDishInput = z.infer<typeof createDishSchema>;
export type UpdateDishInput = z.infer<typeof updateDishSchema>;
