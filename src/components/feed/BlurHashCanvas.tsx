'use client';

import { useEffect, useRef } from 'react';
import { decode } from 'blurhash';

interface BlurHashCanvasProps {
  hash: string;
  width?: number;
  height?: number;
}

export function BlurHashCanvas({
  hash,
  width = 32,
  height = 32,
}: BlurHashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hash) return;

    try {
      const pixels = decode(hash, width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Invalid hash — show nothing
    }
  }, [hash, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full"
      style={{ objectFit: 'cover' }}
    />
  );
}
