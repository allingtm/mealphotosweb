'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, MapPin, ChevronRight } from 'lucide-react';
import type { BusinessPremise } from '@/types/database';

interface PremisesListClientProps {
  premises: BusinessPremise[];
  maxPremises: number;
}

export function PremisesListClient({ premises, maxPremises }: PremisesListClientProps) {
  const router = useRouter();
  const activeCount = premises.filter((p) => p.is_active).length;

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full max-w-lg mx-auto px-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Manage Premises
          </h1>
        </div>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginBottom: 16,
        }}>
          {activeCount} active · {premises.length}/{maxPremises} total
        </p>

        {/* Premise cards */}
        <div className="flex flex-col gap-3">
          {premises.map((premise) => (
            <Link
              key={premise.id}
              href={`/settings/premises/${premise.id}`}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--bg-elevated)',
                textDecoration: 'none',
                opacity: premise.is_active ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-3">
                <MapPin size={18} strokeWidth={1.5} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
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
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}>
                    {[premise.address_city, premise.address_postcode].filter(Boolean).join(', ')}
                    {premise.dish_count > 0 && ` · ${premise.dish_count} dishes`}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>

        {/* Add premise button */}
        {premises.length < maxPremises && (
          <Link
            href="/business/premises/new"
            className="flex items-center justify-center gap-2 w-full rounded-2xl mt-6"
            style={{
              height: 48,
              backgroundColor: 'transparent',
              color: 'var(--accent-primary)',
              border: '1px solid var(--accent-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Plus size={18} strokeWidth={1.5} />
            Add Premise
          </Link>
        )}
      </div>
    </div>
  );
}
