import { z } from 'zod';

// Public contact form submission
export const contactSubmissionSchema = z.object({
  name: z.string().max(100).trim().optional(),
  email: z.string().email().max(255).trim(),
  subject: z.string().max(200).trim().optional(),
  message: z.string().min(10).max(5000).trim(),
  turnstile_token: z.string().min(1, 'Bot verification required'),
  // Honeypot — hidden field; bots fill it, humans don't see it
  website: z.string().optional(),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

// Admin: query contact submissions
export const adminContactQuerySchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'spam', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

// Admin: update contact submission
export const adminContactUpdateSchema = z.object({
  status: z.enum(['new', 'in_progress', 'resolved', 'spam']).optional(),
  admin_notes: z.string().max(2000).trim().optional(),
});
