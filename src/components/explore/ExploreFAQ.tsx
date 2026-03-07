import { ChevronDown } from 'lucide-react';

interface ExploreFAQProps {
  pageTitle: string;
  totalMeals: number;
  avgScore: number;
  topMeal: {
    title: string;
    avg_rating: number;
    username: string;
    rating_count: number;
  } | null;
  pageType: 'city' | 'country' | 'cuisine' | 'city_cuisine';
}

function generateFAQs(props: ExploreFAQProps) {
  const { pageTitle, totalMeals, avgScore, topMeal, pageType } = props;
  const faqs: { question: string; answer: string }[] = [];

  // Q1: Highest rated meal
  if (topMeal) {
    faqs.push({
      question: `What's the highest rated meal in ${pageTitle}?`,
      answer:
        `The highest rated meal is "${topMeal.title}" by @${topMeal.username}, ` +
        `with an average score of ${topMeal.avg_rating.toFixed(1)}/10 ` +
        `based on ${topMeal.rating_count} rating${topMeal.rating_count !== 1 ? 's' : ''}.`,
    });
  }

  // Q2: How many meals
  faqs.push({
    question: `How many meals are rated in ${pageTitle}?`,
    answer:
      totalMeals > 0
        ? `There ${totalMeals === 1 ? 'is' : 'are'} ${totalMeals.toLocaleString()} ` +
          `meal${totalMeals !== 1 ? 's' : ''} rated in ${pageTitle}` +
          (avgScore > 0
            ? `, with an average community score of ${avgScore.toFixed(1)}/10.`
            : '.')
        : `There are no meals rated in ${pageTitle} yet. Be the first to upload one!`,
  });

  // Q3: Popular food types (city and country pages only)
  if (pageType === 'city' || pageType === 'country') {
    faqs.push({
      question: `What types of food are popular in ${pageTitle}?`,
      answer:
        `Browse the meal.photos community uploads for ${pageTitle} to discover ` +
        `the most popular dishes and cuisines. Upload your own meals to help build ` +
        `a picture of ${pageTitle}'s food culture!`,
    });
  }

  return faqs;
}

export function ExploreFAQ(props: ExploreFAQProps) {
  const faqs = generateFAQs(props);

  if (faqs.length === 0) return null;

  return (
    <section aria-label="Frequently asked questions">
      <h2
        className="text-xl mb-[16px]"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
        }}
      >
        Frequently Asked Questions
      </h2>

      {/* Schema.org FAQPage structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      <div className="flex flex-col gap-[8px]">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group rounded-[16px] overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <summary
              className="flex items-center justify-between cursor-pointer list-none p-[16px] hover:opacity-80 transition-opacity"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="text-sm font-medium pr-[8px]">
                {faq.question}
              </span>
              <ChevronDown
                size={24}
                strokeWidth={1.5}
                className="shrink-0 transition-transform group-open:rotate-180"
                style={{ color: 'var(--text-secondary)' }}
                aria-hidden="true"
              />
            </summary>
            <div
              className="px-[16px] pb-[16px] text-sm leading-relaxed"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
              }}
            >
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
