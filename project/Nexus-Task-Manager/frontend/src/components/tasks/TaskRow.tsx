import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PriorityPill } from '../ui/PriorityPill';
import { StatusPill } from '../ui/StatusPill';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import { useActivityStore } from '../../store/activityStore';
import { useCategoryStore } from '../../store/categoryStore';
import { tasksApi } from '../../api/tasks.api';
import type { Task } from '../../store/taskStore';
import { catIcon, deadlineLabel, daysFromToday, fmtMd, parseDate } from '../../lib/format';

interface TaskRowProps {
  task: Task;
}

export function TaskRow({ task }: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const { updateTask } = useTaskStore();
  const openModal = useUiStore(s => s.openModal);
  const logAction = useActivityStore(s => s.logAction);
  const addToast = useUiStore(s => s.addToast);
  const categories = useCategoryStore(s => s.categories);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);

  const done = task.status === 'Done';
  const overdue = !done && daysFromToday(task.deadline) < 0;
  const icon = catIcon(categories, task.category);

  async function toggleDone() {
    const newStatus = done ? 'Pending' : 'Done';
    try {
      const res = await tasksApi.update(task.id, { status: newStatus });
      updateTask(task.id, res.data.task);
      logAction(newStatus === 'Done' ? `Completed · ${task.title}` : `Reopened · ${task.title}`);
    } catch { addToast({ message: 'Update failed', type: 'error' }); }
  }

  async function saveTitle() {
    setEditing(false);
    const next = titleDraft.trim();
    if (!next || next === task.title) { setTitleDraft(task.title); return; }
    try {
      const res = await tasksApi.update(task.id, { title: next });
      updateTask(task.id, res.data.task);
      logAction(`Renamed · ${next}`);
    } catch { setTitleDraft(task.title); }
  }

  return (
    <div
      ref={setNodeRef}
      className={`task-row-grid task-row px-4 py-3 border-b border-white/5 hover:bg-white/[0.025] ${isDragging ? 'dragging' : ''}`}
      style={style}
    >
      {/* Drag handle */}
      <div className="tr-drag text-white/30 cursor-grab select-none" title="Drag to reorder" {...attributes} {...listeners}>⋮⋮</div>

      {/* Checkbox */}
      <div className={`tr-check check ${done ? 'on' : ''}`} onClick={toggleDone} />

      {/* Title */}
      <div className="tr-title min-w-0">
        {editing ? (
          <input
            className="field py-0.5 text-[14px]"
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditing(false); setTitleDraft(task.title); } }}
            autoFocus
          />
        ) : (
          <div
            className={`text-[14px] font-medium truncate cursor-text ${done ? 'line-through text-white/45' : ''}`}
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
          >
            {task.title}
          </div>
        )}
        <div className="text-[11px] text-white/45 flex items-center gap-2 mt-0.5">
          {overdue && <span className="text-red-300">⚠ Overdue</span>}
          {task.scheduled && <span className="mono">▸ {fmtMd(parseDate(task.scheduled))}</span>}
        </div>
      </div>

      {/* Desktop columns */}
      <div className="tr-priority"><PriorityPill priority={task.priority} /></div>
      <div className="tr-deadline text-[12.5px]">{deadlineLabel(task.deadline, done)}</div>
      <div className="tr-effort text-[12.5px] text-white/75 flex items-center gap-1.5">
        <span className="mono">{task.effortHours}h</span>
        <span className="text-white/30">·</span>
        <span>{icon} {task.category}</span>
      </div>
      <div className="tr-status"><StatusPill status={task.status} /></div>
      <div className="tr-edit text-right">
        <button className="text-white/40 hover:text-white" onClick={() => openModal(task.id)} title="Edit">✎</button>
      </div>

      {/* Mobile meta row */}
      <div className="tr-meta-mobile hidden">
        <PriorityPill priority={task.priority} />
        <StatusPill status={task.status} />
        <span className="text-white/55 mono">{task.effortHours}h</span>
        <span className="text-white/35">·</span>
        <span>{icon} {task.category}</span>
        <span className="text-white/35">·</span>
        <span>{deadlineLabel(task.deadline, done)}</span>
      </div>
    </div>
  );
}
