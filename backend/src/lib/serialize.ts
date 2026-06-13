export function toUserJson(row: any) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    focus: row.focus,
    createdAt: row.created_at,
  };
}

export function toTaskJson(row: any) {
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    deadline: row.deadline,
    effortHours: row.effort_hours,
    category: row.category,
    status: row.status,
    scheduled: row.scheduled,
    completedAt: row.completed_at,
    order: row.order_index,
  };
}

export function toCategoryJson(row: any) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
  };
}

export function toNotificationJson(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: !!row.read,
    time: row.time,
  };
}

export function toActivityJson(row: any) {
  return {
    id: row.id,
    text: row.text,
    time: row.time,
  };
}
