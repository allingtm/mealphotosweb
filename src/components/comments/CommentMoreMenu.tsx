'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
const COMMENT_REPORT_REASONS = ['inappropriate', 'spam', 'harassment', 'other'] as const;

interface CommentMoreMenuProps {
  commentId: string;
  isOwnComment: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: string, detail?: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inappropriate content',
  spam: 'Spam',
  harassment: 'Harassment',
  other: 'Other',
};

export function CommentMoreMenu({
  commentId,
  isOwnComment,
  isAdmin,
  onClose,
  onDelete,
  onReport,
}: CommentMoreMenuProps) {
  const [view, setView] = useState<'actions' | 'confirm_delete' | 'report'>('actions');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [handleEscape]);

  const handleDelete = () => {
    onDelete(commentId);
    onClose();
  };

  const handleReport = () => {
    if (selectedReason) {
      onReport(commentId, selectedReason);
      onClose();
    }
  };

  const canDelete = isOwnComment || isAdmin;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 80 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '16px 16px 32px',
          maxHeight: '60vh',
          overflowY: 'auto',
          animation: 'slide-up 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'actions' && (
          <div className="flex flex-col gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => setView('confirm_delete')}
                className="w-full text-left px-4 py-3 rounded-xl"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--status-error)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Delete comment
              </button>
            )}

            {!isOwnComment && (
              <button
                type="button"
                onClick={() => setView('report')}
                className="w-full text-left px-4 py-3 rounded-xl"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Report comment
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full text-center px-4 py-3 rounded-xl"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {view === 'confirm_delete' && (
          <div className="flex flex-col gap-3">
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--text-primary)',
                textAlign: 'center',
              }}
            >
              Delete this comment?
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  backgroundColor: 'var(--status-error)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {view === 'report' && (
          <div className="flex flex-col gap-3">
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--text-primary)',
                textAlign: 'center',
              }}
            >
              Report comment
            </p>
            <div className="flex flex-col gap-2">
              {COMMENT_REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className="w-full text-left px-4 py-3 rounded-xl"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    backgroundColor:
                      selectedReason === reason
                        ? 'var(--accent-primary)'
                        : 'var(--bg-elevated)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      color:
                        selectedReason === reason
                          ? '#121212'
                          : 'var(--text-primary)',
                    }}
                  >
                    {REASON_LABELS[reason] ?? reason}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleReport}
              disabled={!selectedReason}
              className="w-full py-3 rounded-xl"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                color: selectedReason ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                backgroundColor: selectedReason
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
                border: 'none',
                cursor: selectedReason ? 'pointer' : 'default',
                marginTop: 4,
              }}
            >
              Submit report
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
