const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  V: { bg: '#4CAF50', text: '#FFFFFF' },
  VG: { bg: '#4CAF50', text: '#FFFFFF' },
  GF: { bg: '#E8A838', text: '#121212' },
  DF: { bg: '#3B82F6', text: '#FFFFFF' },
};

export function DietaryBadge({ tag }: { tag: string }) {
  const style = TAG_STYLES[tag] ?? { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)' };
  return (
    <span
      className="rounded-full px-1.5 py-0.5"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {tag}
    </span>
  );
}
