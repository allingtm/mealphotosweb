export default function MapLoading() {
  return (
    <div
      className="flex items-center justify-center w-full"
      style={{
        height: 'calc(100dvh - 56px)',
        backgroundColor: 'var(--bg-primary)',
      }}
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
