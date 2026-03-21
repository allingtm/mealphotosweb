'use client';

import { Check } from 'lucide-react';
import {
  FOOD_SERVICE_TYPES,
  SHOPS_RETAIL_TYPES,
  CHEFS_EXPERIENCES_TYPES,
  HEALTH_NUTRITION_TYPES,
  PRODUCTION_TYPES,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from '@/types/database';

const MAX_CATEGORIES = 5;

const TYPE_GROUPS = [
  { label: 'Food Service', types: FOOD_SERVICE_TYPES },
  { label: 'Shops & Retail', types: SHOPS_RETAIL_TYPES },
  { label: 'Chefs & Experiences', types: CHEFS_EXPERIENCES_TYPES },
  { label: 'Health & Nutrition', types: HEALTH_NUTRITION_TYPES },
  { label: 'Production', types: PRODUCTION_TYPES },
];

interface CategorySelectorProps {
  selected: BusinessType[];
  onSelect: (categories: BusinessType[]) => void;
  hideTitle?: boolean;
}

export default function CategorySelector({ selected, onSelect, hideTitle = false }: CategorySelectorProps) {
  const toggle = (type: BusinessType) => {
    if (selected.includes(type)) {
      onSelect(selected.filter((t) => t !== type));
    } else if (selected.length < MAX_CATEGORIES) {
      onSelect([...selected, type]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!hideTitle && (
        <div className="text-center">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              color: 'var(--text-primary)',
            }}
          >
            What type of business are you?
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              marginTop: 8,
            }}
          >
            Select up to {MAX_CATEGORIES} categories
            <span
              style={{
                marginLeft: 8,
                fontWeight: 600,
                color: selected.length >= MAX_CATEGORIES ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              {selected.length}/{MAX_CATEGORIES}
            </span>
          </p>
        </div>
      )}

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
              <CategoryOption
                key={type}
                type={type}
                isSelected={selected.includes(type)}
                isDisabled={!selected.includes(type) && selected.length >= MAX_CATEGORIES}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Other — outside any group */}
      <CategoryOption
        type="other"
        isSelected={selected.includes('other')}
        isDisabled={!selected.includes('other') && selected.length >= MAX_CATEGORIES}
        onToggle={toggle}
      />
    </div>
  );
}

function CategoryOption({
  type,
  isSelected,
  isDisabled,
  onToggle,
}: {
  type: BusinessType;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (type: BusinessType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(type)}
      disabled={isDisabled}
      className="flex items-center gap-3 w-full rounded-2xl transition-colors"
      style={{
        padding: '12px 16px',
        minHeight: 48,
        backgroundColor: isSelected ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-surface)',
        border: isSelected
          ? '2px solid var(--accent-primary)'
          : '1px solid var(--bg-elevated)',
        textAlign: 'left',
        opacity: isDisabled ? 0.4 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="flex items-center justify-center rounded shrink-0"
        style={{
          width: 20,
          height: 20,
          border: isSelected
            ? 'none'
            : '2px solid var(--text-secondary)',
          backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
          borderRadius: 4,
        }}
      >
        {isSelected && <Check size={14} strokeWidth={2.5} color="var(--bg-primary)" />}
      </div>
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
