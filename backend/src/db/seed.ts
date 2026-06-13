export const DEFAULT_CATEGORIES = [
  { name: 'Work', icon: '💼' },
  { name: 'Personal', icon: '🏡' },
  { name: 'Academic', icon: '🎓' },
];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateAdd(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function today(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

interface SeedTask {
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  effortHours: number;
  category: string;
  status: 'Pending' | 'In Progress' | 'Done';
  scheduled: string | null;
  completedAt: string | null;
  order: number;
}

/** Mirrors seedTasks() from the design reference (project/index.html). */
export function seedTasks(): SeedTask[] {
  const t0 = today();
  return [
    { title: 'Submit grant renewal narrative', priority: 'High', deadline: iso(dateAdd(t0, 1)), effortHours: 4, category: 'Work', status: 'Pending', scheduled: null, completedAt: null, order: 0 },
    { title: 'Pay quarterly tax estimate', priority: 'High', deadline: iso(dateAdd(t0, 2)), effortHours: 1.5, category: 'Personal', status: 'Pending', scheduled: null, completedAt: null, order: 1 },
    { title: 'Distributed systems problem set', priority: 'Medium', deadline: iso(dateAdd(t0, 4)), effortHours: 5, category: 'Academic', status: 'In Progress', scheduled: null, completedAt: null, order: 2 },
    { title: 'Onboarding doc for new designer', priority: 'Medium', deadline: iso(dateAdd(t0, 3)), effortHours: 3, category: 'Work', status: 'Pending', scheduled: null, completedAt: null, order: 3 },
    { title: 'Review pull requests · auth refactor', priority: 'High', deadline: iso(dateAdd(t0, 5)), effortHours: 2, category: 'Work', status: 'Pending', scheduled: null, completedAt: null, order: 4 },
    { title: 'Plan parents anniversary dinner', priority: 'Low', deadline: iso(dateAdd(t0, 6)), effortHours: 1, category: 'Personal', status: 'Pending', scheduled: null, completedAt: null, order: 5 },
    { title: 'Read chapter 7 · operating systems', priority: 'Low', deadline: iso(dateAdd(t0, 7)), effortHours: 2, category: 'Academic', status: 'Pending', scheduled: null, completedAt: null, order: 6 },
    { title: 'Refactor billing webhook handler', priority: 'Medium', deadline: iso(dateAdd(t0, -1)), effortHours: 3, category: 'Work', status: 'Pending', scheduled: null, completedAt: null, order: 7 },
    { title: 'Weekly grocery run', priority: 'Low', deadline: iso(dateAdd(t0, -2)), effortHours: 1, category: 'Personal', status: 'Done', scheduled: iso(dateAdd(t0, -2)), completedAt: iso(dateAdd(t0, -2)), order: 8 },
    { title: 'Sketch onboarding wireframes', priority: 'Medium', deadline: iso(dateAdd(t0, -1)), effortHours: 2, category: 'Work', status: 'Done', scheduled: iso(dateAdd(t0, -1)), completedAt: iso(dateAdd(t0, -1)), order: 9 },
    { title: 'Submit reimbursement receipts', priority: 'Low', deadline: iso(dateAdd(t0, -3)), effortHours: 0.5, category: 'Work', status: 'Done', scheduled: iso(dateAdd(t0, -3)), completedAt: iso(dateAdd(t0, -3)), order: 10 },
  ];
}

function stampOffset(daysAgo: number, hour: number): string {
  const d = dateAdd(today(), -daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 55), 0, 0);
  return d.toISOString();
}

/** Mirrors seedActivity() from the design reference. */
export function seedActivity(): { text: string; time: string }[] {
  return [
    { text: 'Completed · Weekly grocery run', time: stampOffset(2, 9) },
    { text: 'Completed · Sketch onboarding wireframes', time: stampOffset(1, 16) },
    { text: 'Completed · Submit reimbursement receipts', time: stampOffset(3, 11) },
    { text: 'Logged in', time: stampOffset(0, 8) },
  ];
}

/** Mirrors seedNotifications() from the design reference. */
export function seedNotifications(): { type: 'alert' | 'deadline' | 'tip'; title: string; body: string }[] {
  return [
    { type: 'alert', title: 'Task overdue', body: 'Refactor billing webhook handler was due yesterday.' },
    { type: 'deadline', title: 'Deadline approaching', body: 'Submit grant renewal narrative due tomorrow.' },
    { type: 'tip', title: 'Productivity tip', body: 'You complete 38% more tasks before noon — try blocking 9–11 for deep work.' },
  ];
}
