'use client';

import { useState, useCallback, useEffect } from 'react';
import { Flag, X } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';

const DISPUTE_REASONS = [
  { value: 'not_served_here', label: 'Not served here' },
  { value: 'wrong_location', label: 'Wrong location / branch' },
  { value: 'fake_photo', label: 'Fake / stock photo' },
  { value: 'other', label: 'Other' },
] as const;

interface DisputeButtonProps {
  mealId: string;
}

export function DisputeButton({ mealId }: DisputeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSelectedReason(null);
    setDetail('');
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/restaurants/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_id: mealId,
          reason: selectedReason,
          detail: detail.trim() || undefined,
        }),
      });
      if (res.ok) {
        showToast('Dispute submitted. We\'ll review this within 48 hours.', 'success');
        setIsOpen(false);
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Failed to submit dispute', 'error');
      }
    } catch {
      showToast('Failed to submit dispute', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [mealId, selectedReason, detail, submitting]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1"
        style={{
          padding: '4px 8px',
          borderRadius: 8,
          backgroundColor: 'rgba(212, 85, 58, 0.1)',
          border: '1px solid rgba(212, 85, 58, 0.3)',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--status-error)',
        }}
      >
        <Flag size={12} strokeWidth={1.5} />
        Dispute
      </button>

      {isOpen && (
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
                  Dispute venue tag
                </span>
              </div>
              <button type="button" onClick={handleClose} aria-label="Close">
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
              {DISPUTE_REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
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
                placeholder="Additional detail (optional, max 280 chars)"
                maxLength={280}
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
              type="button"
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
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
