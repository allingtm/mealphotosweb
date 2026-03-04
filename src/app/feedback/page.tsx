import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('feedback');
  return {
    title: `${t('title')} | meal.photos`,
    description: t('description'),
  };
}

export default function FeedbackPage() {
  return <FeedbackContent />;
}

function FeedbackContent() {
  const t = useTranslations('feedback');

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minHeight: '60vh',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <MessageSquare
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
  );
}
