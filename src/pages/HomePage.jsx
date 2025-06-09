import ProjectsList from '../components/ProjectsList';

const HomePage = () => (
  <div className="container mx-auto p-4 space-y-8">
    <section className="text-center py-8 bg-gray-50 rounded shadow">
      <h2 className="text-2xl font-bold mb-2">Benvenuto su Schedasito</h2>
      <p className="text-gray-600">Gestisci facilmente i tuoi progetti.</p>
    </section>
    <ProjectsList />
  </div>
);

export default HomePage;
