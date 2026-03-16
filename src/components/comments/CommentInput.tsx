'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { SendHorizontal } from 'lucide-react';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';
import { createCommentSchema } from '@/lib/validations';
import { showToast } from '@/components/ui/Toast';
import type { CommentWithProfile } from '@/types/database';

interface CommentInputProps {
  dishId: string;
  businessId: string;
  onCommentPosted: (comment: CommentWithProfile) => void;
}

export function CommentInput({ dishId, businessId, onCommentPosted }: CommentInputProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  // Auto-grow textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 96;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  useEffect(() => { adjustHeight(); }, [text, adjustHeight]);

  const handleFocus = () => {
    if (!user) openAuthModal();
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    if (!user) { openAuthModal(); return; }

    const parsed = createCommentSchema.safeParse({ dish_id: dishId, text: trimmed });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? 'Invalid comment', 'error');
      return;
    }

    setSubmitting(true);

    // Optimistic comment
    const isBusinessReply = user.id === businessId;
    const optimistic: CommentWithProfile = {
      id: `optimistic-${Date.now()}`,
      dish_id: dishId,
      user_id: user.id,
      text: trimmed,
      visible: true,
      created_at: new Date().toISOString(),
      is_author: false,
      is_business_owner: isBusinessReply,
      is_optimistic: true,
      profiles: {
        username: user.user_metadata?.username ?? 'you',
        display_name: user.user_metadata?.display_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        is_business: isBusinessReply,
      },
    };

    onCommentPosted(optimistic);
    setText('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId, text: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      posthog.capture('comment_posted', { dish_id: dishId, is_business_reply: isBusinessReply });
    } catch (err) {
      setText(trimmed);
      showToast(err instanceof Error ? err.message : "Couldn't post comment", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = 280 - text.length;
  const showCounter = text.length > 250;
  const isEmpty = text.trim().length === 0;
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex items-end gap-2" style={{ padding: '8px 0' }}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt="You" width={28} height={28} className="rounded-full object-cover flex-shrink-0" style={{ width: 28, height: 28 }} />
      ) : (
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 28, height: 28, backgroundColor: 'var(--bg-elevated)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {user?.user_metadata?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={handleFocus}
          placeholder="Ask a question..."
          maxLength={280}
          rows={1}
          aria-label="Write a comment"
          className="w-full outline-none resize-none"
          style={{
            padding: '8px 12px',
            borderRadius: 16,
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: '24px',
            border: '1px solid transparent',
            overflowY: 'hidden',
          }}
        />
        {showCounter && (
          <span
            style={{
              position: 'absolute',
              bottom: -16,
              right: 4,
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: remaining < 0 ? 'var(--status-error)' : 'var(--text-secondary)',
            }}
          >
            {remaining}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isEmpty || submitting}
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)' }}
        aria-label="Post comment"
      >
        <SendHorizontal
          size={24}
          strokeWidth={1.5}
          style={{ color: isEmpty || submitting ? 'var(--text-secondary)' : 'var(--accent-primary)' }}
        />
      </button>
    </div>
  );
}
