'use client';

import { BusinessProfileHeader } from './BusinessProfileHeader';
import { BusinessProfileTabs } from './BusinessProfileTabs';
import type { BusinessProfile } from '@/types/database';

interface BusinessProfileClientProps {
  profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    plan: string;
    follower_count: number;
    business_profiles: BusinessProfile;
  };
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
  isFollowing: boolean;
  totalSaves: number;
}

export function BusinessProfileClient({ profile, dishes, menuSections, isFollowing, totalSaves }: BusinessProfileClientProps) {
  const bp = profile.business_profiles;

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full pb-24" style={{ maxWidth: 600 }}>
        <BusinessProfileHeader
          profile={profile}
          businessProfile={bp}
          isFollowing={isFollowing}
          totalSaves={totalSaves}
        />
        <BusinessProfileTabs
          businessType={bp.business_type}
          dishes={dishes}
          menuSections={menuSections}
          businessProfile={bp}
        />
      </div>
    </div>
  );
}
