import type { ReactElement } from 'react';

export const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

export const PRIORITY_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  High: { fg: '#fecaca', bg: 'rgba(239,68,68,0.18)', dot: '#ef4444' },
  Medium: { fg: '#fde68a', bg: 'rgba(245,158,11,0.16)', dot: '#f59e0b' },
  Low: { fg: '#bae6fd', bg: 'rgba(56,189,248,0.14)', dot: '#38bdf8' },
};

export const STATUS_COLORS: Record<string, { fg: string; bg: string; dot: string }> = {
  Pending: { fg: '#d8d6e6', bg: 'rgba(255,255,255,0.08)', dot: '#9a98b3' },
  'In Progress': { fg: '#c4b5fd', bg: 'rgba(139,92,246,0.18)', dot: '#a78bfa' },
  Done: { fg: '#bbf7d0', bg: 'rgba(52,211,153,0.16)', dot: '#34d399' },
};

export function iso(d: Date): string { return d.toISOString().slice(0, 10); }
export function dateAdd(d: Date, days: number): Date { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
export function parseDate(s: string): Date { return new Date(s + 'T12:00:00'); }
export function fmtDay(d: Date): string { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
export function fmtFull(d: Date): string { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }); }
export function fmtMd(d: Date): string { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

export function today(): Date { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }
export function todayStr(): string { return iso(today()); }

export function daysFromToday(dateStr: string): number {
  const a = new Date(parseDate(dateStr).toDateString());
  const b = new Date(today().toDateString());
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function effectiveDate(t: { scheduled: string | null; completedAt: string | null; deadline: string }): string {
  return t.scheduled || t.completedAt || t.deadline;
}

export function catIcon(categories: { name: string; icon: string }[], name: string): string {
  const c = categories.find(c => c.name === name);
  return c ? c.icon : '🏷️';
}

export function deadlineLabel(d: string, done = false): ReactElement {
  if (done) return <span className="text-white/45">{fmtMd(parseDate(d))}</span>;
  const diff = daysFromToday(d);
  if (diff < 0) return <span className="text-red-300">Overdue · {Math.abs(diff)}d</span>;
  if (diff === 0) return <span className="text-amber-300">Due today</span>;
  if (diff === 1) return <span className="text-amber-200">Tomorrow</span>;
  return <span className="text-white/70">{fmtMd(parseDate(d))}</span>;
}
