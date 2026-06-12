import { useAuthStore } from '../../store/authStore';
import { useUiStore, type ViewName } from '../../store/uiStore';
import { useActivityStore } from '../../store/activityStore';
import { authApi } from '../../api/auth.api';

const NAV: { view: ViewName; icon: string; label: string }[] = [
  { view: 'dashboard', icon: '◐', label: 'Dashboard' },
  { view: 'tasks', icon: '≡', label: 'Tasks' },
  { view: 'schedule', icon: '▦', label: 'Schedule' },
  { view: 'productivity', icon: '▲', label: 'Productivity' },
  { view: 'recommendations', icon: '✦', label: 'Recommendations' },
  { view: 'profile', icon: '◉', label: 'Profile' },
];

function fmtActivityDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtActivityTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'U';
}

export function Sidebar() {
  const { activeView, navigate, setSidebarOpen } = useUiStore();
  const { user, clearAuth } = useAuthStore();
  const activity = useActivityStore(s => s.activity);

  async function handleLogout() {
    try {
      const rt = localStorage.getItem('nexus_refresh_token') || '';
      await authApi.logout(rt);
    } catch {}
    clearAuth();
  }

  return (
    <aside
      className="w-full lg:w-64 h-full shrink-0 border-r border-white/5 px-4 py-5 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.15)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between gap-2.5 px-2 mb-7">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl grid place-items-center"
            style={{ background: 'linear-gradient(140deg,#a51616,#5a0000)', boxShadow: '0 6px 20px -8px rgba(139,0,0,0.9)' }}
          >
            <span className="text-white font-black text-lg">N</span>
          </div>
          <div>
            <div className="font-bold text-[15px] tracking-tight leading-tight">Nexus</div>
            <div className="text-[10.5px] mono text-white/50 uppercase tracking-widest">Task Intelligence</div>
          </div>
        </div>
        <button
          className="ico-btn lg:hidden"
          style={{ width: 32, height: 32 }}
          title="Close"
          onClick={() => setSidebarOpen(false)}
        >
          ✕
        </button>
      </div>

      {/* Workspace nav */}
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 px-2 mb-2">Workspace</div>
      <nav id="nav" className="flex flex-col gap-1">
        {NAV.map(item => (
          <button
            key={item.view}
            className={`nav-item w-full text-left ${activeView === item.view ? 'active' : ''}`}
            data-view={item.view}
            onClick={() => { navigate(item.view); setSidebarOpen(false); }}
          >
            <span className="nav-ico">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Activity */}
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 px-2 mb-2 mt-6">Activity</div>
      <div className="px-2 text-[12px] text-white/60 space-y-2 max-h-56 overflow-auto scroll-thin pr-1">
        {activity.slice(0, 8).map(a => (
          <div key={a.id} className="flex items-start gap-2 leading-snug">
            <span className="text-white/35 mono text-[10.5px] mt-0.5 shrink-0 w-12">{fmtActivityDay(a.time)}</span>
            <span className="text-white/30 mono text-[10.5px] mt-0.5 shrink-0 w-12">{fmtActivityTime(a.time)}</span>
            <span className="text-white/70">{a.text}</span>
          </div>
        ))}
      </div>

      {/* User block */}
      <div className="mt-auto pt-4">
        <div className="grow-line mb-3" />
        <div className="flex items-center gap-2 px-2">
          <div
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer rounded-lg py-1 px-1 -mx-1 transition hover:bg-white/5"
            title="View profile"
            onClick={() => { navigate('profile'); setSidebarOpen(false); }}
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-semibold text-white shrink-0"
              style={{ background: 'linear-gradient(140deg,#a51616,#5a0000)' }}
            >
              {initials(user?.fullName || 'U')}
            </div>
            <div className="leading-tight flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{user?.fullName}</div>
              <div className="text-[10.5px] text-white/50 mono truncate">{user?.email}</div>
            </div>
          </div>
          <button
            className="ico-btn"
            title="Log out"
            style={{ width: 32, height: 32, backgroundColor: 'rgb(113, 108, 108)' }}
            onClick={handleLogout}
          >
            →
          </button>
        </div>
      </div>
    </aside>
  );
}
