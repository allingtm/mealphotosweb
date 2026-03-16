'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBusinessTypeGroup, type BusinessType, type BusinessProfile } from '@/types/database';
import { LatestDishesGrid } from './LatestDishesGrid';
import { MenuTab } from './MenuTab';
import { AboutTab } from './AboutTab';

interface BusinessProfileTabsProps {
  businessType: BusinessType;
  dishes: {
    id: string;
    title: string;
    photo_url: string;
    photo_blur_hash: string | null;
    reaction_count: number;
    created_at: string;
  }[];
  menuSections: {
    id: string;
    name: string;
    sort_order: number;
    menu_items: {
      id: string;
      name: string;
      description: string | null;
      price_pence: number | null;
      dietary_tags: string[];
      photo_url: string | null;
      reaction_count: number;
      available: boolean;
    }[];
  }[];
  businessProfile: BusinessProfile;
}

function getTabConfig(type: BusinessType) {
  const group = getBusinessTypeGroup(type);

  switch (group) {
    case 'food_service':
      return [
        { value: 'dishes', label: 'Latest Dishes' },
        { value: 'menu', label: 'Menu' },
        { value: 'about', label: 'About' },
      ];
    case 'shops_retail':
    case 'production':
      return [
        { value: 'dishes', label: 'Latest Products' },
        { value: 'about', label: 'About' },
      ];
    case 'chefs_experiences':
    case 'health_nutrition':
    default:
      return [
        { value: 'dishes', label: 'Latest Posts' },
        { value: 'about', label: 'About' },
      ];
  }
}

export function BusinessProfileTabs({ businessType, dishes, menuSections, businessProfile }: BusinessProfileTabsProps) {
  const tabs = getTabConfig(businessType);
  const hasMenu = tabs.some((t) => t.value === 'menu');

  return (
    <Tabs defaultValue="dishes" className="w-full">
      <TabsList className="w-full justify-start gap-0 rounded-none border-b px-4" style={{ backgroundColor: 'transparent', borderColor: 'var(--bg-elevated)' }}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-[var(--accent-primary)]"
            style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500 }}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="dishes" className="px-4 pt-4">
        <LatestDishesGrid dishes={dishes} />
      </TabsContent>

      {hasMenu && (
        <TabsContent value="menu" className="px-4 pt-4">
          <MenuTab sections={menuSections} />
        </TabsContent>
      )}

      <TabsContent value="about" className="px-4 pt-4">
        <AboutTab businessProfile={businessProfile} />
      </TabsContent>
    </Tabs>
  );
}
