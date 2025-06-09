import { useEffect, useState } from 'react';
import { fetchProjects } from '../services/api';

const ProjectsList = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Lista Progetti</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-4 bg-white border rounded shadow hover:shadow-lg transition"
          >
            <h3 className="font-medium mb-2">{project.name}</h3>
            <p className="text-sm text-gray-600">ID: {project.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsList;
