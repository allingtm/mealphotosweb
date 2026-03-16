import { z } from 'zod';

export const saveSchema = z.object({
  dish_id: z.string().uuid(),
});

export type SaveInput = z.infer<typeof saveSchema>;
