export default function LeaderboardLoading() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
        padding: 16,
      }}
    >
      {/* Header */}
      <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 24 }} />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ width: 80, height: 32, borderRadius: 'var(--radius-full)' }} />
        ))}
      </div>

      {/* List items */}
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3"
          style={{ padding: '12px 0', borderBottom: '1px solid var(--bg-elevated)' }}
        >
          <div className="skeleton" style={{ width: 32, height: 20 }} />
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)' }} />
          <div className="flex-1 flex flex-col gap-1">
            <div className="skeleton" style={{ width: '60%', height: 16 }} />
            <div className="skeleton" style={{ width: '40%', height: 12 }} />
          </div>
          <div className="skeleton" style={{ width: 48, height: 24 }} />
        </div>
      ))}
    </div>
  );
}
