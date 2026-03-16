import { Camera, MapPin, Globe, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { AppBar } from '@/components/layout/AppBar';

export async function generateMetadata() {
  const t = await getTranslations('about');
  return {
    title: `${t('title')} | meal.photos`,
    description: t('description'),
  };
}

export default function AboutPage() {
  return <AboutContent />;
}

function AboutContent() {
  const t = useTranslations('about');

  const problemItems = [
    t('problem.stalePhotos'),
    t('problem.textReviews'),
    t('problem.algorithmBuried'),
    t('problem.highCommission'),
  ];

  const features = [
    { icon: Camera, title: t('what.realPhotos.title'), description: t('what.realPhotos.description') },
    { icon: MapPin, title: t('what.searchByDish.title'), description: t('what.searchByDish.description') },
    { icon: Globe, title: t('what.exploreWorldwide.title'), description: t('what.exploreWorldwide.description') },
  ];

  const consumerProps = [
    t('consumers.liveFeed'),
    t('consumers.react'),
    t('consumers.save'),
    t('consumers.follow'),
    t('consumers.search'),
    t('consumers.requests'),
  ];

  const businessProps = [
    t('businesses.photos'),
    t('businesses.map'),
    t('businesses.requestsArea'),
    t('businesses.following'),
    t('businesses.analytics'),
    t('businesses.menu'),
  ];

  const steps = [
    { num: '1', title: t('howItWorks.step1.title'), description: t('howItWorks.step1.description') },
    { num: '2', title: t('howItWorks.step2.title'), description: t('howItWorks.step2.description') },
    { num: '3', title: t('howItWorks.step3.title'), description: t('howItWorks.step3.description') },
  ];

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

        <div style={{ padding: '0 20px 96px' }}>

          {/* ── Hero ── */}
          <section
            className="flex flex-col items-center"
            style={{ textAlign: 'center', padding: '80px 0 56px' }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                fontWeight: 400,
                color: 'var(--accent-primary)',
                margin: '0 0 16px',
                lineHeight: 1.2,
              }}
            >
              {t('hero.heading')}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 18,
                color: 'var(--text-secondary)',
                maxWidth: 520,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {t('hero.subtitle')}
            </p>
          </section>

          {/* ── The Problem ── */}
          <section
            className="flex flex-col items-center"
            style={{ textAlign: 'center', paddingBottom: 56 }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0 0 20px',
              }}
            >
              {t('problem.heading')}
            </h2>
            <div className="flex flex-col gap-2" style={{ maxWidth: 480 }}>
              {problemItems.map((item) => (
                <p
                  key={item}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {item}
                </p>
              ))}
            </div>
          </section>

          {/* ── What meal.photos Is ── */}
          <section style={{ paddingBottom: 56 }}>
            <div className="flex flex-col items-center" style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  margin: '0 0 16px',
                }}
              >
                {t('what.heading')}
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--text-secondary)',
                  maxWidth: 600,
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {t('what.body')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-3xl p-6 flex flex-col items-center"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    textAlign: 'center',
                  }}
                >
                  <f.icon
                    size={28}
                    strokeWidth={1.5}
                    style={{ color: 'var(--accent-primary)', marginBottom: 12 }}
                  />
                  <h3
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: '0 0 8px',
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── For Consumers ── */}
          <section style={{ paddingBottom: 56 }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 8px',
              }}
            >
              {t('consumers.label')}
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0 0 20px',
              }}
            >
              {t('consumers.heading')}
            </h2>
            <ul className="flex flex-col gap-3" style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
              {consumerProps.map((prop) => (
                <li key={prop} className="flex items-start gap-3">
                  <Check
                    size={16}
                    strokeWidth={2}
                    style={{ color: 'var(--status-success)', marginTop: 3, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {prop}
                  </span>
                </li>
              ))}
            </ul>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: '0 0 24px',
              }}
            >
              {t('consumers.closing')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                padding: '12px 32px',
                textDecoration: 'none',
              }}
            >
              {t('consumers.cta')}
            </Link>
          </section>

          {/* ── For Businesses ── */}
          <section
            className="rounded-3xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '32px 24px',
              marginBottom: 56,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 8px',
              }}
            >
              {t('businesses.label')}
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--accent-primary)',
                margin: '0 0 8px',
              }}
            >
              {t('businesses.heading')}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 24px',
              }}
            >
              {t('businesses.subtitle')}
            </p>
            <ul className="flex flex-col gap-3" style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
              {businessProps.map((prop) => (
                <li key={prop} className="flex items-start gap-3">
                  <Check
                    size={16}
                    strokeWidth={2}
                    style={{ color: 'var(--status-success)', marginTop: 3, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {prop}
                  </span>
                </li>
              ))}
            </ul>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                color: 'var(--accent-primary)',
                margin: '0 0 4px',
              }}
            >
              {t('businesses.pricing')}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: '0 0 24px',
              }}
            >
              {t('businesses.comparison')}
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                padding: '12px 32px',
                textDecoration: 'none',
              }}
            >
              {t('businesses.cta')}
            </Link>
          </section>

          {/* ── How It Works ── */}
          <section style={{ paddingBottom: 56 }}>
            <h2
              className="text-center"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0 0 32px',
              }}
            >
              {t('howItWorks.heading')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col items-center" style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 40,
                      color: 'var(--accent-primary)',
                      opacity: 0.4,
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {step.num}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: '0 0 6px',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Closing CTA ── */}
          <section
            className="flex flex-col items-center"
            style={{ textAlign: 'center', padding: '16px 0 0' }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0 0 24px',
              }}
            >
              {t('closing.heading')}
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '12px 32px',
                  textDecoration: 'none',
                }}
              >
                {t('closing.ctaPrimary')}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full transition-opacity hover:opacity-90"
                style={{
                  border: '2px solid var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '10px 32px',
                  textDecoration: 'none',
                }}
              >
                {t('closing.ctaSecondary')}
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
