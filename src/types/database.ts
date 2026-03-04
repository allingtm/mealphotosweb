// TypeScript interfaces matching Supabase tables

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  streak_current: number;
  streak_best: number;
  streak_last_upload: string | null; // DATE as ISO string
  timezone: string;
  is_restaurant: boolean;
  stripe_customer_id: string | null;
  subscription_tier: 'basic' | 'premium' | null;
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive';
  subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  title: string;
  photo_url: string;
  cloudflare_image_id: string | null;
  photo_blur_hash: string | null;
  location: unknown | null; // PostGIS GEOGRAPHY(Point, 4326)
  location_city: string | null;
  location_country: string | null;
  tags: string[];
  cuisine:
    | 'italian'
    | 'asian'
    | 'mexican'
    | 'british'
    | 'indian'
    | 'middle_eastern'
    | 'american'
    | 'french'
    | 'other'
    | null;
  rating_count: number;
  rating_sum: number;
  avg_rating: number;
  recipe_request_count: number;
  recipe_unlock_threshold: number;
  recipe_unlocked: boolean;
  is_restaurant_meal: boolean;
  restaurant_id: string | null;
  restaurant_revealed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  meal_id: string;
  user_id: string;
  score: number; // 1–10
  created_at: string;
}

export interface RecipeRequest {
  id: string;
  meal_id: string;
  user_id: string;
  created_at: string;
}

export interface Ingredient {
  quantity: number;
  unit: 'g' | 'kg' | 'ml' | 'L' | 'tsp' | 'tbsp' | 'cup' | 'piece' | 'pinch';
  name: string;
}

export interface Recipe {
  id: string;
  meal_id: string;
  ingredients: Ingredient[];
  method: string[];
  cook_time_minutes: number | null;
  serves: number | null;
  created_at: string;
  updated_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
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

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: string;
  awarded_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_meal_id: string | null;
  reported_user_id: string | null;
  reason: 'not_food' | 'inappropriate' | 'spam' | 'harassment' | 'other';
  detail: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
}

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  meal_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface MealModeration {
  id: string;
  meal_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'manual_review';
  moderation_labels: Record<string, unknown>;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// Composite types from database functions

export interface FeedItem {
  id: string;
  user_id: string;
  title: string;
  photo_url: string;
  photo_blur_hash: string | null;
  location_city: string | null;
  avg_rating: number;
  rating_count: number;
  recipe_request_count: number;
  recipe_unlock_threshold: number;
  recipe_unlocked: boolean;
  created_at: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  user_has_rated: boolean;
  user_rating: number | null;
  feed_score: number;
  comment_count: number;
}

export interface MapPin {
  id: string;
  title: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
  recipe_request_count: number;
  lng: number;
  lat: number;
  is_restaurant: boolean;
  username: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  streak_current: number;
  streak_best: number;
  is_restaurant: boolean;
  created_at: string;
}
