'use client';

import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import type { DishImage } from '@/types/database';

// Alias for backward compatibility within this component
type MealImage = DishImage;

interface ImageCarouselProps {
  mealId: string;
  primaryImageUrl: string;
  imageCount: number;
  blurHash?: string | null;
  blurDataURL?: string;
  priority?: boolean;
  onImageLoad?: () => void;
}

export function ImageCarousel({
  mealId,
  primaryImageUrl,
  imageCount,
  blurHash,
  blurDataURL,
  priority,
  onImageLoad,
}: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [additionalImages, setAdditionalImages] = useState<MealImage[] | null>(null);
  const [fetchedImages, setFetchedImages] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Lazy-fetch additional images on first interaction
  const fetchImages = useCallback(async () => {
    if (fetchedImages || imageCount <= 1) return;
    setFetchedImages(true);
    try {
      const res = await fetch(`/api/meals/${mealId}/images`);
      if (res.ok) {
        const data = await res.json();
        setAdditionalImages(data.images ?? []);
      }
    } catch {
      // Silently fail — user still sees primary image
    }
  }, [mealId, imageCount, fetchedImages]);

  // Pre-fetch images when carousel mounts (if multi-photo)
  useEffect(() => {
    if (imageCount > 1 && !fetchedImages) {
      fetchImages();
    }
  }, [imageCount, fetchedImages, fetchImages]);

  // Build image list: primary + additional (skipping position 1 from additional since it's the primary)
  const allImages = additionalImages
    ? additionalImages
    : [{ position: 1, photo_url: primaryImageUrl, photo_blur_hash: blurHash ?? null }];

  return (
    <div className="absolute inset-0">
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {allImages.map((img, i) => (
            <div
              key={img.position ?? i}
              className="flex-[0_0_100%] min-w-0 relative h-full"
            >
              <Image
                src={img.photo_url}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                priority={priority && i === 0}
                {...(i === 0 && blurDataURL
                  ? { placeholder: 'blur' as const, blurDataURL }
                  : {})}
                onLoad={i === 0 ? onImageLoad : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicator */}
      {imageCount > 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20"
          style={{ pointerEvents: 'none' }}
        >
          {Array.from({ length: imageCount }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 'var(--radius-full)',
                backgroundColor: i === selectedIndex
                  ? 'var(--text-emphasis)'
                  : 'rgba(255, 255, 255, 0.4)',
                transition: 'background-color 200ms',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
