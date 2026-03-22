import { z } from 'zod';

export const teamInviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const teamAcceptSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  terms_accepted: z.literal(true, {
    error: 'You must accept the terms and conditions',
  }),
});

export const teamUpdatePermissionsSchema = z.object({
  permissions: z.object({
    can_post_dishes: z.boolean(),
    can_manage_menu: z.boolean(),
  }),
});
