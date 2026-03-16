'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className="rounded-full bg-black/50 hover:bg-black/70"
      aria-label="Go back"
    >
      <ArrowLeft size={24} strokeWidth={1.5} className="text-(--text-primary)" />
    </Button>
  );
}
