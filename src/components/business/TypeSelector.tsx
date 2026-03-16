'use client';

import {
  FOOD_SERVICE_TYPES,
  SHOPS_RETAIL_TYPES,
  CHEFS_EXPERIENCES_TYPES,
  HEALTH_NUTRITION_TYPES,
  PRODUCTION_TYPES,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from '@/types/database';

const TYPE_GROUPS = [
  { label: 'Food Service', types: FOOD_SERVICE_TYPES },
  { label: 'Shops & Retail', types: SHOPS_RETAIL_TYPES },
  { label: 'Chefs & Experiences', types: CHEFS_EXPERIENCES_TYPES },
  { label: 'Health & Nutrition', types: HEALTH_NUTRITION_TYPES },
  { label: 'Production', types: PRODUCTION_TYPES },
];

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
          fontSize: 22,
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}
      >
        What type of business are you?
      </h2>

      {TYPE_GROUPS.map((group) => (
        <div key={group.label}>
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
            {group.label}
          </p>
          <div className="flex flex-col gap-2">
            {group.types.map((type) => (
              <TypeOption
                key={type}
                type={type}
                isSelected={selected === type}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Other — outside any group */}
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
      type="button"
      onClick={() => onSelect(type)}
      className="flex items-center gap-3 w-full rounded-2xl transition-colors"
      style={{
        padding: '12px 16px',
        minHeight: 48,
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
