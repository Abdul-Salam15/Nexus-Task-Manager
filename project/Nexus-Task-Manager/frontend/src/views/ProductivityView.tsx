import { useTaskStore } from '../store/taskStore';
import { useActivityStore } from '../store/activityStore';
import { computeBarChartData } from '../hooks/useProductivity';
import { fmtDay, daysFromToday } from '../lib/format';

function productivityScore(tasks: { status: string; completedAt: string | null; deadline: string }[]) {
  const completed = tasks.filter(t => t.status === 'Done' && t.completedAt);
  const due = tasks.filter(t => t.status !== 'Done' || t.completedAt);
  if (due.length === 0) return 0;
  const onTime = completed.filter(t => (t.completedAt as string) <= t.deadline).length;
  const overdueOpen = tasks.filter(t => t.status !== 'Done' && daysFromToday(t.deadline) < 0).length;
  const futureOpen = tasks.filter(t => t.status !== 'Done' && daysFromToday(t.deadline) >= 0).length;
  const denom = completed.length + overdueOpen + futureOpen;
  return denom ? Math.round((onTime / denom) * 100) : 0;
}

export function ProductivityView() {
  const tasks = useTaskStore(s => s.tasks);
  const activity = useActivityStore(s => s.activity);

  const barData = computeBarChartData(tasks);
  const total = barData.reduce((s, d) => s + d.count, 0);

  const score = productivityScore(tasks);
  const completed = tasks.filter(t => t.status === 'Done' && t.completedAt);
  const due = tasks.filter(t => t.status !== 'Done' || t.completedAt).length;
  const onTime = completed.filter(t => (t.completedAt as string) <= t.deadline).length;
  const overdue = tasks.filter(t => t.status !== 'Done' && daysFromToday(t.deadline) < 0).length;

  // Bar chart geometry
  const max = Math.max(3, ...barData.map(d => d.count));
  const w = 560, h = 220, padL = 32, padB = 30, padT = 10, padR = 10;
  const bw = (w - padL - padR) / 7 - 12;

  // Ring geometry
  const circumference = 2 * Math.PI * 84;
  const ringOffset = circumference * (1 - score / 100);

  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Bar chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[15px] font-semibold">Tasks completed · last 7 days</div>
              <div className="text-[12px] text-white/55">Daily output, including today.</div>
            </div>
            <div className="text-[12px] text-white/60"><span className="mono text-white">{total}</span> completed this week</div>
          </div>
          <div>
            <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4231b" />
                  <stop offset="100%" stopColor="#5a0000" />
                </linearGradient>
                <linearGradient id="barGradToday" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8a5b" />
                  <stop offset="100%" stopColor="#a51616" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map(i => {
                const y = padT + ((h - padT - padB) / 4) * i;
                const v = Math.round(max - (max / 4) * i);
                return (
                  <g key={i}>
                    <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
                    <text x={padL - 6} y={y + 4} fontSize="10" fill="rgba(255,255,255,0.4)" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
                  </g>
                );
              })}
              {barData.map((d, i) => {
                const x = padL + i * ((w - padL - padR) / 7) + 6;
                const bh = (h - padT - padB) * (d.count / max);
                const y = h - padB - bh;
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={bw} height={Math.max(2, bh)} rx="6" fill={`url(#${d.isToday ? 'barGradToday' : 'barGrad'})`} />
                    {d.count > 0 && <text x={x + bw / 2} y={y - 6} fontSize="11" fontWeight="600" fill="#fff" textAnchor="middle">{d.count}</text>}
                    <text x={x + bw / 2} y={h - 10} fontSize="10.5" fill={d.isToday ? '#fff' : 'rgba(255,255,255,0.55)'} textAnchor="middle" fontFamily="JetBrains Mono">{fmtDay(d.date).toUpperCase()}</text>
                    <text x={x + bw / 2} y={h + 4} fontSize="9" fill="rgba(255,255,255,0.35)" textAnchor="middle" fontFamily="JetBrains Mono">{d.date.getDate()}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Score ring */}
        <div className="card p-5 flex flex-col">
          <div className="text-[15px] font-semibold mb-1">Productivity score</div>
          <div className="text-[12px] text-white/55 mb-3">On-time completions ÷ total due.</div>
          <div className="flex-1 grid place-items-center">
            <div className="relative">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a51616" />
                    <stop offset="100%" stopColor="#ff7a59" />
                  </linearGradient>
                </defs>
                <circle className="ring-bg" cx="100" cy="100" r="84" fill="none" strokeWidth="14" />
                <circle className="ring-fg" cx="100" cy="100" r="84" fill="none" strokeWidth="14"
                  strokeDasharray={circumference} strokeDashoffset={ringOffset} transform="rotate(-90 100 100)" />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-[40px] font-semibold leading-none">{score}</div>
                  <div className="text-[11px] mono uppercase tracking-widest text-white/55 mt-1">of 100</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div><div className="text-[18px] font-semibold">{onTime}</div><div className="text-[10.5px] mono uppercase tracking-widest text-white/50">On time</div></div>
            <div><div className="text-[18px] font-semibold">{due}</div><div className="text-[10.5px] mono uppercase tracking-widest text-white/50">Due</div></div>
            <div><div className="text-[18px] font-semibold">{overdue}</div><div className="text-[10.5px] mono uppercase tracking-widest text-white/50">Overdue</div></div>
          </div>
        </div>
      </div>

      {/* Behavioural log */}
      <div className="card p-5 mt-5">
        <div className="text-[15px] font-semibold mb-3">Behavioural log</div>
        <div className="text-[12.5px] space-y-1.5 max-h-[280px] overflow-auto scroll-thin pr-2">
          {activity.length === 0 && <div className="text-white/45">No activity yet.</div>}
          {activity.map(a => {
            const d = new Date(a.time);
            return (
              <div key={a.id} className="flex items-start gap-3">
                <span className="mono text-white/45 w-32 shrink-0">{d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <span className="text-white/80">{a.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
