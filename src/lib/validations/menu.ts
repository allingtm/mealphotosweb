import { z } from 'zod';

export const createMenuSectionSchema = z.object({
  name: z.string().min(1).max(50),
  sort_order: z.number().int().min(0).default(0),
});

export const createMenuItemSchema = z.object({
  section_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  price_pence: z.number().int().positive().optional(),
  dietary_tags: z.array(z.enum(['V', 'VG', 'GF', 'DF'])).default([]),
  available: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  photo_url: z.string().url().nullable().optional(),
});

export type CreateMenuSectionInput = z.infer<typeof createMenuSectionSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
