import { z } from 'zod';

export const waitlistSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name too long'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email')
    .max(320, 'Email too long'),
});
