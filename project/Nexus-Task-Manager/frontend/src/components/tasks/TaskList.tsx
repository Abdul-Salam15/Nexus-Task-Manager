import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { TaskRow } from './TaskRow';
import { useTaskStore, filteredTasks } from '../../store/taskStore';
import { tasksApi } from '../../api/tasks.api';

export function TaskList() {
  const { tasks, filters, reorderTasks } = useTaskStore();
  const filtered = filteredTasks(tasks, filters);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex(t => t.id === active.id);
    const newIdx = tasks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(tasks, oldIdx, newIdx).map((t, i) => ({ ...t, order: i }));
    reorderTasks(reordered);
    tasksApi.reorder(reordered.map(t => t.id)).catch(() => {});
  }

  return (
    <div className="card-strong overflow-hidden">
      {/* Header row (desktop only) */}
      <div className="task-header-row px-4 py-2.5 text-[10.5px] mono uppercase tracking-[0.16em] text-white/45 border-b border-white/8">
        <div /><div />
        <div>Title</div>
        <div>Priority</div>
        <div>Deadline</div>
        <div>Effort · Cat</div>
        <div>Status</div>
        <div />
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center text-white/45 text-[13px]">No tasks match these filters.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {filtered.map(task => <TaskRow key={task.id} task={task} />)}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
