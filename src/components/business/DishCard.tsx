'use client';

interface DishCardProps {
  id: string;
  title: string;
  photoUrl: string;
  avgRating: number;
  ratingCount: number;
  revealed: boolean;
}

function getScoreColor(score: number): string {
  if (score <= 0) return 'var(--text-secondary)';
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

export function DishCard({ title, photoUrl, avgRating, ratingCount, revealed }: DishCardProps) {
  const displayScore = ratingCount > 0 ? avgRating.toFixed(1) : '-';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Photo */}
      <div style={{ aspectRatio: '4/5', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        {/* Score overlay */}
        <div
          className="absolute bottom-2 left-2 flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(18, 18, 18, 0.85)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              color: getScoreColor(avgRating),
              fontWeight: 600,
            }}
          >
            {displayScore}
          </span>
        </div>
        {/* Status badge */}
        <div
          className="absolute top-2 right-2 rounded-full"
          style={{
            padding: '2px 8px',
            backgroundColor: revealed
              ? 'rgba(232, 168, 56, 0.9)'
              : 'rgba(18, 18, 18, 0.85)',
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 600,
            color: revealed ? 'var(--primary-foreground)' : 'var(--text-secondary)',
          }}
        >
          {revealed ? 'pub' : 'anon'}
        </div>
      </div>
      {/* Title */}
      <div style={{ padding: '8px 12px' }}>
        <p
          className="truncate"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
        </p>
      </div>
    </div>
  );
}
