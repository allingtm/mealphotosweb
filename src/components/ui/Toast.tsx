'use client';

import { toast, Toaster } from 'sonner';

/** Show a toast from anywhere in the app */
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (type === 'success') toast.success(message);
  else if (type === 'error') toast.error(message);
  else toast(message);
}

export function ToastContainer() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 500,
          borderRadius: 16,
        },
      }}
    />
  );
}
