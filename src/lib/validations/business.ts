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
  opening_hours: z.record(z.string(), z.array(z.object({
    open: z.string(),
    close: z.string(),
  }))).optional().nullable(),
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
  business_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website_url: z.string().url().max(255).optional().nullable(),
  booking_url: z.string().url().max(255).optional().nullable(),
});

export type BusinessProfileCreateInput = z.infer<typeof businessProfileCreateSchema>;
export type BusinessOnboardInput = z.infer<typeof businessOnboardSchema>;

// ── Premise schemas ──────────────────────────────────────────────

export const premiseCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  business_categories: z.array(z.enum(BUSINESS_TYPES)).min(1, 'At least one category required').max(5, 'Maximum 5 categories'),

  // Address (city, region, country required for URL generation)
  address_line_1: z.string().trim().max(200).optional().nullable(),
  address_line_2: z.string().trim().max(200).optional().nullable(),
  address_city: z.string().trim().min(1, 'City is required').max(100),
  address_region: z.string().trim().min(1, 'Region is required').max(100),
  address_postcode: z.string().trim().max(20).optional().nullable(),
  address_country: z.string().trim().length(2).default('GB'),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),

  // Contact
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website_url: z.string().url().max(255).optional().nullable().or(z.literal('')),
  booking_url: z.string().url().max(255).optional().nullable().or(z.literal('')),
  menu_url: z.string().url().max(255).optional().nullable().or(z.literal('')),

  // Details
  opening_hours: z.record(z.string(), z.array(z.object({
    open: z.string(),
    close: z.string(),
  }))).optional().nullable(),
  cuisine_types: z.array(z.string().max(50)).max(20).optional().nullable(),
  delivery_available: z.boolean().optional(),
  bio: z.string().trim().max(500).optional().nullable(),
});

export const premiseUpdateSchema = premiseCreateSchema.partial();

export type PremiseCreateInput = z.infer<typeof premiseCreateSchema>;
export type PremiseUpdateInput = z.infer<typeof premiseUpdateSchema>;
