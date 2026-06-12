const PRIORITY_COLORS = {
  High:   { fg: '#fecaca', bg: 'rgba(239,68,68,0.18)',  dot: '#ef4444' },
  Medium: { fg: '#fde68a', bg: 'rgba(245,158,11,0.16)', dot: '#f59e0b' },
  Low:    { fg: '#bae6fd', bg: 'rgba(56,189,248,0.14)', dot: '#38bdf8' },
};

export function PriorityPill({ priority }: { priority: string }) {
  const c = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.Medium;
  return (
    <span className="pill" style={{ background: c.bg, color: c.fg }}>
      <span className="pill-dot" style={{ background: c.dot }} />
      {priority}
    </span>
  );
}
