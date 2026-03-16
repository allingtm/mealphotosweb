import { z } from 'zod';
import { BUSINESS_TYPES } from '@/types/database';

export const businessTypeSchema = z.enum(BUSINESS_TYPES);

export const businessTypeGroupSchema = z.enum([
  'food_service', 'shops_retail', 'chefs_experiences',
  'health_nutrition', 'production', 'other',
]);

export const businessProfileCreateSchema = z.object({
  business_type: businessTypeSchema,
  business_name: z.string().min(1).max(100),
  bio: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website_url: z.string().url().max(255).optional().nullable(),
  booking_url: z.string().url().max(255).optional().nullable(),
  menu_url: z.string().url().max(255).optional().nullable(),

  // Address
  address_line_1: z.string().optional().nullable(),
  address_line_2: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_postcode: z.string().optional().nullable(),
  address_country: z.string().default('GB'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  // Food Service specific
  opening_hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
  })).optional().nullable(),
  cuisine_types: z.array(z.string()).optional().nullable(),

  // Retail specific
  delivery_available: z.boolean().optional(),

  // Health & Nutrition specific
  qualifications: z.array(z.string()).optional().nullable(),
  specialisms: z.array(z.string()).optional().nullable(),
  accepts_clients: z.boolean().optional(),
  consultation_type: z.array(z.enum(['in_person', 'online'])).optional().nullable(),
  service_area: z.string().optional().nullable(),

  // Chefs & Experiences specific
  class_types: z.array(z.enum(['group', 'private', '1-to-1', 'corporate'])).optional().nullable(),
  price_from_pence: z.number().int().positive().optional().nullable(),
});

export const businessProfileUpdateSchema = businessProfileCreateSchema.partial().omit({
  business_type: true,
});

export const businessOnboardSchema = z.object({
  business_type: businessTypeSchema,
  plan: z.enum(['basic', 'premium']),
  business_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website_url: z.string().url().max(255).optional().nullable(),
  booking_url: z.string().url().max(255).optional().nullable(),
});

export type BusinessProfileCreateInput = z.infer<typeof businessProfileCreateSchema>;
export type BusinessOnboardInput = z.infer<typeof businessOnboardSchema>;
