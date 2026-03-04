'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

let addToastFn: ((toast: Omit<ToastData, 'id'>) => void) | null = null;

/** Show a toast from anywhere in the app */
export function showToast(message: string, type: ToastData['type'] = 'info') {
  addToastFn?.({ message, type });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastData & { exiting?: boolean })[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss after 3s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      // Remove after exit animation
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      style={{ bottom: 72 }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl ${
            toast.exiting ? 'animate-toast-exit' : 'animate-toast-enter'
          }`}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
          }}
          role="alert"
        >
          <span
            className="flex-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color:
                toast.type === 'error'
                  ? 'var(--status-error)'
                  : toast.type === 'success'
                    ? 'var(--status-success)'
                    : 'var(--text-primary)',
            }}
          >
            {toast.message}
          </span>
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
