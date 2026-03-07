import { z } from 'zod';
import { businessTypeSchema } from './business';

export const subscribeSchema = z.object({
  plan: z.enum(['personal', 'business']),
  business_type: businessTypeSchema.optional(),
});

export const revealSchema = z.object({
  revealed: z.boolean(),
});
