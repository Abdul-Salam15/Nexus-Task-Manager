export interface ProductivityTask {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  effortHours: number;
  category: string;
  status: 'Pending' | 'In Progress' | 'Done';
  scheduled: string | null;
  completedAt: string | null;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateAdd(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function todayIso(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return iso(d);
}

export function daysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00');
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function computeStreak(tasks: ProductivityTask[]): number {
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

export function computeProductivityScore(tasks: ProductivityTask[]): number {
  const today = todayIso();
  const total = tasks.filter(t => t.status !== 'Pending' || t.deadline <= today).length;
  if (!total) return 0;
  const onTime = tasks.filter(t => t.status === 'Done' && t.completedAt && t.completedAt <= t.deadline).length;
  return Math.round((onTime / total) * 100);
}

function effectiveDate(t: ProductivityTask): string {
  return t.scheduled || t.completedAt || t.deadline;
}

export function computeWorkload(tasks: ProductivityTask[]): Record<string, number> {
  const wl: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status !== 'Done') {
      const d = effectiveDate(t);
      wl[d] = (wl[d] || 0) + t.effortHours;
    }
  }
  return wl;
}
