import { z } from 'zod';

export const inviteSchema = z.object({
  member_id: z.string().uuid('Invalid user ID'),
});

export const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
});
