import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug cannot be empty').regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens').max(100).optional(),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500).optional().nullable(),
  og_image_id: z.string().optional().nullable(),
  og_image_url: z.string().url().optional().nullable(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  meta_title: z.string().max(120).optional().nullable(),
  meta_description: z.string().max(320).optional().nullable(),
  tag_ids: z.array(z.string().uuid()).optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export const blogPostQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  published: z.enum(['all', 'true', 'false']).default('all'),
  tag: z.string().optional(),
});

export const publicBlogQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  tag: z.string().optional(),
});

export const createBlogTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
});

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type BlogPostQueryInput = z.infer<typeof blogPostQuerySchema>;
export type PublicBlogQueryInput = z.infer<typeof publicBlogQuerySchema>;
export type CreateBlogTagInput = z.infer<typeof createBlogTagSchema>;
