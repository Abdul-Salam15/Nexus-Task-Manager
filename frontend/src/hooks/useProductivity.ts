import type { Task } from '../store/taskStore';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateAdd(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function computeStreak(tasks: Task[]): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = iso(dateAdd(today, -i));
    const done = tasks.some(t => t.status === 'Done' && t.completedAt === d);
    if (done) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function computeProductivityScore(tasks: Task[]): number {
  const total = tasks.filter(t => t.status !== 'Pending' || t.deadline <= iso(new Date())).length;
  if (!total) return 0;
  const onTime = tasks.filter(t => t.status === 'Done' && t.completedAt && t.completedAt <= t.deadline).length;
  return Math.round((onTime / total) * 100);
}

export function computeBarChartData(tasks: Task[]): { date: Date; count: number; isToday: boolean }[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = dateAdd(today, -(6 - i));
    const ds = iso(d);
    const count = tasks.filter(t => t.status === 'Done' && t.completedAt === ds).length;
    return { date: d, count, isToday: i === 6 };
  });
}

export function computeWorkload(tasks: Task[]): Record<string, number> {
  const wl: Record<string, number> = {};
  for (const t of tasks) {
    if (t.scheduled && t.status !== 'Done') {
      wl[t.scheduled] = (wl[t.scheduled] || 0) + t.effortHours;
    }
  }
  return wl;
}
