'use client';

import { useEffect } from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DangerZoneDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DangerZoneDrawer({ isOpen, onClose }: DangerZoneDrawerProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-modal)',
          borderTopRightRadius: 'var(--radius-modal)',
          padding: '32px 24px 40px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label={tCommon('close')}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {/* Heading */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--status-error)',
            margin: '0 0 24px',
          }}
        >
          {t('dangerZone')}
        </h2>

        {/* Items */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          {/* Export Data */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ opacity: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--text-secondary)' }}>
                <Download size={20} strokeWidth={1.5} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                }}
              >
                {t('exportData')}
              </span>
            </div>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              {t('comingSoon')}
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              backgroundColor: 'var(--bg-elevated)',
              marginLeft: 52,
            }}
          />

          {/* Delete Account */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ opacity: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--status-error)' }}>
                <Trash2 size={20} strokeWidth={1.5} />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--status-error)',
                }}
              >
                {t('deleteAccount')}
              </span>
            </div>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              {t('comingSoon')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
