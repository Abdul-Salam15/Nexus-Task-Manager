import { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCategoryStore } from '../store/categoryStore';
import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { authApi } from '../api/auth.api';
import { categoriesApi } from '../api/categories.api';
import { EmojiPicker } from '../components/ui/EmojiPicker';
import { computeStreak } from '../hooks/useProductivity';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'U';
}

const labelCls = 'text-[11px] mono uppercase tracking-widest text-white/45 block mb-1';

export function ProfileView() {
  const { user, updateUser, clearAuth } = useAuthStore();
  const { categories, addCategory, removeCategory } = useCategoryStore();
  const tasks = useTaskStore(s => s.tasks);
  const addToast = useUiStore(s => s.addToast);

  const nameRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [focus, setFocus] = useState(user?.focus || 'Work');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');

  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'Done').length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const streak = computeStreak(tasks);

  const since = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';

  async function saveProfile() {
    const name = fullName.trim();
    if (!name) { nameRef.current?.focus(); return; }
    setSavingProfile(true);
    try {
      const res = await authApi.updateMe({ fullName: name, focus });
      updateUser(res.data.user);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 1800);
    } catch { addToast({ message: 'Update failed', type: 'error' }); }
    finally { setSavingProfile(false); }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      const res = await categoriesApi.create({ name: newCatName.trim(), icon: newCatIcon });
      addCategory(res.data.category);
      addToast({ message: `Category "${newCatName.trim()}" added`, type: 'success' });
      setNewCatName(''); setNewCatIcon('🏷️');
    } catch { addToast({ message: 'Failed to add category', type: 'error' }); }
  }

  async function handleRemoveCategory(name: string) {
    if (categories.length <= 1) return;
    const used = tasks.filter(t => t.category === name).length;
    if (used && !confirm(`${used} task(s) use "${name}". Remove it anyway?`)) return;
    try {
      await categoriesApi.delete(name);
      removeCategory(name);
      addToast({ message: `Category "${name}" removed`, type: 'info' });
    } catch { addToast({ message: 'Failed to remove', type: 'error' }); }
  }

  async function handleLogout() {
    try {
      const rt = localStorage.getItem('nexus_refresh_token') || '';
      await authApi.logout(rt);
    } catch {}
    clearAuth();
  }

  return (
    <section>
      {/* Header */}
      <div className="card-strong p-6 flex items-center gap-5 flex-wrap" style={{ background: 'linear-gradient(160deg, rgba(139,0,0,0.22), rgba(20,4,48,0.4))' }}>
        <div className="w-20 h-20 rounded-2xl grid place-items-center text-[28px] font-semibold text-white shrink-0" style={{ background: 'linear-gradient(140deg,#a51616,#5a0000)', boxShadow: '0 14px 34px -16px rgba(139,0,0,0.9)' }}>
          {initials(user?.fullName || 'U')}
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-[22px] font-semibold tracking-tight">{user?.fullName}</div>
          <div className="text-[13px] text-white/60 mono">{user?.email}</div>
          <div className="text-[11.5px] text-white/40 mono mt-1">Member since {since}</div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-5">
        <div className="card p-5"><div className="text-[11px] mono uppercase tracking-widest text-white/50">Total tasks</div><div className="text-[26px] font-semibold mt-1">{total}</div></div>
        <div className="card p-5"><div className="text-[11px] mono uppercase tracking-widest text-white/50">Completed</div><div className="text-[26px] font-semibold mt-1">{done}</div></div>
        <div className="card p-5"><div className="text-[11px] mono uppercase tracking-widest text-white/50">Completion</div><div className="text-[26px] font-semibold mt-1">{rate}%</div></div>
        <div className="card p-5"><div className="text-[11px] mono uppercase tracking-widest text-white/50">Day streak</div><div className="text-[26px] font-semibold mt-1">{streak}🔥</div></div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-5 mt-4 md:mt-5">
        {/* Account details */}
        <div className="card p-6">
          <div className="text-[14px] font-semibold mb-4 flex items-center gap-2">👤 Account details</div>
          <label className={labelCls}>Display name</label>
          <input ref={nameRef} className="field mb-4" type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
          <label className={labelCls}>Email</label>
          <input className="field mb-4 opacity-70" type="text" value={user?.email || ''} disabled />
          <label className={labelCls}>Default focus area</label>
          <select className="field mb-5" value={focus} onChange={e => setFocus(e.target.value)}>
            {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save changes'}</button>
            <span className="text-[12px] text-emerald-300" style={{ opacity: savedMsg ? 1 : 0, transition: 'opacity .2s' }}>Saved ✓</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="card p-6 mt-4 md:mt-5">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div className="text-[14px] font-semibold flex items-center gap-2">🏷️ Categories</div>
          <div className="text-[12px] text-white/50">Create your own task categories — they appear everywhere you pick a category.</div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          {categories.map(c => {
            const n = tasks.filter(t => t.category === c.name).length;
            return (
              <div key={c.name} className="pill" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--line-strong)', color: '#fff', fontSize: 12.5, padding: '.35rem .6rem', gap: '.5rem' }}>
                <span>{c.icon}</span><span>{c.name}</span>
                <span className="mono text-white/40">{n}</span>
                {categories.length > 1 && (
                  <button className="text-white/40 hover:text-white" title="Remove category" style={{ marginLeft: 2 }} onClick={() => handleRemoveCategory(c.name)}>✕</button>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-[64px_1fr_auto] gap-2 items-end">
          <div>
            <label className="text-[10px] mono uppercase tracking-widest text-white/45 block mb-1">Icon</label>
            <input className="field text-center text-[18px]" placeholder="🏷️" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value || '🏷️')} />
          </div>
          <div>
            <label className="text-[10px] mono uppercase tracking-widest text-white/45 block mb-1">New category</label>
            <input className="field" placeholder="e.g. Health, Finance, Side project" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }} />
          </div>
          <button className="btn btn-primary" type="button" onClick={handleAddCategory}>＋ Add</button>
        </div>
        <div className="mt-3">
          <EmojiPicker value={newCatIcon} onChange={setNewCatIcon} />
        </div>
        <div className="text-[11px] text-white/40 mt-2">Clear the field and type or paste any emoji — or tap a suggestion above.</div>
      </div>

      {/* Sign out */}
      <div className="card p-5 mt-4 md:mt-5 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="text-[13.5px] font-semibold">Sign out</div>
          <div className="text-[12px] text-white/55">End your session on this device.</div>
        </div>
        <button className="btn" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }} onClick={handleLogout}>⎋ Log out</button>
      </div>
    </section>
  );
}
