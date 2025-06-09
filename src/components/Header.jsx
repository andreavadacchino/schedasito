import { Link } from 'react-router-dom';

const Header = () => (
  <header className="bg-blue-600 text-white p-4 shadow">
    <div className="container mx-auto flex justify-between items-center">
      <h1 className="text-lg font-bold">
        <Link to="/">Schedasito</Link>
      </h1>
      <nav className="space-x-4">
        <Link to="/" className="hover:underline">
          Home
        </Link>
      </nav>
    </div>
  </header>
);

export default Header;
