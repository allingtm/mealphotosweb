'use client';

import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import cloudflareLoader from '@/lib/cloudflare-loader';
import type { DishImage } from '@/types/database';

interface ImageCarouselProps {
  dishId: string;
  dishTitle: string;
  primaryImageUrl: string;
  imageCount: number;
  blurHash?: string | null;
  blurDataURL?: string;
  priority?: boolean;
  preloadedImages?: DishImage[];
  onImageLoad?: () => void;
}

export function ImageCarousel({
  dishId,
  dishTitle,
  primaryImageUrl,
  imageCount,
  blurHash,
  blurDataURL,
  priority,
  preloadedImages,
  onImageLoad,
}: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [additionalImages, setAdditionalImages] = useState<DishImage[] | null>(
    preloadedImages ?? null
  );
  const [fetchedImages, setFetchedImages] = useState(!!preloadedImages);
  const [effectiveImageCount, setEffectiveImageCount] = useState(imageCount);

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

  // Lazy-fetch additional images on mount (if multi-photo and not preloaded)
  const fetchImages = useCallback(async () => {
    if (fetchedImages || imageCount <= 1) return;
    setFetchedImages(true);
    try {
      const res = await fetch(`/api/dishes/${dishId}/images`);
      if (res.ok) {
        const data = await res.json();
        setAdditionalImages(data.images ?? []);
      } else {
        setEffectiveImageCount(1);
      }
    } catch {
      setEffectiveImageCount(1);
    }
  }, [dishId, imageCount, fetchedImages]);

  useEffect(() => {
    if (imageCount > 1 && !fetchedImages) {
      fetchImages();
    }
  }, [imageCount, fetchedImages, fetchImages]);

  // Build image list: use fetched images or fall back to primary
  const allImages = additionalImages
    ? additionalImages
    : [{ position: 1, photo_url: primaryImageUrl, photo_blur_hash: blurHash ?? null }];

  return (
    <div className="absolute inset-0">
      <div
        ref={emblaRef}
        className="overflow-hidden h-full"
        role="region"
        aria-label={`${dishTitle} photos, ${effectiveImageCount} images`}
        aria-roledescription="carousel"
      >
        <div className="flex h-full">
          {allImages.map((img, i) => (
            <div
              key={img.position ?? i}
              className="flex-[0_0_100%] min-w-0 relative h-full"
            >
              <Image
                src={img.photo_url}
                alt={`${dishTitle} — photo ${i + 1} of ${effectiveImageCount}`}
                fill
                className="object-cover rounded-2xl"
                sizes="(max-width: 480px) 100vw, 480px"
                loader={cloudflareLoader}
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

      {/* Dot indicators */}
      {effectiveImageCount > 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20"
          role="tablist"
          aria-label="Image navigation"
          style={{
            pointerEvents: 'none',
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
          }}
        >
          {Array.from({ length: effectiveImageCount }).map((_, i) => (
            <div
              key={i}
              role="tab"
              aria-selected={i === selectedIndex ? true : false}
              aria-label={`Photo ${i + 1} of ${effectiveImageCount}`}
              className="rounded-full transition-colors duration-200"
              style={{
                width: 8,
                height: 8,
                backgroundColor: i === selectedIndex
                  ? '#FFFFFF'
                  : 'rgba(255, 255, 255, 0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
