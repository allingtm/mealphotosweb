'use client';

import Link from 'next/link';
import Image from 'next/image';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { timeAgo } from '@/lib/utils/timeAgo';
import type { InboxComment } from '@/types/database';

interface Props {
  comment: InboxComment;
}

export function InboxCommentCard({ comment }: Props) {
  return (
    <Link
      href={`/dish/${comment.dish_id}`}
      className="flex gap-3"
      style={{ textDecoration: 'none', padding: '8px 0' }}
    >
      {/* Dish thumbnail */}
      <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 48, height: 48 }}>
        <Image
          src={comment.dishes.photo_url}
          alt={comment.dishes.title}
          width={48}
          height={48}
          className="object-cover"
          loader={cloudflareLoader}
        />
      </div>

      {/* Comment content */}
      <div className="flex-1 min-w-0">
        {/* Commenter info + time */}
        <div className="flex items-center gap-1">
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {comment.profiles.display_name ?? comment.profiles.username}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
            · {timeAgo(comment.created_at)}
          </span>
        </div>

        {/* Comment text (truncated to 2 lines) */}
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'var(--text-primary)',
          margin: '2px 0',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {comment.text}
        </p>

        {/* Dish context */}
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          on {comment.dishes.title}
        </span>
      </div>
    </Link>
  );
}
