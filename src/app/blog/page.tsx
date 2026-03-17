import { BookOpen } from 'lucide-react';

export default function BlogPage() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 text-center px-8"
      style={{ minHeight: 'calc(100dvh - 8rem)' }}
    >
      <BookOpen
        size={64}
        strokeWidth={1}
        color="var(--accent-primary)"
      />
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        Blog
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
          maxWidth: 320,
          margin: 0,
        }}
      >
        Coming soon — stay tuned for stories, tips, and updates from the meal.photos community.
      </p>
    </div>
  );
}
