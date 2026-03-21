import { z } from 'zod';

export const ingredientSearchSchema = z.object({
  q: z.string().min(1).max(60),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type IngredientSearchInput = z.infer<typeof ingredientSearchSchema>;
