import { computeWorkload, computeStreak, computeProductivityScore, daysFromToday, todayIso, type ProductivityTask } from './productivity.js';

export interface Recommendation {
  icon: string;
  tone: 'crimson' | 'amber' | 'green' | 'violet';
  title: string;
  body: string;
  actionLabel: string | null;
  actionType: string;
  taskId?: string;
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function geminiRecommend(tasks: ProductivityTask[], firstName: string): Promise<Recommendation[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_KEY');
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const today = todayIso();
  const wl = computeWorkload(tasks);
  const overloaded = Object.entries(wl).filter(([, h]) => h > 8).map(([date, hours]) => ({ date, hours }));

  const ctx = {
    today,
    user: firstName || 'there',
    completionRate: computeProductivityScore(tasks),
    streak: computeStreak(tasks),
    overloadedDays: overloaded,
    tasks: tasks.map(t => ({
      id: t.id, title: t.title, priority: t.priority, category: t.category,
      status: t.status, deadline: t.deadline, dueInDays: daysFromToday(t.deadline),
      effortHours: t.effortHours,
    })),
  };

  const system =
    `You are the recommendation engine inside "Nexus", an intelligent task manager. ` +
    `Today is ${ctx.today}. Analyze the user's tasks and produce 3 to 5 concise, high-value, prioritized recommendations ` +
    `that help them hit deadlines and balance workload. Be specific — reference real task titles. ` +
    `Order by urgency. Negative dueInDays means overdue. Workdays over 8h are overloaded.\n\n` +
    `For each recommendation choose exactly one actionType from: ` +
    `"start" (begin a pending task now — set taskId), ` +
    `"reschedule" (push a task's deadline to tomorrow — set taskId), ` +
    `"rebalance" (auto-redistribute an overloaded day), ` +
    `"filterWork" (open the Work backlog), ` +
    `"showBacklog" (open all pending tasks), ` +
    `or "none" (advice only). ` +
    `Pick tone: "crimson" for urgent/overdue, "amber" for workload/capacity, "green" for positive/on-track, "violet" for habits/strategy. ` +
    `Pick a single relevant emoji for icon. actionLabel is a short imperative (max 3 words) or null when actionType is "none".\n\n` +
    `Workload snapshot:\n${JSON.stringify(ctx)}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: system }] }],
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          recommendations: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                icon: { type: 'STRING' },
                tone: { type: 'STRING', enum: ['crimson', 'amber', 'green', 'violet'] },
                title: { type: 'STRING' },
                body: { type: 'STRING' },
                actionType: { type: 'STRING', enum: ['start', 'reschedule', 'rebalance', 'filterWork', 'showBacklog', 'none'] },
                actionLabel: { type: 'STRING' },
                taskId: { type: 'STRING' },
              },
              required: ['icon', 'tone', 'title', 'body', 'actionType'],
            },
          },
        },
        required: ['recommendations'],
      },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e: any = await res.json(); if (e.error?.message) msg = e.error.message; } catch {}
    throw new Error(msg);
  }

  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join('') || '';
  let parsed: { recommendations?: Recommendation[] } | Recommendation[];
  try { parsed = JSON.parse(text); } catch { throw new Error('Gemini returned an unexpected format.'); }
  const list = Array.isArray(parsed) ? parsed : ((parsed as { recommendations?: Recommendation[] }).recommendations || []);
  if (!list.length) throw new Error('Gemini returned no recommendations.');
  return list;
}

export function heuristicRecommend(tasks: ProductivityTask[]): Recommendation[] {
  const today = todayIso();
  const recs: Recommendation[] = [];

  const overdue = tasks.filter(t => t.status !== 'Done' && t.deadline < today);
  if (overdue.length > 0) {
    const t = overdue[0];
    recs.push({
      icon: '🔥',
      tone: 'crimson',
      title: `Overdue: ${t.title}`,
      body: `This task was due ${daysFromToday(t.deadline) * -1} day(s) ago. Address it now to get back on track.`,
      actionLabel: 'Start now',
      actionType: 'start',
      taskId: t.id,
    });
  }

  const wl = computeWorkload(tasks);
  const overloadedDays = Object.entries(wl).filter(([, h]) => h > 8);
  if (overloadedDays.length > 0) {
    recs.push({
      icon: '⚖️',
      tone: 'amber',
      title: `${overloadedDays.length} day(s) are overloaded`,
      body: `You have days scheduled over 8h. Run auto-schedule to rebalance your workload.`,
      actionLabel: 'Rebalance',
      actionType: 'rebalance',
    });
  }

  const urgent = tasks.filter(t => t.status !== 'Done' && t.priority === 'High' && daysFromToday(t.deadline) <= 2);
  if (urgent.length > 0 && !overdue.some(o => o.id === urgent[0].id)) {
    recs.push({
      icon: '⚡',
      tone: 'crimson',
      title: `Urgent: ${urgent[0].title}`,
      body: `High-priority task due in ${daysFromToday(urgent[0].deadline)} day(s). Consider starting it today.`,
      actionLabel: 'Start now',
      actionType: 'start',
      taskId: urgent[0].id,
    });
  }

  const pending = tasks.filter(t => t.status === 'Pending');
  if (pending.length >= 5) {
    recs.push({
      icon: '📋',
      tone: 'violet',
      title: `${pending.length} tasks in your backlog`,
      body: `Review your pending tasks and schedule the most important ones this week.`,
      actionLabel: 'View backlog',
      actionType: 'showBacklog',
    });
  }

  const doneTasks = tasks.filter(t => t.status === 'Done');
  if (doneTasks.length > 0 && recs.length < 3) {
    recs.push({
      icon: '🎯',
      tone: 'green',
      title: `${doneTasks.length} tasks completed`,
      body: `Great progress! Keep the momentum going — tackle another task today.`,
      actionLabel: null,
      actionType: 'none',
    });
  }

  return recs.slice(0, 5);
}
