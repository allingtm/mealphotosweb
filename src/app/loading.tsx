export default function FeedLoading() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header skeleton */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '8px 16px',
          height: 48,
          borderBottom: '1px solid var(--bg-elevated)',
        }}
      >
        <div className="skeleton" style={{ width: 120, height: 24 }} />
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)' }} />
      </div>

      {/* Card skeleton */}
      <div style={{ height: 'calc(100dvh - 56px - 48px)' }}>
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
      </div>
    </div>
  );
}
