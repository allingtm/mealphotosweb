export default function ProfileLoading() {
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
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 'var(--radius-full)' }} />
        <div className="skeleton" style={{ width: 140, height: 20 }} />
        <div className="skeleton" style={{ width: 100, height: 14 }} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4" style={{ padding: '16px 0' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="skeleton" style={{ width: 48, height: 28 }} />
            <div className="skeleton" style={{ width: 60, height: 14 }} />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-3 gap-1" style={{ marginTop: 16 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: '1', width: '100%' }} />
        ))}
      </div>
    </div>
  );
}
