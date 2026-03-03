import { z } from 'zod';

export const profileUpdateSchema = z.object({
  display_name: z.string().max(50, 'Display name too long').trim().optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be under 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim()
    .optional(),
  bio: z.string().max(160, 'Bio must be under 160 characters').trim().optional(),
  avatar_url: z.string().url().optional(),
  location_city: z.string().max(100).optional(),
  location_country: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
});

export const reportSchema = z.object({
  reported_meal_id: z.string().uuid().nullable().optional(),
  reported_user_id: z.string().uuid().nullable().optional(),
  reason: z.enum(['not_food', 'inappropriate', 'spam', 'harassment', 'other']),
  detail: z.string().max(500).trim().optional(),
}).refine(
  data => data.reported_meal_id || data.reported_user_id,
  'Must report either a meal or a user'
);

export const commentSchema = z.object({
  meal_id: z.string().uuid(),
  text: z.string().min(1).max(280, 'Comment must be under 280 characters').trim(),
});
