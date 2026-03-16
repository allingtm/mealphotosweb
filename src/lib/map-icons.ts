/**
 * V3: Type group colors for map pins.
 * Canvas-based icons are no longer needed — we use Mapbox circle layers
 * with data-driven colors from TYPE_GROUP_COLORS.
 *
 * This file is kept for reference but not actively used by MapView.tsx.
 * Colors are defined in src/types/database.ts as TYPE_GROUP_COLORS.
 */

export const MAP_PIN_COLORS = {
  food_service: '#E8A838',    // Amber
  shops_retail: '#2DD4BF',    // Teal
  chefs_experiences: '#FF6B6B', // Coral
  health_nutrition: '#4CAF50', // Green
  production: '#9B59B6',      // Purple
  other: '#888888',           // Grey
} as const;
