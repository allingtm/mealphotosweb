'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, X, Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toast';

const REPORT_REASONS = [
  { value: 'not_food', label: 'Not food' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam / promotional' },
  { value: 'stolen_photo', label: 'Stolen photo' },
  { value: 'wrong_venue', label: 'Wrong restaurant tagged' },
  { value: 'food_safety', label: 'Food safety concern' },
  { value: 'privacy', label: 'Privacy issue' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
] as const;

interface ReportButtonProps {
  mealId: string;
}

export function ReportButton({ mealId }: ReportButtonProps) {
  const t = useTranslations('actions');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = useCallback(() => {
    setMenuOpen(true);
  }, []);

  const handleOpenReport = useCallback(() => {
    setMenuOpen(false);
    if (!user) {
      openAuthModal();
      return;
    }
    setIsOpen(true);
    setSelectedReason(null);
    setDetail('');
  }, [user, openAuthModal]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Escape key to close
  useEffect(() => {
    if (!isOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOpen) handleClose();
        if (menuOpen) setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, menuOpen, handleClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_meal_id: mealId,
          reason: selectedReason,
          detail: detail.trim() || undefined,
        }),
      });
      if (res.ok) {
        showToast('Report submitted. Thank you.', 'success');
        setIsOpen(false);
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Failed to submit report', 'error');
      }
    } catch {
      showToast('Failed to submit report', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [mealId, selectedReason, detail, submitting]);

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(18, 18, 18, 0.5)',
        }}
        aria-label={t('moreOptions')}
      >
        <MoreVertical
          size={24}
          strokeWidth={1.5}
          color="var(--text-primary)"
        />
      </button>

      {/* Quick-action menu — portalled to escape overflow-hidden */}
      {menuOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-lg animate-slide-up"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderTopLeftRadius: 'var(--radius-modal)',
              borderTopRightRadius: 'var(--radius-modal)',
              padding: '16px 16px 40px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleOpenReport}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--bg-elevated)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--status-error)',
                border: 'none',
                textAlign: 'left',
              }}
            >
              <Flag size={18} strokeWidth={1.5} />
              Report this meal
            </button>
          </div>
        </div>
      , document.body)}

      {/* Full report modal — portalled to escape overflow-hidden */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-lg animate-slide-up"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderTopLeftRadius: 'var(--radius-modal)',
              borderTopRightRadius: 'var(--radius-modal)',
              padding: '24px 16px 40px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 16 }}
            >
              <div className="flex items-center gap-2">
                <Flag
                  size={18}
                  strokeWidth={1.5}
                  style={{ color: 'var(--accent-primary)' }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    color: 'var(--text-primary)',
                  }}
                >
                  Report this meal
                </span>
              </div>
              <button onClick={handleClose} aria-label="Close">
                <X
                  size={20}
                  strokeWidth={1.5}
                  style={{ color: 'var(--text-secondary)' }}
                />
              </button>
            </div>

            {/* Reason list */}
            <div
              className="flex flex-col gap-2"
              style={{ marginBottom: 16 }}
            >
              {REPORT_REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedReason(value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    textAlign: 'left',
                    border:
                      selectedReason === value
                        ? '1.5px solid var(--accent-primary)'
                        : '1.5px solid var(--bg-elevated)',
                    backgroundColor:
                      selectedReason === value
                        ? 'rgba(232, 168, 56, 0.1)'
                        : 'var(--bg-elevated)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Detail textarea */}
            {selectedReason && (
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Additional detail (optional)"
                maxLength={500}
                rows={3}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  border: '1.5px solid var(--bg-elevated)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  resize: 'none',
                  marginBottom: 16,
                  outline: 'none',
                }}
              />
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || submitting}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 24,
                backgroundColor: selectedReason
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
                color: selectedReason ? '#121212' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                cursor: selectedReason ? 'pointer' : 'not-allowed',
                border: 'none',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>

            {/* Disclaimer */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              Reports are reviewed within 48hrs and are always anonymous.
            </p>
          </div>
        </div>
      , document.body)}
    </>
  );
}
