import { UtensilsCrossed, Star, ThumbsUp, Crown } from 'lucide-react';

interface ExploreStatsProps {
  totalMeals: number;
  avgScore: number;
  totalRatings: number;
  topContributor: { username: string; meal_count: number } | null;
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ExploreStats({
  totalMeals,
  avgScore,
  totalRatings,
  topContributor,
}: ExploreStatsProps) {
  const stats = [
    {
      label: 'Total Meals',
      value: formatNumber(totalMeals),
      icon: UtensilsCrossed,
      color: 'var(--text-primary)',
    },
    {
      label: 'Avg Score',
      value: avgScore > 0 ? `${avgScore.toFixed(1)}/10` : '-',
      icon: Star,
      color: avgScore > 0 ? getScoreColor(avgScore) : 'var(--text-secondary)',
    },
    {
      label: 'Total Ratings',
      value: formatNumber(totalRatings),
      icon: ThumbsUp,
      color: 'var(--text-primary)',
    },
    {
      label: 'Top Contributor',
      value: topContributor ? `@${topContributor.username}` : '-',
      icon: Crown,
      color: 'var(--accent-primary)',
      subtitle: topContributor
        ? `${topContributor.meal_count} meal${topContributor.meal_count !== 1 ? 's' : ''}`
        : undefined,
    },
  ];

  return (
    <section aria-label="Statistics">
      <div className="grid grid-cols-2 gap-[16px] lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-[8px] rounded-[16px] p-[24px]"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <Icon
                size={24}
                strokeWidth={1.5}
                style={{ color: stat.color }}
                aria-hidden="true"
              />
              <span
                className="text-sm"
                style={{
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                }}
              >
                {stat.label}
              </span>
              <span
                className="text-2xl font-bold truncate max-w-full"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: stat.color,
                }}
              >
                {stat.value}
              </span>
              {stat.subtitle && (
                <span
                  className="text-xs"
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {stat.subtitle}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
