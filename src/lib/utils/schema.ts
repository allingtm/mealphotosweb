import type { BusinessType } from '@/types/database';

const SCHEMA_TYPE_MAP: Partial<Record<BusinessType, string>> = {
  restaurant: 'Restaurant',
  cafe: 'CafeOrCoffeeShop',
  pub: 'BarOrPub',
  bakery: 'Bakery',
  hotel_restaurant: 'Restaurant',
  takeaway: 'FastFoodRestaurant',
  food_truck: 'FoodEstablishment',
  ice_cream_parlour: 'IceCreamShop',
  juice_bar: 'FoodEstablishment',
  deli: 'FoodEstablishment',
};

export function getSchemaOrgType(businessType: BusinessType): string {
  return SCHEMA_TYPE_MAP[businessType] ?? 'FoodEstablishment';
}

const DAY_MAP: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

export function formatOpeningHours(
  hours: Record<string, { open: string; close: string }> | null
): object[] | undefined {
  if (!hours || Object.keys(hours).length === 0) return undefined;

  return Object.entries(hours)
    .filter(([day]) => DAY_MAP[day])
    .map(([day, { open, close }]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_MAP[day],
      opens: open,
      closes: close,
    }));
}
