import { z } from 'zod';
import { CUISINE_OPTIONS } from './meal';

export const adminMemberSearchSchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminMemberUpdateSchema = z.object({
  display_name: z.string().max(50).trim().nullable().optional(),
  bio: z.string().max(160).trim().nullable().optional(),
  is_admin: z.boolean().optional(),
  banned_at: z.string().datetime().nullable().optional(),
  suspended_until: z.string().datetime().nullable().optional(),
  ban_reason: z.string().max(500).trim().nullable().optional(),
  moderation_tier: z.enum(['new', 'trusted', 'flagged']).optional(),
});

export const adminMealUpdateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(120, 'Title must be under 120 characters').trim().optional(),
  tags: z.array(
    z.string().max(30).regex(/^[a-zA-Z0-9]+$/, 'Tags must be alphanumeric')
  ).max(10).optional(),
  cuisine: z.enum(CUISINE_OPTIONS).nullable().optional(),
});

export const adminMealsPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(12),
});
