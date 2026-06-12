import { useUiStore, type ViewName } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useNotifStore } from '../../store/notificationStore';
import { NotifDropdown } from '../notifications/NotifDropdown';
import { useState, useEffect } from 'react';

const PAGE_TITLES: Record<ViewName, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  schedule: 'Schedule',
  productivity: 'Productivity',
  recommendations: 'AI Recommendations',
  profile: 'Profile',
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'U';
}

function watGreeting(): string {
  // West Africa Time is UTC+1 (no DST)
  const watHour = (new Date().getUTCHours() + 1) % 24;
  if (watHour < 12) return 'Good morning';
  if (watHour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Header() {
  const { activeView, toggleSidebar, openModal, navigate } = useUiStore();
  const user = useAuthStore(s => s.user);
  const notifications = useNotifStore(s => s.notifications);
  const unread = notifications.filter(n => !n.read).length;
  const [notifOpen, setNotifOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl+K to open quick-add
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openModal]);

  const firstName = user?.fullName?.split(' ')[0] || '';
  const pageTitle = activeView === 'dashboard' ? `${watGreeting()}, ${firstName}` : PAGE_TITLES[activeView];

  return (
    <header className="px-4 md:px-8 py-4 md:py-5 flex items-center gap-3 md:gap-4 border-b border-white/5">
      {/* Hamburger (mobile) */}
      <button className="ico-btn ham-btn" title="Menu" style={{ width: 38, height: 38 }} onClick={toggleSidebar}>≡</button>

      {/* Breadcrumb + Title */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] mono uppercase tracking-[0.2em] text-white/45">{activeView.toUpperCase()}</div>
        <h1 className="text-[18px] md:text-[22px] font-semibold tracking-tight truncate">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search hint */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl card-strong text-[12px] text-white/70">
          <span>🔍</span><span>Search tasks…</span><span className="kbd ml-2">⌘K</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button className="ico-btn" title="Notifications" onClick={() => setNotifOpen(v => !v)}>
            <span>🔔</span>
            {unread > 0 && <span className="badge-count">{unread}</span>}
          </button>
          <NotifDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Quick add */}
        <button className="btn btn-primary" onClick={() => openModal(null)}>
          <span>＋</span><span className="hidden sm:inline">Quick add</span>
        </button>

        {/* User chip (desktop) */}
        <div
          className="hidden xl:flex items-center gap-2 ml-2 pl-3 border-l border-white/10 cursor-pointer rounded-lg pr-1 transition hover:bg-white/5"
          title="View profile"
          onClick={() => navigate('profile')}
        >
          <div
            className="w-9 h-9 rounded-full grid place-items-center text-[12.5px] font-semibold text-white"
            style={{ background: 'linear-gradient(140deg,#a51616,#5a0000)' }}
          >
            {initials(user?.fullName || 'U')}
          </div>
          <div className="leading-tight">
            <div className="text-[11px] mono uppercase tracking-widest text-white/45">Welcome back</div>
            <div className="text-[13px] font-semibold">{firstName} 👋</div>
          </div>
        </div>
      </div>
    </header>
  );
}
