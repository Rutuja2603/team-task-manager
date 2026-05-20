export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);

  // NEW STATES
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const loadDashboard = async () => {
    const statsRes = await api.get('/stats');
    const tasksRes = await api.get('/tasks/mine');

    setStats(statsRes.data);
    setRecentTasks(tasksRes.data.slice(0, 5));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // CREATE PROJECT
  const createProject = async (e) => {
    e.preventDefault();

    try {
      await api.post('/projects', {
        name: projectName,
        description: projectDescription,
      });

      toast.success('Project created successfully!');

      setShowModal(false);
      setProjectName('');
      setProjectDescription('');
    } catch (err) {
      toast.error('Failed to create project');
    }
  };

  if (!stats) return <Layout><Loader /></Layout>;

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Hello, {user?.name}
          </h1>
          <p className="text-gray-500 text-sm">
            Here's your task summary
          </p>
        </div>

        {/* NEW PROJECT BUTTON */}
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">My Tasks</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">
            {stats.completed}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">In Progress</p>
          <p className="text-3xl font-bold text-yellow-500">
            {stats.inProgress}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">Overdue</p>
          <p className="text-3xl font-bold text-red-600">
            {stats.overdue}
          </p>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">
            My Recent Tasks
          </h2>

          <Link
            to="/my-tasks"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">
            No tasks assigned to you yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="pb-2 font-medium">Task</th>
                <th className="pb-2 font-medium">Project</th>
                <th className="pb-2 font-medium">Due</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>

            <tbody>
              {recentTasks.map((t) => (
                <tr
                  key={t.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="py-2 font-medium">{t.title}</td>

                  <td className="py-2 text-gray-500">
                    {t.project_name}
                  </td>

                  <td className="py-2 text-gray-500">
                    {t.due_date
                      ? new Date(t.due_date).toLocaleDateString()
                      : '—'}
                  </td>

                  <td className="py-2">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PROJECT MODAL */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Project"
      >
        <form onSubmit={createProject}>
          <label className="block text-sm font-medium mb-1">
            Project Name
          </label>

          <input
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500"
          />

          <label className="block text-sm font-medium mb-1">
            Description
          </label>

          <textarea
            rows={3}
            value={projectDescription}
            onChange={(e) =>
              setProjectDescription(e.target.value)
            }
            className="w-full border rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
          >
            Create Project
          </button>
        </form>
      </Modal>
    </Layout>
  );
};