// TypeScript interfaces matching Supabase v3 tables

// =============================================
// Business type constants
// =============================================

export const BUSINESS_TYPES = [
  // Food service
  'restaurant', 'takeaway', 'cafe', 'pub', 'bakery',
  'food_truck', 'catering', 'meal_prep_service',
  'ice_cream_parlour', 'juice_bar', 'hotel_restaurant',
  // Shops & retail
  'deli', 'farm_shop', 'butcher', 'fishmonger',
  'greengrocer', 'specialist_food_shop',
  // Chefs & experiences
  'cooking_school', 'private_chef', 'supper_club',
  'food_tour', 'food_experience',
  // Health & nutrition
  'nutritionist', 'dietitian', 'personal_trainer',
  // Production
  'artisan_producer', 'home_baker', 'chocolatier',
  // Other
  'other',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

// Type groups for map pins, profile variations, and filter pills
export const FOOD_SERVICE_TYPES: BusinessType[] = [
  'restaurant', 'takeaway', 'cafe', 'pub', 'bakery',
  'food_truck', 'catering', 'meal_prep_service',
  'ice_cream_parlour', 'juice_bar', 'hotel_restaurant',
];

export const SHOPS_RETAIL_TYPES: BusinessType[] = [
  'deli', 'farm_shop', 'butcher', 'fishmonger',
  'greengrocer', 'specialist_food_shop',
];

export const CHEFS_EXPERIENCES_TYPES: BusinessType[] = [
  'cooking_school', 'private_chef', 'supper_club',
  'food_tour', 'food_experience',
];

export const HEALTH_NUTRITION_TYPES: BusinessType[] = [
  'nutritionist', 'dietitian', 'personal_trainer',
];

export const PRODUCTION_TYPES: BusinessType[] = [
  'artisan_producer', 'home_baker', 'chocolatier',
];

export type BusinessTypeGroup =
  | 'food_service'
  | 'shops_retail'
  | 'chefs_experiences'
  | 'health_nutrition'
  | 'production'
  | 'other';

export function getBusinessTypeGroup(type: BusinessType): BusinessTypeGroup {
  if (FOOD_SERVICE_TYPES.includes(type)) return 'food_service';
  if (SHOPS_RETAIL_TYPES.includes(type)) return 'shops_retail';
  if (CHEFS_EXPERIENCES_TYPES.includes(type)) return 'chefs_experiences';
  if (HEALTH_NUTRITION_TYPES.includes(type)) return 'health_nutrition';
  if (PRODUCTION_TYPES.includes(type)) return 'production';
  return 'other';
}

// Map pin colours per type group
export const TYPE_GROUP_COLORS: Record<BusinessTypeGroup, string> = {
  food_service: '#E8A838',    // Amber
  shops_retail: '#2DD4BF',    // Teal
  chefs_experiences: '#FF6B6B', // Coral
  health_nutrition: '#4CAF50', // Green
  production: '#9B59B6',      // Purple
  other: '#888888',           // Grey
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'Restaurant',
  takeaway: 'Takeaway',
  cafe: 'Cafe / Coffee Shop',
  pub: 'Pub / Gastropub',
  bakery: 'Bakery',
  food_truck: 'Food Truck / Street Food',
  catering: 'Catering',
  meal_prep_service: 'Meal Prep Service',
  ice_cream_parlour: 'Ice Cream Parlour',
  juice_bar: 'Juice / Smoothie Bar',
  hotel_restaurant: 'Hotel Restaurant',
  deli: 'Deli / Farm Shop',
  farm_shop: 'Farm Shop',
  butcher: 'Butcher',
  fishmonger: 'Fishmonger',
  greengrocer: 'Greengrocer',
  specialist_food_shop: 'Specialist Food Shop',
  cooking_school: 'Cooking School / Classes',
  private_chef: 'Private Chef',
  supper_club: 'Supper Club',
  food_tour: 'Food Tour',
  food_experience: 'Food & Drink Experience',
  nutritionist: 'Nutritionist',
  dietitian: 'Dietitian',
  personal_trainer: 'Personal Trainer',
  artisan_producer: 'Artisan Food Producer',
  home_baker: 'Home Baker',
  chocolatier: 'Chocolatier',
  other: 'Other',
};

// Cloudflare Images named variants
export const CF_VARIANTS = {
  avatar: 'avatar',       // 80px — profile headers, comment avatars
  thumbnail: 'thumbnail', // 120px — grid views, search results, saved dishes
  feed: 'feed',           // full width — feed cards, dish detail
  full: 'public',         // full resolution — zoom/share
} as const;

export function cfImageUrl(imageId: string, variant: keyof typeof CF_VARIANTS): string {
  return `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}/${imageId}/${CF_VARIANTS[variant]}`;
}

// =============================================
// Table interfaces
// =============================================

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  is_business: boolean;
  plan: 'free' | 'business';
  stripe_customer_id: string | null;
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive';
  subscription_id: string | null;
  is_admin: boolean;
  follower_count: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: BusinessType;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  booking_url: string | null;
  menu_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string | null;
  location: unknown | null;
  opening_hours: Record<string, Array<{ open: string; close: string }>> | null;
  cuisine_types: string[];
  qualifications: string[];
  specialisms: string[];
  accepts_clients: boolean;
  consultation_type: string[];
  service_area: string | null;
  delivery_available: boolean;
  class_types: string[];
  price_from_pence: number | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessPremise {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  country_slug: string;
  region_slug: string;
  city_slug: string;
  business_categories: BusinessType[];
  address_region: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string;
  location: unknown | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  booking_url: string | null;
  opening_hours: Record<string, Array<{ open: string; close: string }>> | null;
  cuisine_types: string[] | null;
  delivery_available: boolean;
  menu_url: string | null;
  bio: string | null;
  dish_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dish {
  id: string;
  business_id: string;
  premise_id: string | null;
  title: string;
  description: string | null;
  price_pence: number | null;
  photo_url: string;
  cloudflare_image_id: string | null;
  photo_blur_hash: string | null;
  image_count: number;
  menu_item_id: string | null;
  reaction_count: number;
  save_count: number;
  comment_count: number;
  comments_enabled: boolean;
  created_at: string;
}

export interface DishImage {
  id: string;
  dish_id: string;
  position: number;
  cloudflare_image_id: string;
  photo_url: string;
  photo_blur_hash: string | null;
  created_at: string;
}

export interface Reaction {
  dish_id: string;
  user_id: string;
  created_at: string;
}

export interface Save {
  dish_id: string;
  user_id: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  dish_id: string;
  user_id: string;
  text: string;
  visible: boolean;
  created_at: string;
}

export interface CommentWithProfile {
  id: string;
  dish_id: string;
  user_id: string;
  text: string;
  visible: boolean;
  created_at: string;
  is_author: boolean;
  is_business_owner: boolean;
  is_optimistic?: boolean;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_business: boolean;
  };
}

export interface NotificationPreferences {
  new_comment: boolean;
  new_follower: boolean;
  reaction_milestone: boolean;
  new_dish: boolean;
  dish_request_nearby: boolean;
  push_enabled: boolean;
}

export interface InboxComment {
  id: string;
  dish_id: string;
  user_id: string;
  text: string;
  visible: boolean;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_business: boolean;
  };
  dishes: {
    id: string;
    title: string;
    photo_url: string;
    business_id: string;
  };
}

export interface MenuSection {
  id: string;
  business_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  section_id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_pence: number | null;
  dietary_tags: string[];
  photo_url: string | null;
  reaction_count: number;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DishRequest {
  id: string;
  user_id: string;
  dish_name: string;
  location_city: string;
  location: unknown | null;
  upvote_count: number;
  created_at: string;
}

export interface DishRequestUpvote {
  request_id: string;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_comment_id: string | null;
  reported_business_id: string | null;
  reason: 'inappropriate' | 'spam' | 'harassment' | 'misleading' | 'other';
  detail: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

// =============================================
// Composite types (from API/DB functions)
// =============================================

export interface FeedItem {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  price_pence: number | null;
  photo_url: string;
  photo_blur_hash: string | null;
  blurDataURL?: string;
  image_count: number;
  reaction_count: number;
  save_count: number;
  comment_count: number;
  created_at: string;
  business_name: string;
  business_type: BusinessType;
  avatar_url: string | null;
  address_city: string | null;
  plan: 'free' | 'business';
  username: string;
  user_has_reacted: boolean;
  user_has_saved: boolean;
  is_followed: boolean;
  distance_km: number | null;
}

export interface MapBusinessPin {
  id: string;
  business_name: string;
  business_type: BusinessType;
  business_categories?: BusinessType[];
  premise_slug?: string;
  country_slug?: string;
  region_slug?: string;
  city_slug?: string;
  avatar_url: string | null;
  address_city: string | null;
  plan: 'free' | 'business';
  lng: number;
  lat: number;
  username: string;
  last_post_at: string | null;
}

export interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  is_business: boolean;
  plan: 'free' | 'business';
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive';
  follower_count: number;
  created_at: string;
}

export interface SavedDishItem {
  dish_id: string;
  saved_at: string;
  title: string;
  price_pence: number | null;
  photo_url: string;
  photo_blur_hash: string | null;
  reaction_count: number;
  business_name: string;
  business_type: BusinessType;
  address_city: string | null;
  distance_km: number | null;
}

export interface SearchResult {
  type: 'dish' | 'business';
  id: string;
  title: string;
  photo_url: string | null;
  business_name: string;
  business_type: BusinessType;
  address_city: string | null;
  reaction_count: number;
  distance_km: number | null;
}

export interface ContactSubmission {
  id: string;
  name: string | null;
  email: string;
  subject: string | null;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'spam';
  admin_notes: string | null;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  og_image_id: string | null;
  og_image_url: string | null;
  featured: boolean;
  published: boolean;
  author_id: string;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // Joined fields
  tags?: BlogTag[];
  author?: { display_name: string | null; username: string };
}
