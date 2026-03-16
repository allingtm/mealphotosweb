interface VerifiedBadgeProps {
  size?: number;
}

export function VerifiedBadge({ size = 14 }: VerifiedBadgeProps) {
  return (
    <span
      className="inline-flex items-center"
      aria-label="Verified restaurant"
      title="Verified restaurant"
    >
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill="var(--accent-primary)" />
        <path
          d="M5 8L7 10L11 6"
          stroke="var(--bg-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
