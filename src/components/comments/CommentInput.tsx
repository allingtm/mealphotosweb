'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { SendHorizontal } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAppStore } from '@/lib/store';
import { commentSchema } from '@/lib/validations/profile';
import { showToast } from '@/components/ui/Toast';
import type { CommentWithProfile } from '@/types/database';

interface CommentInputProps {
  mealId: string;
  commentsEnabled: boolean;
  onCommentPosted: (comment: CommentWithProfile) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function CommentInput({
  mealId,
  commentsEnabled,
  onCommentPosted,
  inputRef: externalRef,
}: CommentInputProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const requireAuth = useRequireAuth();
  const user = useAppStore((s) => s.user);

  // Auto-grow textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 4 * 24; // 4 lines * ~24px line height
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [textareaRef]);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  if (!commentsEnabled) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          padding: '12px 16px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
        }}
      >
        Comments are turned off
      </div>
    );
  }

  const handleFocus = async () => {
    if (!user) {
      try {
        await requireAuth();
      } catch {
        return;
      }
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    if (!user) {
      try {
        await requireAuth();
      } catch {
        return;
      }
    }

    // Client-side validation
    const parsed = commentSchema.safeParse({ meal_id: mealId, text: trimmed });
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? 'Invalid comment', 'error');
      return;
    }

    setSubmitting(true);

    // Get user profile for optimistic comment
    const { user: currentUser } = useAppStore.getState();
    const optimisticComment: CommentWithProfile = {
      id: `optimistic-${Date.now()}`,
      meal_id: mealId,
      user_id: currentUser?.id ?? '',
      text: trimmed,
      visible: true,
      created_at: new Date().toISOString(),
      is_author: false,
      is_optimistic: true,
      profiles: {
        username: currentUser?.user_metadata?.username ?? 'you',
        display_name: currentUser?.user_metadata?.display_name ?? null,
        avatar_url: currentUser?.user_metadata?.avatar_url ?? null,
      },
    };

    // Optimistic insert
    onCommentPosted(optimisticComment);
    setText('');

    try {
      const res = await fetch(`/api/meals/${mealId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      const serverComment = await res.json();
      // Replace optimistic with server data
      onCommentPosted({ ...serverComment, _replaces: optimisticComment.id } as CommentWithProfile & { _replaces: string });
    } catch (err) {
      // Revert: signal removal of optimistic comment
      onCommentPosted({ ...optimisticComment, _remove: true } as CommentWithProfile & { _remove: boolean });
      setText(trimmed); // Preserve text
      showToast(
        err instanceof Error ? err.message : "Couldn't post comment. Try again.",
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = 280 - text.length;
  const showCounter = text.length > 250;
  const isEmpty = text.trim().length === 0;

  // Get avatar from store metadata
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div
      className="flex items-end gap-2"
      style={{ padding: '8px 16px' }}
    >
      {/* User avatar */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="You"
          width={28}
          height={28}
          className="rounded-full object-cover flex-shrink-0"
          style={{ width: 28, height: 28 }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            backgroundColor: 'var(--bg-elevated)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {user?.user_metadata?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      {/* Input area */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={handleFocus}
          placeholder="Add a comment..."
          maxLength={280}
          rows={1}
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
            {remaining} remaining
          </span>
        )}
      </div>

      {/* Post button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isEmpty || submitting}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: isEmpty || submitting ? 'default' : 'pointer',
        }}
        aria-label="Post comment"
      >
        <SendHorizontal
          size={24}
          strokeWidth={1.5}
          style={{
            color: isEmpty || submitting
              ? 'var(--text-secondary)'
              : 'var(--accent-primary)',
          }}
        />
      </button>
    </div>
  );
}
