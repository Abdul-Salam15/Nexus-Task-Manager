import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useActivityStore } from '../../store/activityStore';
import { useNotifStore } from '../../store/notificationStore';
import { tasksApi } from '../../api/tasks.api';
import { categoriesApi } from '../../api/categories.api';
import { activityApi } from '../../api/activity.api';
import { notificationsApi } from '../../api/notifications.api';

// Views
import { DashboardView } from '../../views/DashboardView';
import { TasksView } from '../../views/TasksView';
import { ScheduleView } from '../../views/ScheduleView';
import { ProductivityView } from '../../views/ProductivityView';
import { RecommendationsView } from '../../views/RecommendationsView';
import { ProfileView } from '../../views/ProfileView';
import { TaskModal } from '../tasks/TaskModal';
import { Toaster } from '../ui/Toast';
import { effectiveDate, parseDate, fmtFull } from '../../lib/format';

function OverloadBanner() {
  const tasks = useTaskStore(s => s.tasks);
  const navigate = useUiStore(s => s.navigate);
  const wl: Record<string, number> = {};
  tasks.forEach(t => { if (t.status !== 'Done') { const d = effectiveDate(t); wl[d] = (wl[d] || 0) + t.effortHours; } });
  const overloads = Object.entries(wl).filter(([, h]) => h > 8).sort((a, b) => b[1] - a[1]);
  if (overloads.length === 0) return null;
  const [date, hours] = overloads[0];
  return (
    <div className="mx-4 md:mx-8 mt-4 md:mt-5 px-4 py-3 rounded-xl flex items-center gap-3 fade-in" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
      <div className="w-8 h-8 grid place-items-center rounded-lg shrink-0" style={{ background: 'rgba(239,68,68,0.2)' }}>⚠️</div>
      <div className="flex-1 text-[12.5px] md:text-[13px]"><span className="font-semibold">Workload alert.</span> <span className="text-white/75">{fmtFull(parseDate(date))} is scheduled for {hours}h — {(hours - 8).toFixed(1)}h over the cap.</span></div>
      <button className="btn shrink-0" onClick={() => navigate('schedule')}><span className="hidden sm:inline">View schedule</span><span className="sm:hidden">View</span> →</button>
    </div>
  );
}

export function AppShell() {
  const { activeView, sidebarOpen, setSidebarOpen } = useUiStore();
  const setTasks = useTaskStore(s => s.setTasks);
  const setCategories = useCategoryStore(s => s.setCategories);
  const setActivity = useActivityStore(s => s.setActivity);
  const setNotifications = useNotifStore(s => s.setNotifications);

  useEffect(() => {
    Promise.all([
      tasksApi.getAll(),
      categoriesApi.getAll(),
      activityApi.getAll(),
      notificationsApi.getAll(),
    ]).then(([tasksRes, catsRes, actRes, notifsRes]) => {
      setTasks(tasksRes.data.tasks);
      setCategories(catsRes.data.categories);
      setActivity(actRes.data.activity);
      setNotifications(notifsRes.data.notifications);
    }).catch(console.error);
  }, []);

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    tasks: <TasksView />,
    schedule: <ScheduleView />,
    productivity: <ProductivityView />,
    recommendations: <RecommendationsView />,
    profile: <ProfileView />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <OverloadBanner />
        <main className="flex-1 overflow-y-auto scroll-thin px-4 md:px-8 py-5 md:py-6">
          <div className="fade-in">
            {views[activeView]}
          </div>
        </main>
      </div>

      <TaskModal />
      <Toaster />
    </div>
  );
}
