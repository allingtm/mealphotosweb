import { z } from 'zod';
import { CUISINE_OPTIONS } from './meal';

export const exploreSlugSchema = z.object({
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  cuisine: z.enum(CUISINE_OPTIONS).optional(),
});

export type ExploreParams = z.infer<typeof exploreSlugSchema>;

/** Slugify a city/country name: "New York" → "new-york" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** De-slugify: "new-york" → "New York" */
export function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
