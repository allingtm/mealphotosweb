import { z } from 'zod';

export const validateInviteCodeSchema = z.object({
  code: z.string().trim().min(1, 'Invite code is required').max(20).transform((v) => v.toUpperCase()),
});

export const createInviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Code must be at least 4 characters')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must be uppercase alphanumeric')
    .transform((v) => v.toUpperCase()),
  label: z.string().trim().max(100).optional(),
  max_uses: z.coerce.number().int().min(1).max(10000).default(1),
  expires_at: z.string().datetime().optional().nullable(),
});

export const updateInviteCodeSchema = z.object({
  is_active: z.boolean().optional(),
  max_uses: z.coerce.number().int().min(1).max(10000).optional(),
  label: z.string().trim().max(100).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});
