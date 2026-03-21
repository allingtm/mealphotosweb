'use client';

import { ChevronDown, MapPin, Plus, Settings } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import type { BusinessPremise } from '@/types/database';

interface PremiseSwitcherProps {
  showAddButton?: boolean;
  maxPremises?: number;
}

export function PremiseSwitcher({ showAddButton = false, maxPremises = 5 }: PremiseSwitcherProps) {
  const premises = useAppStore((s) => s.premises);
  const activePremiseId = useAppStore((s) => s.activePremiseId);
  const setActivePremiseId = useAppStore((s) => s.setActivePremiseId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Don't show switcher for single premise
  if (premises.length <= 1 && !showAddButton) return null;

  const activePremise = premises.find((p) => p.id === activePremiseId) ?? premises[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--bg-elevated)',
        }}
      >
        <MapPin size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activePremise?.name ?? 'Select premise'}
        </span>
        {premises.length > 1 && (
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            style={{
              color: 'var(--text-secondary)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 150ms',
            }}
          />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-72 rounded-xl overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {premises.map((premise) => (
            <div
              key={premise.id}
              className="flex items-center justify-between px-3 py-2.5 transition-colors"
              style={{
                backgroundColor: premise.id === activePremiseId ? 'rgba(232, 168, 56, 0.1)' : 'transparent',
                borderLeft: premise.id === activePremiseId ? '3px solid var(--accent-primary)' : '3px solid transparent',
                opacity: premise.is_active ? 1 : 0.5,
                cursor: premise.is_active ? 'pointer' : 'default',
              }}
              onClick={premise.is_active ? () => {
                setActivePremiseId(premise.id);
                setIsOpen(false);
              } : undefined}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {premise.name}
                  </span>
                  {!premise.is_active && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-elevated)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}>
                      Inactive
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {[premise.address_city, premise.address_postcode].filter(Boolean).join(', ')}
                </span>
              </div>
              <Link
                href={`/settings/premises/${premise.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                style={{ padding: 4, color: 'var(--text-secondary)', flexShrink: 0 }}
                aria-label={`Manage ${premise.name}`}
              >
                <Settings size={16} strokeWidth={1.5} />
              </Link>
            </div>
          ))}

          {showAddButton && premises.length < maxPremises && (
            <>
              <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)' }} />
              <Link
                href="/business/premises/new"
                className="flex items-center gap-2 w-full px-3 py-2.5 transition-colors"
                style={{ color: 'var(--accent-primary)' }}
                onClick={() => setIsOpen(false)}
              >
                <Plus size={16} strokeWidth={1.5} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
                  Add premise
                </span>
              </Link>
            </>
          )}

          {showAddButton && (
            <div
              className="px-3 py-1.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              {premises.length}/{maxPremises} premises
            </div>
          )}
        </div>
      )}
    </div>
  );
}
