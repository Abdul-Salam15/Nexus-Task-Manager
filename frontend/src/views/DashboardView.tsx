import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { useCategoryStore } from '../store/categoryStore';
import { useActivityStore } from '../store/activityStore';
import { computeStreak, computeProductivityScore } from '../hooks/useProductivity';
import { tasksApi } from '../api/tasks.api';
import { runAutoSchedule } from '../hooks/useScheduler';
import { PriorityPill } from '../components/ui/PriorityPill';
import {
  iso, dateAdd, fmtDay, fmtMd, today, todayStr, daysFromToday,
  effectiveDate, deadlineLabel, catIcon, PRIORITY_COLORS, PRIORITY_RANK,
} from '../lib/format';

function WorkloadOf(tasks: { status: string; scheduled: string | null; completedAt: string | null; deadline: string; effortHours: number }[]) {
  const wl: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.status === 'Done') return;
    const d = effectiveDate(t);
    wl[d] = (wl[d] || 0) + t.effortHours;
  });
  return wl;
}

export function DashboardView() {
  const { tasks, setTasks } = useTaskStore();
  const categories = useCategoryStore(s => s.categories);
  const logAction = useActivityStore(s => s.logAction);
  const { navigate, setWeekOffset, weekOffset, addToast } = useUiStore();

  const t0 = today();
  const wl = WorkloadOf(tasks);
  const streak = computeStreak(tasks);
  const score = computeProductivityScore(tasks);
  const overloads = Object.entries(wl).filter(([, h]) => h > 8);
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const inProg = tasks.filter(t => t.status === 'In Progress').length;
  const completedToday = tasks.filter(t => t.status === 'Done' && t.completedAt === todayStr()).length;

  const monday = dateAdd(t0, -(t0.getDay() === 0 ? 6 : t0.getDay() - 1));
  const weekStart = dateAdd(monday, weekOffset);
  const weekEnd = dateAdd(weekStart, 6);

  const upNext = tasks
    .filter(t => t.status !== 'Done')
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || (PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]))
    .slice(0, 5);

  const hoursRemaining = tasks.filter(t => t.status !== 'Done').reduce((s, t) => s + t.effortHours, 0);
  const highOpen = tasks.filter(t => t.priority === 'High' && t.status !== 'Done').length;
  const overdueOpen = tasks.filter(t => t.status !== 'Done' && daysFromToday(t.deadline) < 0).length;
  const catCounts = categories.map(c => ({ c: c.name, icon: c.icon, n: tasks.filter(t => t.category === c.name && t.status !== 'Done').length }));

  async function handleAutoSchedule() {
    const scheduled = runAutoSchedule(tasks);
    setTasks(scheduled);
    try {
      const res = await tasksApi.autoSchedule();
      setTasks(res.data.tasks);
      logAction(`Auto-scheduled ${scheduled.filter(t => t.scheduled).length} tasks`);
      addToast({ message: 'Schedule updated', type: 'success' });
    } catch { addToast({ message: 'Schedule failed', type: 'error' }); }
  }

  return (
    <section>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] mono uppercase tracking-widest text-white/50">Total tasks</div>
            <span className="text-white/40 text-lg">≡</span>
          </div>
          <div className="text-[34px] font-semibold tracking-tight mt-1">{tasks.length}</div>
          <div className="text-[11.5px] text-white/55">{pending} open · {inProg} in progress</div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] mono uppercase tracking-widest text-white/50">Overloaded days</div>
            <span className="text-white/40 text-lg">⚠</span>
          </div>
          <div className="text-[34px] font-semibold tracking-tight mt-1">{overloads.length}</div>
          <div className="text-[11.5px] text-white/55">over the 8h/day cap</div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="text-[11px] mono uppercase tracking-widest text-white/50">Completed today</div>
            <span className="text-white/40 text-lg">✓</span>
          </div>
          <div className="text-[34px] font-semibold tracking-tight mt-1">{completedToday}</div>
          <div className="text-[11.5px] text-white/55">{streak}-day streak</div>
        </div>

        <div className="accent-card p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="text-[11px] mono uppercase tracking-widest text-white/70">Productivity score</div>
            <span className="text-white/70 text-lg">▲</span>
          </div>
          <div className="flex items-end gap-3 mt-1">
            <div className="text-[34px] font-semibold tracking-tight">{score}</div>
            <div className="text-[11.5px] text-white/70 mb-2">on-time delivery</div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.18), transparent 70%)' }} />
        </div>
      </div>

      {/* Weekly timeline */}
      <div className="card p-5 mt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[15px] font-semibold">This week</div>
            <div className="text-[12px] text-white/55">{fmtMd(weekStart)} – {fmtMd(weekEnd)}, {weekEnd.getFullYear()}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="switch">
              <button className={weekOffset === 0 ? 'on' : ''} onClick={() => setWeekOffset(0)}>This week</button>
              <button className={weekOffset === 7 ? 'on' : ''} onClick={() => setWeekOffset(7)}>Next week</button>
            </div>
            <button className="btn" onClick={handleAutoSchedule}><span>✦</span>Auto-schedule</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const d = dateAdd(weekStart, i);
            const ds = iso(d);
            const dayTasks = tasks.filter(t => effectiveDate(t) === ds);
            const hours = wl[ds] || 0;
            const isWeekend = i >= 5;
            const isToday = ds === todayStr();
            const overloaded = hours > 8;
            return (
              <div key={ds} className={`day-cell rounded-xl p-2.5 ${overloaded ? 'overload-day' : ''}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <div className={`text-[10.5px] mono uppercase tracking-widest ${isToday ? 'text-white' : 'text-white/45'}`}>{fmtDay(d)}{isToday ? ' · today' : ''}</div>
                    <div className={`text-[14px] font-semibold ${isWeekend ? 'text-white/45' : ''}`}>{d.getDate()}</div>
                  </div>
                  {overloaded ? (
                    <span className="pill" style={{ background: 'rgba(239,68,68,0.18)', color: '#fecaca' }}><span className="pill-dot" style={{ background: '#ef4444' }} />{hours}h</span>
                  ) : hours > 0 ? (
                    <span className="pill" style={{ background: 'rgba(255,255,255,0.06)', color: '#d8d6e6' }}>{hours}h</span>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  {dayTasks.length === 0 ? (
                    <div className="text-[10.5px] text-white/30 italic mt-1">No tasks</div>
                  ) : dayTasks.map(t => (
                    <div key={t.id} className="gantt-task" style={{ background: 'linear-gradient(180deg, rgba(139,0,0,0.55), rgba(95,0,0,0.45))' }}>
                      <div className="t-title truncate">{t.title}</div>
                      <div className="t-meta flex items-center gap-2 mt-0.5"><span className="pill-dot" style={{ background: PRIORITY_COLORS[t.priority].dot }} />{t.effortHours}h · {t.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 mt-4 md:mt-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold">Up next</div>
            <button className="text-[12px] text-white/60 hover:text-white" onClick={() => navigate('tasks')}>View all →</button>
          </div>
          <div className="space-y-2">
            {upNext.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)' }}>
                <span className="text-lg">{catIcon(categories, t.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{t.title}</div>
                  <div className="text-[11.5px] text-white/55 flex items-center gap-2">{deadlineLabel(t.deadline)} <span className="text-white/30">·</span> {t.effortHours}h</div>
                </div>
                <PriorityPill priority={t.priority} />
              </div>
            ))}
            {upNext.length === 0 && <div className="text-[12.5px] text-white/45 px-1 py-2">All caught up. 🎉</div>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] font-semibold">Quick stats</div>
            <span className="pill" style={{ background: 'rgba(52,211,153,0.12)', color: '#6ee7b7' }}><span className="pill-dot" style={{ background: '#34d399' }} />Live</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[13px]"><span className="text-white/65">Hours remaining</span><span className="font-semibold mono">{hoursRemaining}h</span></div>
            <div className="flex items-center justify-between text-[13px]"><span className="text-white/65">High-priority open</span><span className="font-semibold mono">{highOpen}</span></div>
            <div className="flex items-center justify-between text-[13px]"><span className="text-white/65">Overdue</span><span className={`font-semibold mono ${overdueOpen ? 'text-red-300' : ''}`}>{overdueOpen}</span></div>
            <div className="grow-line my-2" />
            {catCounts.map(c => (
              <div key={c.c} className="flex items-center justify-between text-[13px]"><span className="text-white/65">{c.icon} {c.c}</span><span className="font-semibold mono">{c.n}</span></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
