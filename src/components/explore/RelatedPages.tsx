import Link from 'next/link';
import { MapPin, UtensilsCrossed } from 'lucide-react';

interface RelatedPagesProps {
  relatedCities: { slug: string; name: string; meal_count: number }[];
  relatedCuisines: { slug: string; name: string; meal_count: number }[];
}

export function RelatedPages({
  relatedCities,
  relatedCuisines,
}: RelatedPagesProps) {
  const hasCities = relatedCities.length > 0;
  const hasCuisines = relatedCuisines.length > 0;

  if (!hasCities && !hasCuisines) return null;

  return (
    <section aria-label="Related pages">
      <h2
        className="text-xl mb-4"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
        }}
      >
        People also explore
      </h2>

      <div className="flex flex-col gap-4">
        {hasCities && (
          <div>
            <h3
              className="text-sm mb-2 flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
              }}
            >
              <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
              Cities
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/explore/${city.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {city.name}
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {city.meal_count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {hasCuisines && (
          <div>
            <h3
              className="text-sm mb-2 flex items-center gap-2"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
              }}
            >
              <UtensilsCrossed
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Cuisines
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedCuisines.map((cuisine) => (
                <Link
                  key={cuisine.slug}
                  href={`/explore/cuisine/${cuisine.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {cuisine.name}
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {cuisine.meal_count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
