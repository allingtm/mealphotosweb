'use client';

import { useState, useCallback } from 'react';

interface RatingBarProps {
  mealId: string;
  isOwnMeal: boolean;
  hasRated: boolean;
  existingRating: number | null;
  onRate: (score: number) => void;
}

export function RatingBar({
  isOwnMeal,
  hasRated,
  existingRating,
  onRate,
}: RatingBarProps) {
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

      setTimeout(() => setAnimatingScore(null), 200);
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
        Your meal
      </div>
    );
  }

  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);
  const isDisabled = hasRated || selectedScore !== null;

  return (
    <div
      role="radiogroup"
      aria-label="Rate this meal"
      className="flex flex-wrap justify-center gap-1"
      style={{ padding: '8px 0' }}
    >
      {/* Two-row layout for narrow viewports, single row for wider */}
      <div className="hidden min-[400px]:flex gap-1 justify-center">
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
      <div className="flex flex-col gap-1 min-[400px]:hidden">
        <div className="flex gap-1 justify-center">
          {numbers.slice(0, 5).map((n) => (
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
        <div className="flex gap-1 justify-center">
          {numbers.slice(5).map((n) => (
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
  return (
    <button
      role="radio"
      aria-checked={selected}
      aria-label={`Rate ${value} out of 10`}
      disabled={disabled && !selected}
      onClick={() => onSelect(value)}
      className="flex items-center justify-center transition-transform"
      style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-full)',
        backgroundColor: selected
          ? 'var(--accent-primary)'
          : 'rgba(18, 18, 18, 0.5)',
        border: selected
          ? 'none'
          : '1px solid rgba(245, 240, 232, 0.2)',
        color: selected ? 'var(--bg-primary)' : 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        fontSize: 16,
        fontWeight: 600,
        cursor: disabled && !selected ? 'default' : 'pointer',
        opacity: disabled && !selected ? 0.4 : 1,
        transform: animating ? 'scale(1.2)' : 'scale(1)',
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
    >
      {value}
    </button>
  );
}
