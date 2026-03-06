import { z } from 'zod';

export const businessTypeSchema = z.enum([
  'restaurant', 'takeaway', 'cafe', 'pub', 'bakery',
  'food_truck', 'catering', 'meal_prep_service', 'cooking_school',
  'nutritionist', 'personal_trainer', 'dietitian',
  'other',
]);

export const businessTypeGroupSchema = z.enum(['food_drink', 'health_nutrition']);

export const businessProfileCreateSchema = z.object({
  business_type: businessTypeSchema,
  business_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website_url: z.string().url().max(255).optional().nullable(),
  booking_url: z.string().url().max(255).optional().nullable(),

  // Location fields (primarily Food & Drink)
  address_line_1: z.string().optional().nullable(),
  address_line_2: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_postcode: z.string().optional().nullable(),
  address_country: z.string().default('GB'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  // Food & Drink specific
  opening_hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
  })).optional().nullable(),
  cuisine_types: z.array(z.string()).optional().nullable(),
  delivery_available: z.boolean().optional(),
  menu_url: z.string().url().max(255).optional().nullable(),

  // Health & Nutrition specific
  qualifications: z.array(z.string()).optional().nullable(),
  specialisms: z.array(z.string()).optional().nullable(),
  accepts_clients: z.boolean().optional(),
  consultation_type: z.array(z.enum(['in_person', 'online', 'both'])).optional().nullable(),
  service_area: z.string().optional().nullable(),
});

export const businessProfileUpdateSchema = businessProfileCreateSchema.partial().omit({
  business_type: true,
});

export const businessPostCreateSchema = z.object({
  title: z.string().max(120).optional().nullable(),
  body: z.string().max(1000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  cloudflare_image_id: z.string().optional().nullable(),
}).refine(
  (data) => data.title || data.body || data.image_url,
  { message: 'Post must have at least a title, body, or image' }
);

export const businessPostUpdateSchema = z.object({
  title: z.string().max(120).optional().nullable(),
  body: z.string().max(1000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  cloudflare_image_id: z.string().optional().nullable(),
});

export const discoverQuerySchema = z.object({
  query: z.string().optional(),
  type: businessTypeSchema.optional(),
  group: businessTypeGroupSchema.optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius_km: z.coerce.number().int().min(1).max(100).default(25),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const businessOnboardSchema = z.object({
  business_type: businessTypeSchema,
  tier: z.enum(['basic', 'premium']),
  business_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  website_url: z.string().url().max(255).optional().nullable(),
  booking_url: z.string().url().max(255).optional().nullable(),
});
