import { z } from 'zod';

export const notificationQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

export const NOTIFICATION_TYPES = [
  'rating_milestone',
  'recipe_near_unlock',
  'recipe_unlocked',
  'leaderboard_move',
  'streak_reminder',
  'streak_milestone',
  'new_follower',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
