import { z } from 'zod';

export const subscribeSchema = z.object({
  tier: z.enum(['basic', 'premium']),
});

export const revealSchema = z.object({
  revealed: z.boolean(),
});
