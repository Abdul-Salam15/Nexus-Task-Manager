export interface SchedulableTask {
  id: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  effortHours: number;
  status: 'Pending' | 'In Progress' | 'Done';
  scheduled: string | null;
}

const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateAdd(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Mirrors runAutoSchedule from the frontend's useScheduler hook: deadline ASC,
 * priority DESC, effort ASC, packed into weekdays up to an 8h/day cap.
 * Returns a map of taskId -> new `scheduled` date.
 */
export function runAutoSchedule(tasks: SchedulableTask[]): Map<string, string> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const pool = tasks
    .filter(t => t.status !== 'Done')
    .sort((a, b) => {
      if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      return a.effortHours - b.effortHours;
    });

  const weekdays: { date: string; used: number }[] = [];
  for (let i = 0; weekdays.length < 10 && i < 20; i++) {
    const d = dateAdd(today, i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) weekdays.push({ date: iso(d), used: 0 });
  }
  const cap = 8;

  const result = new Map<string, string>();

  for (const t of pool) {
    let placed = false;
    for (const day of weekdays) {
      if (day.date > t.deadline) break;
      if (day.used + t.effortHours <= cap) {
        result.set(t.id, day.date);
        day.used += t.effortHours;
        placed = true;
        break;
      }
    }
    if (!placed) {
      for (const day of weekdays) {
        if (day.date > t.deadline) continue;
        result.set(t.id, day.date);
        day.used += t.effortHours;
        placed = true;
        break;
      }
    }
    if (!placed) result.set(t.id, t.deadline);
  }

  return result;
}
