import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('legal');

  return (
    <div
      className="mx-auto px-4 pb-24 pt-8 md:pt-12"
      style={{ maxWidth: 720 }}
    >
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 mb-8"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }}
      >
        <ArrowLeft size={18} strokeWidth={1.5} />
        {t('backToHome')}
      </Link>

      <article
        className="prose-legal"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--text-primary)',
          lineHeight: 1.7,
        }}
      >
        {children}
      </article>
    </div>
  );
}
