'use client';

import { useState } from 'react';
import { MoreVertical, Flag, Ban } from 'lucide-react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toast';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

interface ProfileMoreMenuProps {
  userId: string;
  username: string;
}

export function ProfileMoreMenu({ userId, username }: ProfileMoreMenuProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tReport = useTranslations('report');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [isOpen, setIsOpen] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetail, setReportDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const REPORT_REASONS = [
    'inappropriate', 'spam', 'harassment', 'privacy', 'other',
  ] as const;

  const handleBlock = async () => {
    setShowBlockConfirm(false);
    setIsOpen(false);
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: userId }),
      });
      if (res.ok) {
        showToast(t('userBlocked'), 'success');
        posthog.capture(ANALYTICS_EVENTS.PROFILE_USER_BLOCKED, { blocked_user_id: userId });
        // Refresh to reflect blocked state
        window.location.reload();
      } else {
        showToast(t('blockFailed'), 'error');
      }
    } catch {
      showToast(t('blockFailed'), 'error');
    }
  };

  const handleReport = async () => {
    if (!reportReason) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_user_id: userId,
          reason: reportReason,
          detail: reportDetail || undefined,
        }),
      });
      if (res.ok) {
        showToast(t('userReported'), 'success');
        posthog.capture(ANALYTICS_EVENTS.PROFILE_USER_REPORTED, {
          reported_user_id: userId,
          reason: reportReason,
        });
        setShowReportModal(false);
        setIsOpen(false);
        setReportReason('');
        setReportDetail('');
      } else {
        showToast(tReport('submitButton'), 'error');
      }
    } catch {
      showToast(tReport('submitButton'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const requireAuth = () => {
    if (!user) {
      openAuthModal();
      return false;
    }
    return true;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 40,
          height: 40,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="More options"
      >
        <MoreVertical size={24} strokeWidth={1.5} color="var(--text-primary)" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 z-[91]"
            style={{
              top: 44,
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-card)',
              padding: 8,
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                setShowReportModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-primary)',
                textAlign: 'left',
              }}
            >
              <Flag size={18} strokeWidth={1.5} />
              {t('reportUser', { username })}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                setShowBlockConfirm(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full"
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--status-error)',
                textAlign: 'left',
              }}
            >
              <Ban size={18} strokeWidth={1.5} />
              {t('blockUser', { username })}
            </button>
          </div>
        </>
      )}

      {/* Block confirmation */}
      {showBlockConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setShowBlockConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-card)',
              padding: 24,
              width: 300,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: 'var(--text-primary)',
                marginBottom: 20,
              }}
            >
              {t('blockConfirm', { username })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '10px 0',
                  cursor: 'pointer',
                }}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleBlock}
                className="flex-1"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-emphasis)',
                  backgroundColor: 'var(--status-error)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '10px 0',
                  cursor: 'pointer',
                }}
              >
                {t('block')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="w-full max-w-lg animate-slide-up"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderTopLeftRadius: 'var(--radius-modal)',
              borderTopRightRadius: 'var(--radius-modal)',
              padding: '32px 24px 40px',
              maxHeight: '80dvh',
              overflowY: 'auto',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--accent-primary)',
                marginBottom: 20,
              }}
            >
              {t('reportUser', { username })}
            </h3>

            <div className="flex flex-col gap-3" style={{ marginBottom: 16 }}>
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReportReason(reason)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: reportReason === reason ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: reportReason === reason ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 12,
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {tReport(`reasons.${reason}`)}
                </button>
              ))}
            </div>

            <textarea
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={tReport('detailPlaceholder')}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--bg-elevated)',
                borderRadius: 12,
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                resize: 'none',
                marginBottom: 16,
              }}
            />

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 16,
              }}
            >
              {tReport('disclaimer')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportDetail('');
                }}
                className="flex-1"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '12px 0',
                  cursor: 'pointer',
                }}
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={!reportReason || submitting}
                className="flex-1 disabled:opacity-50"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--bg-primary)',
                  backgroundColor: 'var(--accent-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '12px 0',
                  cursor: 'pointer',
                }}
              >
                {submitting ? tReport('submitting') : tReport('submitButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
