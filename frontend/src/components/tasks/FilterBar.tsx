import { useTaskStore } from '../../store/taskStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useUiStore } from '../../store/uiStore';

export function FilterBar() {
  const { filters, setFilters } = useTaskStore();
  const categories = useCategoryStore(s => s.categories);
  const openModal = useUiStore(s => s.openModal);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
        <input
          className="field max-w-sm"
          type="text"
          placeholder="Search title…"
          value={filters.search}
          onChange={e => setFilters({ search: e.target.value })}
        />
      </div>
      <select className="field max-w-[160px]" value={filters.status} onChange={e => setFilters({ status: e.target.value })}>
        <option value="">All statuses</option>
        <option>Pending</option>
        <option>In Progress</option>
        <option>Done</option>
      </select>
      <select className="field max-w-[160px]" value={filters.priority} onChange={e => setFilters({ priority: e.target.value })}>
        <option value="">All priorities</option>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <select className="field max-w-[160px]" value={filters.category} onChange={e => setFilters({ category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
      </select>
      <button className="btn" onClick={() => openModal(null)}><span>＋</span>New task</button>
    </div>
  );
}
