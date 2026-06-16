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

  // --- 1. Overdue tasks (all of them, sorted most-overdue first) ---
  const overdue = tasks
    .filter(t => t.status !== 'Done' && daysFromToday(t.deadline) < 0)
    .sort((a, b) => daysFromToday(a.deadline) - daysFromToday(b.deadline));

  if (overdue.length === 1) {
    const t = overdue[0];
    const daysLate = Math.abs(daysFromToday(t.deadline));
    recs.push({
      icon: '🔥',
      tone: 'crimson',
      title: `Overdue: "${t.title}"`,
      body: `"${t.title}" is ${daysLate} day${daysLate > 1 ? 's' : ''} past its deadline${t.priority === 'High' ? ' and is high priority' : ''}. Every day it slips makes catch-up harder — start it now.`,
      actionLabel: 'Start now',
      actionType: 'start',
      taskId: t.id,
    });
  } else if (overdue.length > 1) {
    const worst = overdue[0];
    const daysLate = Math.abs(daysFromToday(worst.deadline));
    const listed = overdue.slice(0, 3).map(t => `"${t.title}"`).join(', ');
    const overflow = overdue.length > 3 ? ` and ${overdue.length - 3} more` : '';
    recs.push({
      icon: '🔥',
      tone: 'crimson',
      title: `${overdue.length} tasks are overdue`,
      body: `${listed}${overflow} are all past their deadlines. "${worst.title}" is the furthest behind at ${daysLate} day${daysLate > 1 ? 's' : ''} — tackle it first before the gap grows further.`,
      actionLabel: 'Start most overdue',
      actionType: 'start',
      taskId: worst.id,
    });
  }

  // --- 2. Tasks due today ---
  const overdueIds = new Set(overdue.map(t => t.id));
  const dueToday = tasks.filter(
    t => t.status !== 'Done' && daysFromToday(t.deadline) === 0 && !overdueIds.has(t.id),
  );
  if (dueToday.length > 0 && recs.length < 5) {
    const byPriority = [...dueToday].sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return rank[a.priority] - rank[b.priority];
    });
    const lead = byPriority[0];
    const totalHours = dueToday.reduce((s, t) => s + t.effortHours, 0);
    recs.push({
      icon: '⚡',
      tone: 'crimson',
      title: dueToday.length === 1
        ? `"${lead.title}" is due today`
        : `${dueToday.length} tasks due today (${totalHours}h total)`,
      body: dueToday.length === 1
        ? `"${lead.title}" (${lead.effortHours}h, ${lead.priority} priority) must be finished today. ${lead.status === 'Pending' ? "It hasn't been started yet — open it now." : 'Finish it before anything else.'}`
        : `You have ${dueToday.length} tasks due today totalling ${totalHours}h of work. Lead with "${lead.title}" (${lead.priority} priority, ${lead.effortHours}h) — it's the most critical. ${totalHours > 8 ? "That's a heavy day; consider deferring lower-priority items." : ''}`,
      actionLabel: 'Start now',
      actionType: 'start',
      taskId: lead.id,
    });
  }

  // --- 3. Tasks due tomorrow that are unstarted or high effort ---
  const dueTomorrow = tasks.filter(
    t => t.status !== 'Done' && daysFromToday(t.deadline) === 1,
  );
  if (dueTomorrow.length > 0 && recs.length < 5) {
    const urgent = dueTomorrow.filter(t => t.priority === 'High' || t.effortHours >= 3);
    if (urgent.length > 0) {
      const lead = urgent.sort((a, b) => (b.priority === 'High' ? 1 : 0) - (a.priority === 'High' ? 1 : 0))[0];
      recs.push({
        icon: '📅',
        tone: 'amber',
        title: urgent.length === 1
          ? `"${lead.title}" is due tomorrow`
          : `${urgent.length} demanding tasks due tomorrow`,
        body: urgent.length === 1
          ? `"${lead.title}" (${lead.effortHours}h, ${lead.priority} priority) is due tomorrow${lead.status === 'Pending' ? " and hasn't been started" : ''}. ${lead.effortHours >= 3 ? 'Start it today to avoid a last-minute crunch.' : 'Plan to wrap it up first thing tomorrow.'}`
          : `${urgent.length} tasks due tomorrow are either high priority or require significant effort — "${urgent.map(t => t.title).join('", "')}"${urgent.length > 2 ? '' : ''}. Start on the heaviest one today to avoid a deadline crunch.`,
        actionLabel: 'Start today',
        actionType: 'start',
        taskId: lead.id,
      });
    }
  }

  // --- 4. Workload overload (most overloaded day highlighted) ---
  const wl = computeWorkload(tasks);
  const overloadedDays = Object.entries(wl)
    .filter(([, h]) => h > 8)
    .sort(([, a], [, b]) => b - a);
  if (overloadedDays.length > 0 && recs.length < 5) {
    const [worstDay, worstHours] = overloadedDays[0];
    const label = worstDay === today
      ? 'Today'
      : new Date(worstDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    recs.push({
      icon: '⚖️',
      tone: 'amber',
      title: overloadedDays.length === 1
        ? `${label} is overloaded (${worstHours}h scheduled)`
        : `${overloadedDays.length} days are overloaded`,
      body: overloadedDays.length === 1
        ? `${label} has ${worstHours}h of work scheduled — ${(worstHours - 8).toFixed(1)}h over a sustainable 8h day. Auto-schedule can shift lower-priority tasks to lighter days.`
        : `${overloadedDays.length} days exceed 8h. The worst is ${label} at ${worstHours}h. Auto-schedule will redistribute tasks to keep each day manageable.`,
      actionLabel: 'Rebalance now',
      actionType: 'rebalance',
    });
  }

  // --- 5. Stuck in-progress tasks (past deadline but never completed) ---
  const stuck = tasks.filter(t => t.status === 'In Progress' && daysFromToday(t.deadline) < 0);
  if (stuck.length > 0 && recs.length < 5) {
    const t = stuck[0];
    const daysLate = Math.abs(daysFromToday(t.deadline));
    recs.push({
      icon: '🔄',
      tone: 'crimson',
      title: `"${t.title}" is stalled`,
      body: `This task has been In Progress for ${daysLate} day${daysLate > 1 ? 's' : ''} past its deadline without completion. Consider breaking it into smaller steps, or reschedule it to set a realistic new target.`,
      actionLabel: 'Reschedule',
      actionType: 'reschedule',
      taskId: t.id,
    });
  }

  // --- 6. Unscheduled high-priority tasks due within 7 days ---
  const unscheduledUrgent = tasks.filter(
    t => t.status === 'Pending' && t.priority === 'High' && !t.scheduled
      && daysFromToday(t.deadline) > 0 && daysFromToday(t.deadline) <= 7
      && !overdueIds.has(t.id),
  );
  if (unscheduledUrgent.length > 0 && recs.length < 5) {
    const t = unscheduledUrgent[0];
    const daysLeft = daysFromToday(t.deadline);
    recs.push({
      icon: '📌',
      tone: 'amber',
      title: `"${t.title}" isn't scheduled yet`,
      body: `This high-priority task (${t.effortHours}h) is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''} but has no scheduled date. Without a slot on your calendar it's easy to miss — run auto-schedule or assign it a day now.`,
      actionLabel: 'Auto-schedule',
      actionType: 'rebalance',
    });
  }

  // --- 7. Backlog insight (specific, not generic) ---
  const pending = tasks.filter(t => t.status === 'Pending');
  const pendingHigh = pending.filter(t => t.priority === 'High');
  if (pending.length >= 5 && recs.length < 5) {
    recs.push({
      icon: '📋',
      tone: 'violet',
      title: `${pending.length} unstarted tasks in your backlog`,
      body: pendingHigh.length > 0
        ? `You have ${pending.length} pending tasks — ${pendingHigh.length} are high priority. Leading with "${pendingHigh[0].title}" will have the most impact. Open your backlog and schedule it this week.`
        : `You have ${pending.length} pending tasks waiting. Reviewing and scheduling the top items this week will prevent a pile-up as deadlines approach.`,
      actionLabel: 'View backlog',
      actionType: 'showBacklog',
    });
  }

  // --- 8. Positive reinforcement / streak (only if we have room) ---
  if (recs.length < 3) {
    const streak = computeStreak(tasks);
    const score = computeProductivityScore(tasks);
    const done = tasks.filter(t => t.status === 'Done');

    if (streak >= 3) {
      recs.push({
        icon: '🔥',
        tone: 'green',
        title: `${streak}-day productivity streak!`,
        body: `You've completed tasks ${streak} days in a row — that's a real habit forming. Keep it alive by scheduling at least one task for today.`,
        actionLabel: null,
        actionType: 'none',
      });
    } else if (done.length > 0) {
      recs.push({
        icon: '🎯',
        tone: 'green',
        title: `${done.length} task${done.length > 1 ? 's' : ''} completed`,
        body: score >= 80
          ? `You're completing ${score}% of tasks on time — excellent. Keep tackling tasks proactively to maintain this pace.`
          : score >= 50
          ? `${done.length} task${done.length > 1 ? 's' : ''} done with a ${score}% on-time rate. Scheduling tasks earlier in the week should push that number higher.`
          : `${done.length} task${done.length > 1 ? 's' : ''} done so far, but only ${score}% were on time. Try assigning tasks to specific days further ahead of their deadlines.`,
        actionLabel: null,
        actionType: 'none',
      });
    } else {
      recs.push({
        icon: '🚀',
        tone: 'violet',
        title: 'Make your first move',
        body: `No tasks completed yet — the hardest part is starting. Pick the highest-priority item from your list and put even 30 minutes into it today. Progress compounds.`,
        actionLabel: 'View backlog',
        actionType: 'showBacklog',
      });
    }
  }

  return recs.slice(0, 5);
}
