export async function fetchProjects() {
  const url = new URL('data/projects.json', import.meta.env.BASE_URL);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load projects');
  }
  return response.json();
}
