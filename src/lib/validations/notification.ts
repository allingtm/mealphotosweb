import { z } from 'zod';

export const notificationQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const markReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

export const NOTIFICATION_TYPES = [
  'new_dish',
  'reaction_milestone',
  'new_comment',
  'new_follower',
  'dish_request_nearby',
  'proximity',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
