import { z } from 'zod';

export const profileUpdateSchema = z.object({
  display_name: z.string().max(50, 'Display name too long').trim().optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be under 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim()
    .optional(),
  avatar_url: z.string().url().optional(),
  location_city: z.string().max(100).optional(),
  location_country: z.string().max(100).optional(),
});

const REPORT_REASONS = [
  'inappropriate', 'spam', 'harassment', 'misleading', 'other',
] as const;

export type ReportReason = typeof REPORT_REASONS[number];

export const reportSchema = z.object({
  reported_comment_id: z.string().uuid().nullable().optional(),
  reported_business_id: z.string().uuid().nullable().optional(),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().max(500).trim().optional(),
}).refine(
  data => data.reported_comment_id || data.reported_business_id,
  'Must report a comment or business'
);

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
