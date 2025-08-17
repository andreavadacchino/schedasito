import { useEffect, useState } from 'react';
import { fetchTasks } from '../services/api';

function TasksList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks().then(setTasks).catch(console.error);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Lista Task</h2>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="p-2 bg-gray-100 rounded">
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TasksList;
