import type { Task } from '../store/taskStore';

const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateAdd(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function runAutoSchedule(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const result: Task[] = tasks.map(t => ({
    ...t,
    scheduled: t.status === 'Done' ? t.scheduled : null,
  }));

  const pool = result
    .filter(t => t.status !== 'Done')
    .sort((a, b) => {
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority])
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      return a.effortHours - b.effortHours;
    });

  const weekdays: { date: string; used: number }[] = [];
  for (let i = 0; weekdays.length < 10 && i < 20; i++) {
    const d = dateAdd(today, i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) weekdays.push({ date: iso(d), used: 0 });
  }
  const cap = 8;

  const taskMap = new Map<string, Task>(result.map(t => [t.id, t]));

  for (const t of pool) {
    const task = taskMap.get(t.id);
    if (!task) continue;
    let placed = false;
    for (const day of weekdays) {
      if (day.date > t.deadline) break;
      if (day.used + t.effortHours <= cap) {
        task.scheduled = day.date;
        day.used += t.effortHours;
        placed = true;
        break;
      }
    }
    if (!placed) {
      for (const day of weekdays) {
        if (day.date > t.deadline) continue;
        task.scheduled = day.date;
        day.used += t.effortHours;
        placed = true;
        break;
      }
    }
    if (!placed) task.scheduled = t.deadline;
  }

  return result;
}
