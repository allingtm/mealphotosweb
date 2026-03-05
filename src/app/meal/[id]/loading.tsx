export default function MealDetailLoading() {
  return (
    <div
      className="w-full flex-1 min-h-0 overflow-y-auto"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px 16px' }}
      >
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)' }} />
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)' }} />
      </div>

      {/* Photo skeleton */}
      <div className="skeleton" style={{ width: '100%', aspectRatio: '4 / 5', borderRadius: 0 }} />

      {/* Content */}
      <div style={{ padding: '16px 16px 32px' }}>
        <div className="skeleton" style={{ width: '70%', height: 28, marginBottom: 12 }} />
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 'var(--radius-full)' }} />
          <div className="skeleton" style={{ width: 100, height: 14 }} />
        </div>
        <div className="skeleton" style={{ width: '50%', height: 12, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 48, marginBottom: 16 }} />
      </div>
    </div>
  );
}
