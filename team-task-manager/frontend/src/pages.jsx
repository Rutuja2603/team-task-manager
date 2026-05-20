import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from './api';
import { useAuth } from './AuthContext';
import { Layout, Modal, Loader, StatusBadge } from './components';

/* ── LOGIN ── */
export const Login = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Logged in!');
      // admin goes to admin panel, members go to dashboard
      nav(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-1">TaskFlow</h2>
        <p className="text-center text-xs text-gray-400 mb-6">Sign in to your account</p>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full border rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-500" />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input type="password" required value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full border rounded px-3 py-2 mb-5 text-sm focus:outline-none focus:border-blue-500" />

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          New member? <Link to="/signup" className="text-blue-600 hover:underline">Create account</Link>
        </p>
      </form>
    </div>
  );
};

/* ── SIGNUP ── */
export const Signup = () => {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      toast.success('Account created! Please login.');
      nav('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-1">Create Account</h2>
        <p className="text-center text-xs text-gray-400 mb-6">Register as a team member</p>

        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input required value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Your full name"
          className="w-full border rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-500" />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" required value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="Your email address"
          className="w-full border rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-500" />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input type="password" required minLength={6} value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          placeholder="Min 6 characters"
          className="w-full border rounded px-3 py-2 mb-5 text-sm focus:outline-none focus:border-blue-500" />

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Sign Up'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
};

/* ── DASHBOARD (members only) ── */
export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data));
    api.get('/tasks/mine').then(r => setRecentTasks(r.data.slice(0, 5)));
  }, []);

  if (!stats) return <Layout><Loader /></Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-1">Hello, {user?.name} </h1>
      <p className="text-gray-500 text-sm mb-6">Here's your task summary</p>
      <div className="mb-6">
  <Link
    to="/projects"
    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
  >
    + Assign New Project
  </Link>
</div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">My Tasks</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">In Progress</p>
          <p className="text-3xl font-bold text-yellow-500">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <p className="text-xs text-gray-500 mb-1">Overdue</p>
          <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="bg-white rounded-lg shadow-sm border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700">My Recent Tasks</h2>
          <Link to="/my-tasks" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>

        {recentTasks.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No tasks assigned to you yet.</p>
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
              {recentTasks.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">{t.title}</td>
                  <td className="py-2 text-gray-500">{t.project_name}</td>
                  <td className="py-2 text-gray-500">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

/* ── PROJECTS ── */
export const Projects = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = async () => {
    const { data } = await api.get('/projects');
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => { loadProjects(); }, []);

  const createProject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', { name, description });
      toast.success('Project created!');
      setShowModal(false);
      setName(''); setDescription('');
      loadProjects();
    } catch {
      toast.error('Could not create project');
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    toast.success('Project deleted');
    loadProjects();
  };

  if (loading) return <Layout><Loader /></Layout>;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={() => setShowModal(true)}
  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
  + New Project
</button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-400">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-lg border p-5 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-lg cursor-pointer hover:text-blue-600"
                  onClick={() => nav(`/projects/${p.id}`)}>
                  {p.name}
                </h3>
                {user?.role === 'admin' && (
                  <button onClick={() => deleteProject(p.id)}
                    className="text-gray-300 hover:text-red-500 text-xl leading-none ml-2">×</button>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-3">{p.description || 'No description'}</p>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                <button onClick={() => nav(`/projects/${p.id}`)}
                  className="text-xs text-blue-600 hover:underline">Open →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={createProject}>
          <label className="block text-sm font-medium mb-1">Project Name</label>
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500" />

          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full border rounded px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-500" />

          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
            Create
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

/* ── PROJECT DETAILS (Kanban) ── */
const COLUMNS = [
  { key: 'pending',     label: 'To Do',      color: 'bg-yellow-50 border-yellow-200' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-200'    },
  { key: 'completed',   label: 'Done',        color: 'bg-green-50 border-green-200'  },
];

export const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assigned_to: '', priority: 'medium', due_date: ''
  });

  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    const [proj, users] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get('/users'),
    ]);
    setData(proj.data);
    setAllUsers(users.data);
  };

  useEffect(() => { loadData(); }, [id]);

  const createTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', { ...taskForm, project_id: id });
      toast.success('Task added!');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
      loadData();
    } catch {
      toast.error('Failed to add task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    toast.success('Deleted');
    loadData();
  };

  const addMember = async (userId) => {
    await api.post(`/projects/${id}/members`, { userId });
    toast.success('Member added!');
    loadData();
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    toast.success('Member removed');
    loadData();
  };

  const onDrop = async (colKey) => {
    if (!draggingTask || draggingTask.status === colKey) return;
    await api.put(`/tasks/${draggingTask.id}`, { status: colKey });
    setDraggingTask(null);
    loadData();
  };

  if (!data) return <Layout><Loader /></Layout>;

  const tasksByStatus = (status) => data.tasks.filter(t => t.status === status);
  const nonMembers = allUsers.filter(u => !data.members.find(m => m.id === u.id));

  return (
    <Layout>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <Link to="/projects" className="text-sm text-gray-400 hover:text-blue-600 mb-1 block">← Back</Link>
          <h1 className="text-2xl font-bold">{data.project.name}</h1>
          {data.project.description && (
            <p className="text-gray-500 text-sm mt-1">{data.project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
  <button onClick={() => setShowMemberModal(true)}
    className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50">
    + Add Member
  </button>

  <button onClick={() => setShowTaskModal(true)}
    className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700">
    + Add Task
  </button>
</div>
      </div>

      {/* Members row */}
      {data.members.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">MEMBERS:</span>
          {data.members.map(m => (
            <span key={m.id}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              {m.name}
              {isAdmin && (
                <button onClick={() => removeMember(m.id)}
                  className="text-gray-400 hover:text-red-500 ml-1 leading-none font-bold">×</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div key={col.key}
            className={`min-w-[270px] rounded-lg border-2 ${col.color} flex flex-col`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(col.key)}>

            <div className="px-3 py-2 border-b border-inherit flex justify-between items-center">
              <span className="font-semibold text-sm text-gray-700">{col.label}</span>
              <span className="text-xs bg-white border rounded-full px-2 py-0.5 text-gray-500">
                {tasksByStatus(col.key).length}
              </span>
            </div>

            <div className="p-2 flex flex-col gap-2 flex-1 min-h-[120px]">
              {tasksByStatus(col.key).map(task => {
                const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                return (
                  <div key={task.id} draggable
                    onDragStart={() => setDraggingTask(task)}
                    onDragEnd={() => setDraggingTask(null)}
                    className="bg-white rounded border p-3 shadow-sm cursor-grab hover:shadow-md transition">

                    <div className="flex justify-between items-start gap-1 mb-1">
                      <p className="text-sm font-medium leading-snug">{task.title}</p>
                      {isAdmin && (
                        <button onClick={() => deleteTask(task.id)}
                          className="text-gray-300 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-1 mt-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        task.priority === 'high'   ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                     'bg-gray-100 text-gray-500'
                      }`}>{task.priority}</span>

                      {task.assignee_name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {task.assignee_name}
                        </span>
                      )}

                      {task.due_date && (
                        <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                          {new Date(task.due_date).toLocaleDateString()}
                          {overdue && ' ⚠️'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {tasksByStatus(col.key).length === 0 && (
                <p className="text-xs text-gray-300 text-center py-6">Drop tasks here</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="Add Task">
        <form onSubmit={createTask}>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input required value={taskForm.title}
            onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500" />

          <label className="block text-sm font-medium mb-1">Description</label>
          <input value={taskForm.description}
            onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500" />

          <label className="block text-sm font-medium mb-1">Assign to</label>
          <select required value={taskForm.assigned_to}
            onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
            className="w-full border rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select member</option>
            {data.members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select value={taskForm.priority}
                onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input type="date" value={taskForm.due_date}
                onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
            Add Task
          </button>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={showMemberModal} onClose={() => setShowMemberModal(false)} title="Add Member">
        {nonMembers.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">All users are already members.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nonMembers.map(u => (
              <div key={u.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
                </div>
                <button onClick={() => addMember(u.id)}
                  className="text-sm text-blue-600 hover:underline font-medium">Add</button>
              </div>
            ))}
          </div>
        )}
        {data.members.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-400 font-medium mb-2">CURRENT MEMBERS</p>
            <div className="flex flex-wrap gap-2">
              {data.members.map(m => (
                <span key={m.id} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

/* ── MY TASKS ── */
export const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadTasks = async () => {
    const { data } = await api.get('/tasks/mine');
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => { loadTasks(); }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/tasks/${id}`, { status });
    toast.success('Updated!');
    loadTasks();
  };

  const shown = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  if (loading) return <Layout><Loader /></Layout>;

  return (
    <Layout>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {['all', 'pending', 'in_progress', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                filter === f ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress'
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-400">No tasks found.</div>
      ) : (
        <div className="space-y-3">
          {shown.map(t => {
            const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
            return (
              <div key={t.id}
                className={`bg-white border rounded-lg p-4 flex items-center justify-between gap-4 hover:shadow-sm transition ${
                  overdue ? 'border-l-4 border-l-red-400' : ''
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-sm">{t.title}</p>
                    <StatusBadge status={t.status} />
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      t.priority === 'high'   ? 'bg-red-100 text-red-700' :
                      t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                               'bg-gray-100 text-gray-500'
                    }`}>{t.priority}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
                    <span>📁 {t.project_name}</span>
                    {t.due_date && (
                      <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                        📅 {new Date(t.due_date).toLocaleDateString()}
                        {overdue && ' (Overdue)'}
                      </span>
                    )}
                  </div>
                </div>
                <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                  className="border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

/* ── ADMIN PANEL ── */
export const AdminPanel = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, p, t] = await Promise.all([
        api.get('/users'),
        api.get('/projects'),
        api.get('/tasks/all'),
      ]);
      setUsers(u.data);
      setProjects(p.data);
      setTasks(t.data);
    } catch {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user? Their tasks will be unassigned.')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    toast.success('Project deleted');
    loadAll();
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    toast.success('Task deleted');
    loadAll();
  };

  const updateTaskStatus = async (id, status) => {
    await api.put(`/tasks/${id}`, { status });
    loadAll();
  };

  if (loading) return <Layout><Loader /></Layout>;

  const tabs = [
    { key: 'users',    label: `Users (${users.length})` },
    { key: 'projects', label: `Projects (${projects.length})` },
    { key: 'tasks',    label: `All Tasks (${tasks.length})` },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-1">Admin Panel</h1>
      <p className="text-gray-500 text-sm mb-6">Manage all users, projects and tasks</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-indigo-600">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500 mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-blue-600">{projects.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
          <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
          <p className="text-3xl font-bold text-green-600">{tasks.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              tab === t.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* USERS */}
      {tab === 'users' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {u.name}
                    {u.id === user?.id && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.id !== user?.id ? (
                      <button onClick={() => deleteUser(u.id)}
                        className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PROJECTS */}
      {tab === 'projects' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Project Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/projects/${p.id}`} className="hover:text-blue-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteProject(p.id)}
                      className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ALL TASKS */}
      {tab === 'tasks' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => {
                const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
                return (
                  <tr key={t.id} className={`border-b last:border-0 hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3 text-gray-500">{t.project_name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.assignee_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        t.priority === 'high'   ? 'bg-red-100 text-red-700' :
                        t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-500'
                      }`}>{t.priority}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                      {overdue && ' ⚠️'}
                    </td>
                    <td className="px-4 py-3">
                      <select value={t.status}
                        onChange={e => updateTaskStatus(t.id, e.target.value)}
                        className="border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white">
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteTask(t.id)}
                        className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};