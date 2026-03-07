import { z } from 'zod';

/** Client-side schema for invite code input */
export const inviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Invite code is required')
    .max(20, 'Invalid invite code')
    .transform((v) => v.toUpperCase()),
});

/** Server-side schema that adds Turnstile token requirement */
export const inviteCodeServerSchema = inviteCodeSchema.extend({
  turnstile_token: z.string().min(1, 'Bot verification required'),
});

/** Admin schema for generating new invite codes */
export const createInviteCodeSchema = z.object({
  label: z.string().trim().max(200).optional(),
  max_uses: z.number().int().min(1).max(10000).default(1),
  expires_at: z.string().datetime().optional(),
});
