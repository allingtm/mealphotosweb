interface StatsRowProps {
  mealCount: number;
  avgRating: number;
  streak: number;
}

export function StatsRow({ mealCount, avgRating, streak }: StatsRowProps) {
  return (
    <div
      className="grid grid-cols-3 text-center"
      style={{ padding: '16px 0', gap: 8 }}
    >
      <StatItem value={String(mealCount)} label="Meals" />
      <StatItem
        value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
        label="Avg Rating"
      />
      <StatItem
        value={streak > 0 ? `${streak} 🔥` : '0'}
        label="Streak"
      />
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginTop: 4,
        }}
      >
        {label}
      </p>
    </div>
  );
}
