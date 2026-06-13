import { useNotifStore } from '../../store/notificationStore';
import { notificationsApi } from '../../api/notifications.api';
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

const TONE: Record<string, { ico: string }> = {
  alert: { ico: '🔴' },
  deadline: { ico: '⏰' },
  tip: { ico: '💡' },
};

interface Props { open: boolean; onClose: () => void; }

export function NotifDropdown({ open, onClose }: Props) {
  const { notifications, markAllRead, dismiss, clearAll } = useNotifStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Mark all read shortly after opening (matches reference behaviour)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      markAllRead();
      notificationsApi.markAllRead().catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [open, markAllRead]);

  if (!open) return null;

  function handleDismiss(id: string) {
    dismiss(id);
    notificationsApi.dismiss(id).catch(() => {});
  }

  function handleClear() {
    clearAll();
    notificationsApi.clearAll().catch(() => {});
  }

  return createPortal(
    <div
      ref={ref}
      id="notifDropdown"
      className="absolute w-[360px] card-strong z-50 overflow-hidden fade-in"
      style={{ top: 78, right: 32, background: '#15093a' }}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="font-semibold text-[14px]">Notifications</div>
        <button className="text-[11px] text-white/60 hover:text-white" onClick={handleClear}>Clear all</button>
      </div>
      <div className="max-h-[380px] overflow-auto scroll-thin">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/45 text-[12.5px]">All caught up.</div>
        ) : (
          notifications.map(n => {
            const tone = TONE[n.type] || TONE.tip;
            return (
              <div key={n.id} className={`px-4 py-3 border-b border-white/5 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}>
                <div className="text-lg shrink-0">{tone.ico}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold">{n.title}</div>
                  <div className="text-[12px] text-white/70 leading-snug">{n.body}</div>
                </div>
                <button className="text-white/40 hover:text-white text-[11px]" onClick={() => handleDismiss(n.id)}>✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );
}
