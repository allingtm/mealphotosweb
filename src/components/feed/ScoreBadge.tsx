'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface ScoreBadgeProps {
  score: number;
  visible: boolean;
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

export function ScoreBadge({ score, visible }: ScoreBadgeProps) {
  const t = useTranslations('rating');
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) {
      setDisplayValue(0);
      return;
    }

    const startTime = performance.now();
    const duration = 300;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Spring-like easing: overshoot then settle
      const eased =
        progress < 1
          ? 1 - Math.cos((progress * Math.PI) / 2)
          : 1;
      setDisplayValue(Number((score * eased).toFixed(1)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(Number(score.toFixed(1)));
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, visible]);

  if (!visible) return null;

  const color = getScoreColor(score);

  return (
    <div
      className="flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={t('avgScore', { score: score.toFixed(1) })}
      style={{
        width: 64,
        height: 64,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'rgba(18, 18, 18, 0.7)',
        border: `2px solid ${color}`,
        animation: 'score-pop 300ms ease-out',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          color,
        }}
      >
        {displayValue.toFixed(1)}
      </span>
    </div>
  );
}
