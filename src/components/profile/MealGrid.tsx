import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

interface MealGridItem {
  id: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
}

interface MealGridProps {
  meals: MealGridItem[];
  showHeart?: boolean;
}

export function MealGrid({ meals, showHeart }: MealGridProps) {
  if (meals.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: '48px 16px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
        }}
      >
        {showHeart ? 'No saved meals yet' : 'No meals uploaded yet'}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-3"
      style={{ gap: 2 }}
    >
      {meals.map((meal) => (
        <Link
          key={meal.id}
          href={`/meal/${meal.id}`}
          className="relative block"
          style={{ aspectRatio: '1' }}
        >
          <Image
            src={meal.photo_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, 213px"
          />
          {/* Score badge */}
          {meal.rating_count > 0 && (
            <span
              className="absolute bottom-1 right-1 flex items-center justify-center"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 600,
                color: getScoreColor(Number(meal.avg_rating)),
                backgroundColor: 'rgba(18, 18, 18, 0.75)',
                borderRadius: 6,
                padding: '2px 6px',
                minWidth: 28,
              }}
            >
              {Number(meal.avg_rating).toFixed(1)}
            </span>
          )}
          {/* Heart overlay for saved tab */}
          {showHeart && (
            <span
              className="absolute top-1 right-1 flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(18, 18, 18, 0.6)',
                borderRadius: 'var(--radius-full)',
                width: 24,
                height: 24,
              }}
            >
              <Heart
                size={14}
                strokeWidth={1.5}
                fill="var(--accent-primary)"
                color="var(--accent-primary)"
              />
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
