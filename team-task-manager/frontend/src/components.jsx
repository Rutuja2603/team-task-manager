import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/my-tasks', label: 'My Tasks' },
  ];

  // admin gets an extra link
  if (user?.role === 'admin') {
    links.push({ to: '/admin', label: '⚙ Admin Panel' });
  }

  return (
    <aside className="w-56 bg-gray-800 text-white min-h-screen p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-6 text-blue-400">TaskFlow</h1>
      <nav className="flex-1 space-y-1">
        {links.map(l => (
          <Link key={l.to} to={l.to}
            className={`block px-3 py-2 rounded text-sm transition ${
              pathname === l.to
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-600 pt-3 mt-3">
        <p className="text-sm font-semibold">{user?.name}</p>
        <p className="text-xs text-gray-400 capitalize mb-2">{user?.role}</p>
        <button
          onClick={() => { logout(); nav('/login'); }}
          className="text-xs text-red-400 hover:text-red-300">
          Logout
        </button>
      </div>
    </aside>
  );
};

export const Layout = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <main className="flex-1 p-6">{children}</main>
  </div>
);

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Loader = () => (
  <div className="flex justify-center py-20">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

export const StatusBadge = ({ status }) => {
  const colors = {
    pending:     'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed:   'bg-green-100 text-green-800',
  };
  const labels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};