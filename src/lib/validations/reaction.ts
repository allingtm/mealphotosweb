import { z } from 'zod';

export const reactionSchema = z.object({
  dish_id: z.string().uuid(),
});

export type ReactionInput = z.infer<typeof reactionSchema>;
