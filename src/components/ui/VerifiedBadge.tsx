import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--accent-primary)',
      }}
      title="Verified business"
      aria-label="Verified business"
    >
      <Check
        size={Math.round(size * 0.7)}
        strokeWidth={2.5}
        style={{ color: 'var(--primary-foreground)' }}
      />
    </span>
  );
}
