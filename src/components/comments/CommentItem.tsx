'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { timeAgo } from '@/lib/utils/time';
import { CommentMoreMenu } from './CommentMoreMenu';
import type { CommentWithProfile } from '@/types/database';

interface CommentItemProps {
  comment: CommentWithProfile;
  isOwnComment: boolean;
  isBusinessOwner: boolean;
  canDelete: boolean;
  onDelete: () => void;
}

export function CommentItem({
  comment,
  isOwnComment,
  isBusinessOwner,
  canDelete,
  onDelete,
}: CommentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = comment.profiles;
  const isOptimistic = comment.is_optimistic;

  return (
    <div
      className="flex gap-3 rounded-xl"
      style={{
        padding: '10px 12px',
        opacity: isOptimistic ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
        // Business reply: amber left border + subtle bg
        borderLeft: isBusinessOwner ? '3px solid var(--accent-primary)' : '3px solid transparent',
        backgroundColor: isBusinessOwner ? 'var(--bg-elevated)' : 'transparent',
      }}
      aria-label={isBusinessOwner ? `Reply from ${profile.display_name ?? profile.username}` : undefined}
    >
      {/* Avatar */}
      <Link href={`/business/${profile.username}`} className="shrink-0">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.username}
            width={32}
            height={32}
            className="rounded-full object-cover"
            style={{ width: 32, height: 32 }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              backgroundColor: 'var(--bg-elevated)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {profile.username[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={`/business/${profile.username}`}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              textDecoration: 'none',
            }}
          >
            @{profile.username}
          </Link>

          {isBusinessOwner && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 999,
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent-primary)',
                backgroundColor: 'rgba(232, 168, 56, 0.15)',
              }}
            >
              Business
            </span>
          )}

          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
            &middot; {timeAgo(comment.created_at)}
          </span>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            marginTop: 2,
            wordBreak: 'break-word',
          }}
        >
          {comment.text}
        </p>
      </div>

      {/* More menu trigger */}
      {!isOptimistic && (isOwnComment || canDelete) && (
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="shrink-0 self-start"
          style={{ padding: 4 }}
          aria-label="Comment options"
        >
          <MoreVertical size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}

      {menuOpen && (
        <CommentMoreMenu
          commentId={comment.id}
          isOwnComment={isOwnComment}
          isAdmin={canDelete && !isOwnComment}
          onClose={() => setMenuOpen(false)}
          onDelete={(id) => { onDelete(); setMenuOpen(false); }}
          onReport={(id, reason) => {
            fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reported_comment_id: id, reason }),
            }).catch(() => {});
            setMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}
