'use client';

import { useTranslations } from 'next-intl';

interface ScoreDistributionProps {
  distribution: { score: number; count: number }[];
  totalRatings: number;
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

export function ScoreDistribution({
  distribution,
  totalRatings,
}: ScoreDistributionProps) {
  const t = useTranslations('score');

  if (totalRatings === 0) return null;

  const maxCount = Math.max(...distribution.map((d) => d.count));

  // Display 10 at top, 1 at bottom (per wireframe)
  const sorted = [...distribution].sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: '24px 0' }}>
      <h3
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 16,
        }}
      >
        {t('distribution')}
      </h3>
      <div className="flex flex-col gap-2">
        {sorted.map(({ score, count }) => {
          const percentage =
            totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
          const barWidth =
            maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%';

          return (
            <div key={score} className="flex items-center gap-3">
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: getScoreColor(score),
                  width: 24,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {score}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-surface)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: barWidth,
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: getScoreColor(score),
                    transition: 'width 300ms ease-out',
                    minWidth: count > 0 ? 4 : 0,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  width: 36,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
