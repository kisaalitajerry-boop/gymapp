import { z } from 'zod';

export const MealItemSchema = z.object({
  name: z.string().min(1),
  grams: z.number().nonnegative(),
  kcal: z.number().nonnegative(),
  p: z.number().nonnegative(),
  c: z.number().nonnegative(),
  f: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).optional().default(0.9)
});

export const MealPhotoResponseSchema = z.object({
  items: z.array(MealItemSchema).min(1)
});
