'use client';

import { useState, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { showToast } from '@/components/ui/Toast';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  file: File | null;
}

/** Crop and compress avatar to 1:1 square, max 400px, 85% JPEG quality */
async function cropAndCompressAvatar(file: File, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const OUTPUT_MAX = 400;
      const { x, y, width, height } = pixelCrop;

      const outSize = Math.min(OUTPUT_MAX, width);
      const canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, width, height, 0, 0, outSize, outSize);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function AvatarCropModal({ isOpen, onClose, onSaved, file }: AvatarCropModalProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !croppedArea) return;

    setUploading(true);
    try {
      const blob = await cropAndCompressAvatar(file, croppedArea);
      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');

      const uploadRes = await fetch('/api/uploads/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => null);
        showToast(data?.error ?? t('profileUpdateFailed'), 'error');
        return;
      }

      const { avatar_url } = await uploadRes.json();

      // Update profile with new avatar URL
      const profileRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url }),
      });

      if (!profileRes.ok) {
        showToast(t('profileUpdateFailed'), 'error');
        return;
      }

      showToast(t('avatarUpdated'), 'success');
      onSaved();
      onClose();
    } catch {
      showToast(t('profileUpdateFailed'), 'error');
    } finally {
      setUploading(false);
    }
  }, [file, croppedArea, onClose, onSaved, t]);

  if (!isOpen || !file) return null;

  const previewUrl = URL.createObjectURL(file);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="relative w-full max-w-lg animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-modal)',
          borderTopRightRadius: 'var(--radius-modal)',
          padding: '32px 24px 40px',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
          }}
          aria-label={tCommon('close')}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {/* Heading */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--accent-primary)',
            marginBottom: 16,
          }}
        >
          {t('changeAvatar')}
        </h2>

        {/* Cropper */}
        <div
          className="relative"
          style={{
            width: '100%',
            height: 300,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <Cropper
            image={previewUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3" style={{ marginTop: 16 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: 'var(--accent-primary)' }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3" style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex flex-1 items-center justify-center rounded-xl"
            style={{
              height: 48,
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="flex flex-1 items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
            style={{
              height: 48,
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {uploading ? (
              <Loader2 size={20} strokeWidth={1.5} className="animate-spin" />
            ) : (
              tCommon('confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
