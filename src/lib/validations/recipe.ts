import { z } from 'zod';

export const ingredientSchema = z.object({
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.enum(['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'piece', 'pinch']),
  name: z.string().min(1).max(100, 'Ingredient name too long').trim(),
});

export const recipeSchema = z.object({
  meal_id: z.string().uuid(),
  ingredients: z.array(ingredientSchema)
    .min(1, 'At least one ingredient required')
    .max(50, 'Maximum 50 ingredients'),
  method: z.array(
    z.string().min(5, 'Step too short').max(1000, 'Step too long').trim()
  ).min(1, 'At least one step required').max(30, 'Maximum 30 steps'),
  cook_time_minutes: z.number().int().min(1).max(1440).nullable().optional(),
  serves: z.number().int().min(1).max(100).nullable().optional(),
});
