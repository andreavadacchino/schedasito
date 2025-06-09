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
      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id} className="p-2 bg-gray-100 rounded">
            {project.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectsList;
