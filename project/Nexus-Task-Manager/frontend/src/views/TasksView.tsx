import { FilterBar } from '../components/tasks/FilterBar';
import { TaskList } from '../components/tasks/TaskList';

export function TasksView() {
  return (
    <div>
      <FilterBar />
      <TaskList />
    </div>
  );
}
