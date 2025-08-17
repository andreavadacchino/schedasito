const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchProjects() {
  const response = await fetch(`${API_URL}/projects/`);
  if (!response.ok) {
    throw new Error('Failed to load projects');
  }
  return response.json();
}

export async function fetchTasks() {
  const response = await fetch(`${API_URL}/tasks/`);
  if (!response.ok) {
    throw new Error('Failed to load tasks');
  }
  return response.json();
}
