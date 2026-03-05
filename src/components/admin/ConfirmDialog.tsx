'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  variant,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmColors = variant === 'danger'
    ? { bg: 'var(--status-error)', text: '#FFFFFF' }
    : { bg: 'var(--accent-primary)', text: '#121212' };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 24,
          padding: 24,
          maxWidth: 400,
          width: '90%',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: confirmColors.bg,
              color: confirmColors.text,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
