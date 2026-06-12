import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { EmojiPicker } from '../ui/EmojiPicker';
import { useTaskStore } from '../../store/taskStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useUiStore } from '../../store/uiStore';
import { useActivityStore } from '../../store/activityStore';
import { useAuthStore } from '../../store/authStore';
import { tasksApi } from '../../api/tasks.api';
import { categoriesApi } from '../../api/categories.api';
import type { Task } from '../../store/taskStore';
import { iso, dateAdd, today } from '../../lib/format';

const labelCls = 'text-[11px] mono uppercase tracking-widest text-white/55';

export function TaskModal() {
  const { modalOpen, modalEditingId, closeModal } = useUiStore();
  const tasks = useTaskStore(s => s.tasks);
  const { addTask, updateTask } = useTaskStore();
  const { categories, addCategory } = useCategoryStore();
  const logAction = useActivityStore(s => s.logAction);
  const addToast = useUiStore(s => s.addToast);
  const user = useAuthStore(s => s.user);

  const editing = modalEditingId ? tasks.find(t => t.id === modalEditingId) : null;

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [deadline, setDeadline] = useState('');
  const [effortHours, setEffortHours] = useState(2);
  const [category, setCategory] = useState('Work');
  const [status, setStatus] = useState<Task['status']>('Pending');
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [showNewCat, setShowNewCat] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setPriority(editing.priority);
      setDeadline(editing.deadline);
      setEffortHours(editing.effortHours);
      setCategory(editing.category);
      setStatus(editing.status);
    } else {
      const names = categories.map(c => c.name);
      setTitle('');
      setPriority('Medium');
      setDeadline(iso(dateAdd(today(), 2)));
      setEffortHours(2);
      setCategory(user?.focus && names.includes(user.focus) ? user.focus : (names[0] || 'Work'));
      setStatus('Pending');
    }
    setShowNewCat(false);
    setNewCatName('');
    setNewCatIcon('🏷️');
  }, [modalEditingId, modalOpen]);

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      const res = await categoriesApi.create({ name: newCatName.trim(), icon: newCatIcon });
      addCategory(res.data.category);
      setCategory(newCatName.trim());
      setShowNewCat(false);
      setNewCatName('');
      setNewCatIcon('🏷️');
      logAction(`Created category · ${newCatName.trim()}`);
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const data = { title: title.trim(), priority, deadline, effortHours, category, status };
      if (editing) {
        const res = await tasksApi.update(editing.id, data);
        updateTask(editing.id, res.data.task);
        logAction(`Updated · ${title.trim()}`);
        addToast({ message: 'Task updated', type: 'success' });
      } else {
        const res = await tasksApi.create(data);
        addTask(res.data.task);
        logAction(`Created · ${title.trim()}`);
        addToast({ message: 'Task created', type: 'success' });
      }
      closeModal();
    } catch {
      addToast({ message: 'Failed to save task', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={modalOpen} onClose={closeModal}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[15px] font-semibold">{editing ? 'Edit task' : 'New task'}</div>
        <button className="ico-btn" onClick={closeModal} title="Close">✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Title</label>
            <input className="field mt-1" placeholder="e.g. Draft Q3 strategy memo" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Priority</label>
              <select className="field mt-1" value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                className="field mt-1"
                value={showNewCat ? '__new__' : category}
                onChange={e => {
                  if (e.target.value === '__new__') setShowNewCat(true);
                  else { setCategory(e.target.value); setShowNewCat(false); }
                }}
              >
                {categories.map(c => (
                  <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                ))}
                <option value="__new__">＋ New category…</option>
              </select>
            </div>
          </div>

          {showNewCat && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.28)' }}>
              <div className="grid grid-cols-[64px_1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-[10px] mono uppercase tracking-widest text-white/55">Icon</label>
                  <input className="field mt-1 text-center text-[18px]" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value || '🏷️')} placeholder="🏷️" />
                </div>
                <div>
                  <label className="text-[10px] mono uppercase tracking-widest text-white/55">New category name</label>
                  <input
                    className="field mt-1"
                    placeholder="e.g. Health, Side project"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                  />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleAddCategory}>Add</button>
              </div>
              <div className="mt-2.5">
                <EmojiPicker value={newCatIcon} onChange={setNewCatIcon} />
              </div>
              <div className="text-[10.5px] text-white/40 mt-2">Clear the field and type or paste any emoji — or tap one above.</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Deadline</label>
              <input className="field mt-1" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Effort (hours)</label>
              <input className="field mt-1" type="number" min={1} max={12} step={0.5} value={effortHours} onChange={e => setEffortHours(+e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select className="field mt-1" value={status} onChange={e => setStatus(e.target.value as Task['status'])}>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save task'}</button>
        </div>
      </form>
    </Modal>
  );
}
