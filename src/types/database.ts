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
  plan: 'free' | 'personal' | 'business';
  business_type: string | null;
  is_restaurant: boolean;
  stripe_customer_id: string | null;
  subscription_tier: 'basic' | 'premium' | 'personal' | null;
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive';
  subscription_id: string | null;
  is_admin: boolean;
  moderation_tier: 'new' | 'trusted' | 'flagged';
  banned_at: string | null;
  suspended_until: string | null;
  ban_reason: string | null;
  show_location: boolean;
  show_streak: boolean;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface RestaurantClaim {
  id: string;
  venue_mapbox_id: string;
  venue_name: string;
  claimed_by: string;
  outreach_status: 'pending' | 'claimed' | 'verified' | 'rejected';
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
  venue_name: string | null;
  venue_mapbox_id: string | null;
  venue_address: string | null;
  visibility: 'public' | 'private';
  image_count: number;
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
  notify_on_upload: boolean;
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
  reason:
    | 'not_food' | 'inappropriate' | 'spam' | 'harassment' | 'other'
    | 'stolen_photo' | 'wrong_venue' | 'food_safety' | 'privacy' | 'copyright';
  priority: 'urgent' | 'high' | 'standard';
  detail: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
}

export interface VenueDispute {
  id: string;
  meal_id: string;
  restaurant_profile_id: string;
  venue_mapbox_id: string;
  reason: 'not_served_here' | 'wrong_location' | 'fake_photo' | 'other';
  detail: string | null;
  status: 'pending' | 'upheld' | 'dismissed';
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
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
  cloud_vision_checked: boolean;
}

// Composite types from database functions

export interface MealImage {
  id: string;
  meal_id: string;
  position: number;
  cloudflare_image_id: string;
  photo_url: string;
  photo_blur_hash: string | null;
  created_at: string;
}

export interface PrivateFeedListEntry {
  id: string;
  owner_id: string;
  member_id: string;
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  accepted_at: string | null;
}

export interface FeedItem {
  id: string;
  user_id: string;
  title: string;
  photo_url: string;
  photo_blur_hash: string | null;
  /** Server-computed base64 data URL from blurhash (first 3 cards only) */
  blurDataURL?: string;
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
  venue_name: string | null;
  venue_mapbox_id: string | null;
  venue_verified: boolean;
  user_has_requested: boolean;
  user_is_following: boolean;
  visibility: 'public' | 'private';
  image_count: number;
}

export interface FollowingFeedItem {
  id: string;
  user_id: string;
  title: string;
  photo_url: string;
  photo_blur_hash: string | null;
  blurDataURL?: string;
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
  comment_count: number;
  venue_name: string | null;
  venue_mapbox_id: string | null;
  venue_verified: boolean;
  user_has_requested: boolean;
  visibility: 'public' | 'private';
  image_count: number;
}

export interface FollowSuggestion {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  meal_count: number;
  avg_rating: number;
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
  bio: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  streak_current: number;
  streak_best: number;
  plan: 'free' | 'personal' | 'business';
  is_restaurant: boolean;
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'inactive';
  follower_count: number;
  following_count: number;
  show_location: boolean;
  show_streak: boolean;
  created_at: string;
}

export interface ProfileStats {
  meal_count: number;
  avg_rating: number;
  ratings_given_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  meal_count: number;
  avg_rating: number;
}
