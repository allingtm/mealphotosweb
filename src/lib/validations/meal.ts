import { z } from 'zod';

export const CUISINE_OPTIONS = [
  'italian', 'asian', 'mexican', 'british', 'indian',
  'middle_eastern', 'american', 'french', 'other',
] as const;

export const CUISINE_LABELS: Record<typeof CUISINE_OPTIONS[number], string> = {
  italian: 'Italian',
  asian: 'Asian',
  mexican: 'Mexican',
  british: 'British',
  indian: 'Indian',
  middle_eastern: 'Middle Eastern',
  american: 'American',
  french: 'French',
  other: 'Other',
};

export const mealUploadSchema = z.object({
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(120, 'Title must be under 120 characters')
    .trim(),
  cuisine: z.enum(CUISINE_OPTIONS).nullable().optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  }).nullable().optional(),
  tags: z.array(
    z.string().max(30, 'Each tag must be under 30 characters').regex(/^[a-zA-Z0-9]+$/, 'Tags must be alphanumeric')
  ).max(10, 'Maximum 10 tags').optional().default([]),
  venue: z.object({
    name: z.string().max(200),
    mapbox_id: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).nullable().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
  comments_enabled: z.boolean().default(true),
});

/** Server-side schema that adds turnstile token requirement */
export const mealUploadServerSchema = mealUploadSchema.extend({
  turnstile_token: z.string().min(1, 'Bot verification required'),
});

/** Schema for updating an existing meal (all fields optional) */
export const mealUpdateSchema = z.object({
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(120, 'Title must be under 120 characters')
    .trim()
    .optional(),
  cuisine: z.enum(CUISINE_OPTIONS).nullable().optional(),
  tags: z.array(
    z.string().max(30, 'Each tag must be under 30 characters').regex(/^[a-zA-Z0-9]+$/, 'Tags must be alphanumeric')
  ).max(10, 'Maximum 10 tags').optional(),
  venue: z.object({
    name: z.string().max(200),
    mapbox_id: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).nullable().optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  }).nullable().optional(),
  comments_enabled: z.boolean().optional(),
});

export const ratingSchema = z.object({
  meal_id: z.string().uuid('Invalid meal ID'),
  score: z.number().int().min(1, 'Score must be 1–10').max(10, 'Score must be 1–10'),
  turnstile_token: z.string().min(1, 'Bot verification required'),
});

export const recipeRequestSchema = z.object({
  meal_id: z.string().uuid('Invalid meal ID'),
});
