import { useUiStore } from '../../store/uiStore';

export function Toaster() {
  const toasts = useUiStore(s => s.toasts);
  const remove = useUiStore(s => s.removeToast);

  return (
    <div className="toaster" id="toaster">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`t-item show ${t.type}`}
          onClick={() => remove(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
