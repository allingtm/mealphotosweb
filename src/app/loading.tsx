export default function GlobalLoading() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height: '100dvh', backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="animate-spin rounded-full"
        style={{
          width: 32,
          height: 32,
          border: '2px solid var(--text-secondary)',
          borderTopColor: 'var(--accent-primary)',
        }}
      />
    </div>
  );
}
