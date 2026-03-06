'use client';

import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';

interface CarouselImage {
  position: number;
  photo_url: string;
  photo_blur_hash: string | null;
}

interface MealDetailCarouselProps {
  images: CarouselImage[];
  alt: string;
}

export function MealDetailCarousel({ images, alt }: MealDetailCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  return (
    <div className="absolute inset-0">
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {images.map((img, i) => (
            <div
              key={img.position}
              className="flex-[0_0_100%] min-w-0 relative h-full"
            >
              <Image
                src={img.photo_url}
                alt={i === 0 ? alt : ''}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 640px"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicator */}
      {images.length > 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20"
          style={{ pointerEvents: 'none' }}
        >
          {images.map((_, i) => (
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
