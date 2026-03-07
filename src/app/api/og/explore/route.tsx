import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { CUISINE_OPTIONS, CUISINE_LABELS } from '@/lib/validations/meal';
import { deslugify } from '@/lib/validations/explore';

export const runtime = 'nodejs';

const size = { width: 1200, height: 630 };

function resolveDisplayName(slugParts: string[]): string | null {
  const cuisineValues = CUISINE_OPTIONS as readonly string[];

  if (slugParts.length === 1) {
    if (slugParts[0] === 'cuisine') return null;
    if (cuisineValues.includes(slugParts[0])) {
      return CUISINE_LABELS[slugParts[0] as keyof typeof CUISINE_LABELS] ?? slugParts[0];
    }
    return deslugify(slugParts[0]);
  }

  if (slugParts.length === 2) {
    if (slugParts[0] === 'cuisine' && cuisineValues.includes(slugParts[1])) {
      return CUISINE_LABELS[slugParts[1] as keyof typeof CUISINE_LABELS] ?? slugParts[1];
    }
    if (cuisineValues.includes(slugParts[1])) {
      const city = deslugify(slugParts[0]);
      const cuisine = CUISINE_LABELS[slugParts[1] as keyof typeof CUISINE_LABELS] ?? slugParts[1];
      return `${cuisine} in ${city}`;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#121212',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 64, color: '#F5F0E8', fontWeight: 700 }}>
            meal.photos
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const slugParts = slug.split('/');
  const displayName = resolveDisplayName(slugParts);

  if (!displayName) {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#121212',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 64, color: '#F5F0E8', fontWeight: 700 }}>
            meal.photos
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const cuisineValues = CUISINE_OPTIONS as readonly string[];

  let totalMeals = 0;
  let avgScore = 0;
  try {
    const isCuisine =
      (slugParts.length === 1 && cuisineValues.includes(slugParts[0])) ||
      (slugParts.length === 2 && slugParts[0] === 'cuisine');
    const cuisineSlug = isCuisine ? slugParts[slugParts.length - 1] : slugParts.length === 2 && cuisineValues.includes(slugParts[1]) ? slugParts[1] : null;
    const citySlug = !isCuisine ? slugParts[0] : slugParts.length === 2 && !isCuisine ? slugParts[0] : null;

    const supabase = createServiceRoleClient();
    const { data } = await supabase.rpc('get_explore_page', {
      p_city: citySlug ?? null,
      p_country: null,
      p_cuisine: cuisineSlug ?? null,
      p_limit: 1,
    });

    if (data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      totalMeals = parsed.total_meals ?? 0;
      avgScore = parsed.avg_score ?? 0;
    }
  } catch {
    // Stats are best-effort for OG image
  }

  const isCuisinePage =
    (slugParts.length === 1 && cuisineValues.includes(slugParts[0])) ||
    (slugParts.length === 2 && slugParts[0] === 'cuisine');
  const isCombinedPage = slugParts.length === 2 && slugParts[0] !== 'cuisine' && cuisineValues.includes(slugParts[1]);

  const pageTitle = isCuisinePage
    ? `Best ${displayName} food rated by real people`
    : isCombinedPage
      ? `Best ${displayName} meals`
      : `Best rated meals in ${displayName}`;

  const subtitle = totalMeals > 0
    ? `${totalMeals} meals rated${avgScore > 0 ? ` · Avg score ${avgScore.toFixed(1)}/10` : ''}`
    : 'Explore meals on meal.photos';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#121212',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: '#888888',
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          meal.photos
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#F5F0E8',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '100%',
          }}
        >
          {pageTitle}
        </div>

        <div
          style={{
            fontSize: 28,
            color: '#E8A838',
            marginTop: 24,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { ...size }
  );
}
