'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MenuDrawer } from './MenuDrawer';

export function MenuButton() {
  const t = useTranslations('nav');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-full)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-label={t('menu')}
      >
        <Menu size={24} strokeWidth={1.5} color="var(--text-primary)" />
      </button>

      <MenuDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
