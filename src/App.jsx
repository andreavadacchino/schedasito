import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';

const HomePage = lazy(() => import('./pages/HomePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
