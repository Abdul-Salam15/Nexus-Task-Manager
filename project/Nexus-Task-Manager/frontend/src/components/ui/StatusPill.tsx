const STATUS_COLORS = {
  'Pending':     { fg: '#d8d6e6', bg: 'rgba(255,255,255,0.08)', dot: '#9a98b3' },
  'In Progress': { fg: '#c4b5fd', bg: 'rgba(139,92,246,0.18)',  dot: '#a78bfa' },
  'Done':        { fg: '#bbf7d0', bg: 'rgba(52,211,153,0.16)',  dot: '#34d399' },
};

export function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS['Pending'];
  return (
    <span className="pill" style={{ background: c.bg, color: c.fg }}>
      <span className="pill-dot" style={{ background: c.dot }} />
      {status}
    </span>
  );
}
