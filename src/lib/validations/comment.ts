import { z } from 'zod';

export const createCommentSchema = z.object({
  dish_id: z.string().uuid(),
  text: z.string().min(1).max(280),
});

export const deleteCommentSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
