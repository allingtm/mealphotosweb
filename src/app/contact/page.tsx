import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { AppBar } from '@/components/layout/AppBar';

export async function generateMetadata() {
  const t = await getTranslations('contact');
  return {
    title: `${t('title')} | meal.photos`,
    description: t('description'),
  };
}

export default function ContactPage() {
  return <ContactContent />;
}

function ContactContent() {
  const t = useTranslations('contact');

  return (
    <div
      className="md:overflow-y-auto md:flex-1 md:min-h-0"
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <AppBar title={t('title')} />
      <div
        className="flex flex-col items-center justify-center"
        style={{
          minHeight: '60vh',
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <Mail
          size={48}
          strokeWidth={1}
          color="var(--text-secondary)"
        />
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '16px 0 8px',
          }}
        >
          {t('title')}
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: 'var(--text-secondary)',
            maxWidth: 360,
          }}
        >
          {t('comingSoon')} — {t('description')}
        </p>
      </div>
      </div>
    </div>
  );
}
