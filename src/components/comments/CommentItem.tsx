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
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: string, detail?: string) => void;
}

export function CommentItem({
  comment,
  isOwnComment,
  isAdmin,
  onDelete,
  onReport,
}: CommentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = comment.profiles;
  const isOptimistic = comment.is_optimistic;

  return (
    <div
      className="flex gap-3"
      style={{
        padding: '8px 0',
        opacity: isOptimistic ? 0.7 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Avatar */}
      <Link
        href={`/profile/${profile.username}`}
        className="flex-shrink-0"
      >
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
            href={`/profile/${profile.username}`}
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

          {comment.is_author && (
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
              Author
            </span>
          )}

          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
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
      {!isOptimistic && (
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex-shrink-0 self-start"
          style={{
            padding: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Comment options"
        >
          <MoreVertical
            size={16}
            strokeWidth={1.5}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>
      )}

      {menuOpen && (
        <CommentMoreMenu
          commentId={comment.id}
          isOwnComment={isOwnComment}
          isAdmin={isAdmin}
          onClose={() => setMenuOpen(false)}
          onDelete={onDelete}
          onReport={onReport}
        />
      )}
    </div>
  );
}
