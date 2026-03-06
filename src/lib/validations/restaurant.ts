import { z } from 'zod';

export const subscribeSchema = z.object({
  plan: z.enum(['personal', 'business']),
  tier: z.enum(['basic', 'premium']).optional(),
}).refine(
  (data) => data.plan !== 'business' || data.tier != null,
  { message: 'Business plan requires a tier (basic or premium)', path: ['tier'] }
);

export const revealSchema = z.object({
  revealed: z.boolean(),
});
