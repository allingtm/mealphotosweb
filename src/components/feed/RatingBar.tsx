'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface RatingBarProps {
  mealId: string;
  isOwnMeal: boolean;
  hasRated: boolean;
  existingRating: number | null;
  onRate: (score: number) => void;
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'var(--status-error)';
  if (score <= 5) return 'var(--accent-primary)';
  if (score <= 7) return 'var(--text-primary)';
  return 'var(--status-success)';
}

export function RatingBar({
  isOwnMeal,
  hasRated,
  existingRating,
  onRate,
}: RatingBarProps) {
  const t = useTranslations('rating');
  const [selectedScore, setSelectedScore] = useState<number | null>(
    existingRating
  );
  const [animatingScore, setAnimatingScore] = useState<number | null>(null);

  const handleRate = useCallback(
    (score: number) => {
      if (hasRated || selectedScore !== null) return;

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }

      setSelectedScore(score);
      setAnimatingScore(score);
      onRate(score);

      setTimeout(() => setAnimatingScore(null), 300);
    },
    [hasRated, selectedScore, onRate]
  );

  if (isOwnMeal) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: 12,
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}
      >
        {t('yourMeal')}
      </div>
    );
  }

  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  const isDisabled = hasRated || selectedScore !== null;

  return (
    <div
      role="radiogroup"
      aria-label={t('rateThisMeal')}
      className="flex items-center justify-center"
      style={{ padding: '4px 0' }}
    >
      <div
        className="flex items-center justify-center gap-1"
        style={{
          padding: '6px 8px',
          borderRadius: 20,
          backgroundColor: 'rgba(18, 18, 18, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          willChange: 'transform',
        }}
      >
        {numbers.map((n) => (
          <RatingNumber
            key={n}
            value={n}
            selected={selectedScore === n}
            animating={animatingScore === n}
            disabled={isDisabled}
            onSelect={handleRate}
          />
        ))}
      </div>
    </div>
  );
}

function RatingNumber({
  value,
  selected,
  animating,
  disabled,
  onSelect,
}: {
  value: number;
  selected: boolean;
  animating: boolean;
  disabled: boolean;
  onSelect: (n: number) => void;
}) {
  const t = useTranslations('rating');

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected ? 'true' : 'false'}
      aria-label={t('rateOutOf10', { value })}
      disabled={disabled && !selected}
      onClick={() => onSelect(value)}
      className="flex items-center justify-center"
      style={{
        width: 32,
        height: 36,
        borderRadius: 10,
        backgroundColor: selected
          ? getScoreColor(value)
          : 'rgba(18, 18, 18, 0.6)',
        border: selected
          ? 'none'
          : '1.5px solid rgba(245, 240, 232, 0.15)',
        color: selected ? 'var(--bg-primary)' : 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled && !selected ? 'default' : 'pointer',
        opacity: disabled && !selected ? 0.25 : 1,
        animation: animating ? 'rating-pop 300ms ease-out' : 'none',
        transition: 'opacity 200ms ease-out',
      }}
    >
      {value}
    </button>
  );
}
