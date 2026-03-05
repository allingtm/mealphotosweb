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
  show_location: z.boolean().optional(),
  show_streak: z.boolean().optional(),
});

const REPORT_REASONS = [
  'not_food', 'inappropriate', 'spam', 'harassment', 'other',
  'stolen_photo', 'wrong_venue', 'food_safety', 'privacy', 'copyright',
] as const;

export type ReportReason = typeof REPORT_REASONS[number];

export const reportSchema = z.object({
  reported_meal_id: z.string().uuid().nullable().optional(),
  reported_user_id: z.string().uuid().nullable().optional(),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().max(500).trim().optional(),
}).refine(
  data => data.reported_meal_id || data.reported_user_id,
  'Must report either a meal or a user'
);

export function getReportPriority(
  reason: ReportReason
): 'urgent' | 'high' | 'standard' {
  if (reason === 'food_safety' || reason === 'privacy') return 'urgent';
  if (reason === 'inappropriate' || reason === 'harassment' || reason === 'copyright') return 'high';
  return 'standard';
}

export const disputeSchema = z.object({
  meal_id: z.string().uuid(),
  reason: z.enum(['not_served_here', 'wrong_location', 'fake_photo', 'other']),
  detail: z.string().max(280).trim().optional(),
});

export const commentSchema = z.object({
  meal_id: z.string().uuid(),
  text: z.string().min(1).max(280, 'Comment must be under 280 characters').trim(),
});

export const followSchema = z.object({
  following_id: z.string().uuid(),
});

export const blockSchema = z.object({
  blocked_id: z.string().uuid(),
});
