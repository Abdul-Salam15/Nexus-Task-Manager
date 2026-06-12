import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { useActivityStore } from '../store/activityStore';
import { runAutoSchedule } from '../hooks/useScheduler';
import { tasksApi } from '../api/tasks.api';
import {
  iso, dateAdd, parseDate, fmtDay, fmtFull, fmtMd, today, todayStr,
  effectiveDate, PRIORITY_COLORS,
} from '../lib/format';

function workloadOf(tasks: { status: string; scheduled: string | null; completedAt: string | null; deadline: string; effortHours: number }[]) {
  const wl: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.status === 'Done') return;
    wl[effectiveDate(t)] = (wl[effectiveDate(t)] || 0) + t.effortHours;
  });
  return wl;
}

export function ScheduleView() {
  const { tasks, setTasks } = useTaskStore();
  const addToast = useUiStore(s => s.addToast);
  const logAction = useActivityStore(s => s.logAction);

  const t0 = today();
  const monday = dateAdd(t0, -(t0.getDay() === 0 ? 6 : t0.getDay() - 1));
  const wl = workloadOf(tasks);

  async function handleAutoSchedule() {
    const scheduled = runAutoSchedule(tasks);
    setTasks(scheduled);
    try {
      const res = await tasksApi.autoSchedule();
      setTasks(res.data.tasks);
      logAction('Auto-scheduled pending tasks');
      addToast({ message: 'Schedule updated', type: 'success' });
    } catch { addToast({ message: 'Auto-schedule failed', type: 'error' }); }
  }

  async function handleClear() {
    try {
      const res = await tasksApi.clearSchedule();
      setTasks(res.data.tasks);
      logAction('Cleared schedule assignments');
      addToast({ message: 'Schedule cleared', type: 'info' });
    } catch { addToast({ message: 'Clear failed', type: 'error' }); }
  }

  // Overload report
  const overloadList: { date: string; hours: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const ds = iso(dateAdd(monday, i));
    const h = wl[ds] || 0;
    if (h > 8) overloadList.push({ date: ds, hours: h });
  }

  function suggestionFor(o: { date: string; hours: number }) {
    const tasksOn = tasks.filter(t => t.status !== 'Done' && effectiveDate(t) === o.date).sort((a, b) => b.effortHours - a.effortHours);
    const heaviest = tasksOn[0];
    if (!heaviest) return null;
    let freeDay: { date: string; free: number } | null = null;
    for (let i = 0; i < 7; i++) {
      const ds = iso(dateAdd(monday, i));
      const d = dateAdd(monday, i);
      if (ds === o.date || d.getDay() === 0 || d.getDay() === 6) continue;
      const free = 8 - (wl[ds] || 0);
      if (free >= heaviest.effortHours) { freeDay = { date: ds, free }; break; }
    }
    return { heaviest, freeDay };
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-[15px] font-semibold">Weekly schedule</div>
          <div className="text-[12px] text-white/55">Auto-scheduling fills Mon–Fri up to 8h/day, sorted by deadline, priority, then effort.</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={handleClear}><span>⟲</span>Clear assignments</button>
          <button className="btn btn-primary" onClick={handleAutoSchedule}><span>✦</span>Auto-schedule pending</button>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const d = dateAdd(monday, i);
            const ds = iso(d);
            const isWeekday = i < 5;
            const hours = wl[ds] || 0;
            const dayTasks = tasks.filter(t => t.status !== 'Done' && effectiveDate(t) === ds);
            const overloaded = hours > 8;
            return (
              <div key={ds} className={`rounded-xl p-3 min-h-[220px] ${overloaded ? 'overload-day' : ''}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className={`text-[10.5px] mono uppercase tracking-widest ${ds === todayStr() ? 'text-white' : 'text-white/45'}`}>{fmtDay(d)}{ds === todayStr() ? ' · today' : ''}</div>
                    <div className={`text-[15px] font-semibold ${!isWeekday ? 'text-white/45' : ''}`}>{d.getDate()}</div>
                  </div>
                  {overloaded ? (
                    <span className="pill" style={{ background: 'rgba(239,68,68,0.18)', color: '#fecaca' }}><span className="pill-dot" style={{ background: '#ef4444' }} />{hours}h</span>
                  ) : hours > 0 ? (
                    <span className="pill" style={{ background: 'rgba(255,255,255,0.06)', color: '#d8d6e6' }}>{hours}h / 8</span>
                  ) : isWeekday ? (
                    <span className="pill" style={{ background: 'rgba(255,255,255,0.04)', color: '#9a98b3' }}>0h / 8</span>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  {dayTasks.length === 0 ? (
                    <div className="text-[10.5px] text-white/30 italic mt-1">{isWeekday ? 'Free' : 'Weekend'}</div>
                  ) : dayTasks.map(t => (
                    <div key={t.id} className="gantt-task" style={{ background: 'linear-gradient(180deg, rgba(139,0,0,0.55), rgba(95,0,0,0.45))' }}>
                      <div className="t-title truncate">{t.title}</div>
                      <div className="t-meta flex items-center gap-2 mt-0.5"><span className="pill-dot" style={{ background: PRIORITY_COLORS[t.priority].dot }} />{t.effortHours}h · {t.priority}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mt-4 md:mt-5">
        {/* Overload report */}
        <div className="card p-5">
          <div className="text-[15px] font-semibold mb-1">Overload report</div>
          <div className="text-[12px] text-white/55 mb-3">Days exceeding the 8-hour cap with suggested moves.</div>
          <div className="space-y-2">
            {overloadList.length === 0 ? (
              <div className="text-[12.5px] text-white/55 px-3 py-6 text-center" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 10 }}>
                ✓ No overloads detected. Schedule fits within capacity.
              </div>
            ) : overloadList.map(o => {
              const s = suggestionFor(o);
              return (
                <div key={o.date} className="px-3 py-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold">{fmtFull(parseDate(o.date))}</div>
                    <span className="pill" style={{ background: 'rgba(239,68,68,0.18)', color: '#fecaca' }}>{o.hours}h · {(o.hours - 8).toFixed(1)}h over</span>
                  </div>
                  {s && s.heaviest && (
                    <div className="text-[12px] text-white/75 mt-1">
                      {s.freeDay ? (
                        <>Move <span className="text-white">"{s.heaviest.title}"</span> to <span className="mono">{fmtMd(parseDate(s.freeDay.date))}</span> — it has {s.freeDay.free}h free.</>
                      ) : (
                        <>Consider splitting <span className="text-white">"{s.heaviest.title}"</span> into subtasks across adjacent days.</>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Capacity bars */}
        <div className="card p-5">
          <div className="text-[15px] font-semibold mb-1">Capacity by day</div>
          <div className="text-[12px] text-white/55 mb-3">Used vs. 8h cap, Mon–Fri.</div>
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => {
              const d = dateAdd(monday, i);
              const ds = iso(d);
              const h = wl[ds] || 0;
              const over = h > 8;
              return (
                <div key={ds}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-white/70">{d.toLocaleDateString('en-US', { weekday: 'long' })} <span className="text-white/35 mono ml-1">{fmtMd(d)}</span></span>
                    <span className={`mono ${over ? 'text-red-300' : 'text-white/70'}`}>{h}h / 8h</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full" style={{ width: `${Math.min(100, (h / 8) * 100)}%`, background: over ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#a51616,#8b0000)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
