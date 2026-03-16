import { z } from 'zod';

export const adminMemberSearchSchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminMemberUpdateSchema = z.object({
  display_name: z.string().max(50).trim().nullable().optional(),
  is_admin: z.boolean().optional(),
  is_business: z.boolean().optional(),
  plan: z.enum(['free', 'business']).optional(),
});

// v3: No meal update (dishes managed by businesses, not admin)
export const adminMealUpdateSchema = z.object({
  id: z.string().uuid(),
});

export const adminMealsPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(12),
});
