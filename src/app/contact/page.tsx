import { getTranslations } from 'next-intl/server';
import { AppBar } from '@/components/layout/AppBar';
import { ContactForm } from '@/components/contact/ContactForm';

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
  return (
    <div
      className="md:overflow-y-auto md:flex-1 md:min-h-0"
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <AppBar title="Contact Us" />
        <div style={{ padding: '24px 16px' }}>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
