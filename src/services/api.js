export async function fetchProjects() {
  const response = await fetch('/data/projects.json');
  if (!response.ok) {
    throw new Error('Failed to load projects');
  }
  return response.json();
}
