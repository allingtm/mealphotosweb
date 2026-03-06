'use client';

import {
  FOOD_DRINK_TYPES,
  HEALTH_NUTRITION_TYPES,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from '@/types/database';

interface TypeSelectorProps {
  selected: BusinessType | null;
  onSelect: (type: BusinessType) => void;
}

export default function TypeSelector({ selected, onSelect }: TypeSelectorProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}
      >
        What type of business are you?
      </h2>

      {/* Food & Drink group */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}
        >
          Food & Drink
        </p>
        <div className="flex flex-col gap-2">
          {FOOD_DRINK_TYPES.map((type) => (
            <TypeOption
              key={type}
              type={type}
              isSelected={selected === type}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      {/* Health & Nutrition group */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}
        >
          Health & Nutrition
        </p>
        <div className="flex flex-col gap-2">
          {HEALTH_NUTRITION_TYPES.map((type) => (
            <TypeOption
              key={type}
              type={type}
              isSelected={selected === type}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      {/* Other */}
      <TypeOption
        type="other"
        isSelected={selected === 'other'}
        onSelect={onSelect}
      />
    </div>
  );
}

function TypeOption({
  type,
  isSelected,
  onSelect,
}: {
  type: BusinessType;
  isSelected: boolean;
  onSelect: (type: BusinessType) => void;
}) {
  return (
    <button
      onClick={() => onSelect(type)}
      className="flex items-center gap-3 w-full rounded-2xl transition-colors"
      style={{
        padding: '12px 16px',
        backgroundColor: isSelected ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-surface)',
        border: isSelected
          ? '2px solid var(--accent-primary)'
          : '1px solid var(--bg-elevated)',
        textAlign: 'left',
      }}
    >
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 20,
          height: 20,
          border: isSelected
            ? '6px solid var(--accent-primary)'
            : '2px solid var(--text-secondary)',
          backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: isSelected ? 600 : 400,
        }}
      >
        {BUSINESS_TYPE_LABELS[type]}
      </span>
    </button>
  );
}
