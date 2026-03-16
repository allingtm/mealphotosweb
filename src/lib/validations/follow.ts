import { z } from 'zod';

export const followSchema = z.object({
  business_id: z.string().uuid(),
});

export type FollowInput = z.infer<typeof followSchema>;
