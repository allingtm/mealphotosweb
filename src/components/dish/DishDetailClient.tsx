'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, MapPin, Pencil, Trash2 } from 'lucide-react';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { BackButton } from '@/components/ui/BackButton';
import { ReactionButton } from '@/components/feed/ReactionButton';
import { SaveButton } from '@/components/feed/SaveButton';
import { ShareButton } from '@/components/feed/ShareButton';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { DishEditDialog } from './DishEditDialog';
import { timeAgo } from '@/lib/utils/timeAgo';
import { formatPrice } from '@/lib/utils';
import { ImageCarousel } from '@/components/feed/ImageCarousel';
import type { DishImage } from '@/types/database';

interface DishDetailClientProps {
  dish: {
    id: string;
    business_id: string;
    title: string;
    description: string | null;
    price_pence: number | null;
    photo_url: string;
    photo_blur_hash: string | null;
    image_count: number;
    reaction_count: number;
    save_count: number;
    comment_count: number;
    comments_enabled: boolean;
    created_at: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      plan: string;
    };
    business_profiles: {
      business_name: string;
      business_type: string;
      address_city: string | null;
      address_line_1: string | null;
    };
  };
  images: DishImage[];
  userHasReacted: boolean;
  userHasSaved: boolean;
  isOwner?: boolean;
}

export function DishDetailClient({ dish: initialDish, images, userHasReacted, userHasSaved, isOwner = false }: DishDetailClientProps) {
  const router = useRouter();
  const [dish, setDish] = useState(initialDish);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const bp = dish.business_profiles;
  const profile = dish.profiles;

  function handleEditSaved(updated: { title?: string; description?: string | null; price_pence?: number | null; comments_enabled?: boolean }) {
    setDish((prev) => ({ ...prev, ...updated }));
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/dishes/${dish.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/me');
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full pb-24 max-w-xl md:max-w-none">
        {/* Header bar — Back + Share + Owner controls */}
        <div className="flex items-center justify-between px-4 py-3">
          <BackButton />
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setShowEditDialog(true)}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5"
                  style={{
                    border: '1px solid var(--bg-elevated)',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-primary)',
                  }}
                  aria-label={`Edit ${dish.title}`}
                >
                  <Pencil size={14} strokeWidth={1.5} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center rounded-xl px-3 py-1.5"
                  style={{
                    border: '1px solid var(--bg-elevated)',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--status-error)',
                  }}
                  aria-label={`Delete ${dish.title}`}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </>
            )}
            <ShareButton dishId={dish.id} title={dish.title} businessName={bp.business_name} />
          </div>
        </div>

        {/* Photo */}
        <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
          {images && images.length > 1 ? (
            <ImageCarousel
              dishId={dish.id}
              dishTitle={dish.title}
              primaryImageUrl={dish.photo_url}
              imageCount={images.length}
              blurHash={dish.photo_blur_hash}
              preloadedImages={images}
              priority
            />
          ) : (
            <Image
              src={dish.photo_url}
              alt={dish.title}
              fill
              sizes="(max-width: 600px) 100vw, 600px"
              className="object-cover"
              loader={cloudflareLoader}
              priority
            />
          )}

          {/* Reaction count badge */}
          {dish.reaction_count > 0 && (
            <div
              className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 z-10"
              style={{
                backgroundColor: 'var(--status-success)',
                color: '#FFFFFF',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <UtensilsCrossed size={16} strokeWidth={2} />
              <span>{dish.reaction_count} want this</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {dish.title}
          </h1>

          {/* Price */}
          {dish.price_pence != null && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                color: 'var(--accent-primary)',
                margin: 0,
              }}
            >
              {formatPrice(dish.price_pence)}
            </p>
          )}

          {/* Business info — tappable */}
          <Link
            href={`/business/${profile.username}`}
            className="flex items-center gap-2"
            style={{ textDecoration: 'none' }}
          >
            {profile.avatar_url && (
              <Image
                src={profile.avatar_url}
                alt={bp.business_name}
                width={32}
                height={32}
                className="rounded-full"
                loader={cloudflareLoader}
              />
            )}
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
              {bp.business_name}
            </span>
            {dish.profiles?.plan === 'business' && <VerifiedBadge size={14} />}
          </Link>

          {/* Location */}
          {(bp.address_line_1 || bp.address_city) && (
            <div className="flex items-center gap-1" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              <MapPin size={12} strokeWidth={1.5} />
              <span>{bp.address_line_1 ? `${bp.address_line_1}, ${bp.address_city ?? ''}` : bp.address_city}</span>
            </div>
          )}

          {/* Timestamp */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            Posted {timeAgo(dish.created_at)}
          </p>

          {/* Description */}
          {dish.description && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {dish.description}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <ReactionButton
              dishId={dish.id}
              businessId={dish.business_id}
              hasReacted={userHasReacted}
              count={dish.reaction_count}
              distanceKm={null}
            />
            <SaveButton
              dishId={dish.id}
              businessId={dish.business_id}
              hasSaved={userHasSaved}
              title={dish.title}
            />
          </div>

          {/* Separator */}
          <div style={{ height: 1, backgroundColor: 'var(--bg-elevated)', marginTop: 8, marginBottom: 8 }} />

          {/* Comments */}
          <CommentsSection
            dishId={dish.id}
            businessId={dish.business_id}
            commentsEnabled={dish.comments_enabled}
            commentCount={dish.comment_count}
          />
        </div>
      </div>

      {/* Edit dialog */}
      {showEditDialog && (
        <DishEditDialog
          dish={dish}
          onClose={() => setShowEditDialog(false)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="w-full max-w-sm"
            style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 24, padding: '32px 24px' }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
              Delete dish?
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
              This will permanently remove &ldquo;{dish.title}&rdquo; and all its reactions, saves, and comments.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl"
                style={{
                  border: '1px solid var(--bg-elevated)', background: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl"
                style={{
                  backgroundColor: 'var(--status-error)', color: '#FFFFFF', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
                  cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
