import { Link } from 'react-router-dom';

function NavBar() {
  return (
    <nav className="p-4 bg-gray-800 text-white flex gap-4">
      <Link to="/">Progetti</Link>
      <Link to="/tasks">Task</Link>
    </nav>
  );
}

export default NavBar;
