// AUTO-SETUP SCRIPT - Creates entire Team Task Manager project
const fs = require('fs');
const path = require('path');

const root = 'team-task-manager';

// Helper to create files
const write = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('✅ Created:', filePath);
};

console.log('🚀 Creating Team Task Manager project...\n');

// ============ BACKEND FILES ============

write(`${root}/backend/package.json`, JSON.stringify({
  name: "taskflow-backend",
  version: "1.0.0",
  main: "src/server.js",
  scripts: {
    dev: "nodemon src/server.js",
    start: "node src/server.js"
  },
  dependencies: {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  },
  devDependencies: {
    "nodemon": "^3.0.1"
  }
}, null, 2));

write(`${root}/backend/.env.example`, `PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=change_this_to_a_long_random_string_for_security
CLIENT_URL=http://localhost:5173
`);

write(`${root}/backend/.env`, `PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=my_super_secret_jwt_key_12345_change_in_production
CLIENT_URL=http://localhost:5173
`);

write(`${root}/backend/src/db.js`, `const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'member',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      owner_id INT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS project_members (
      project_id INT REFERENCES projects(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium',
      due_date DATE,
      project_id INT REFERENCES projects(id) ON DELETE CASCADE,
      assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
      created_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
  \`);
  console.log('✅ Database ready');
};

module.exports = { pool, initDB };
`);

write(`${root}/backend/src/auth.js`, `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPassword = (pwd) => bcrypt.hash(pwd, 10);
const comparePassword = (pwd, hash) => bcrypt.compare(pwd, hash);

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const authRequired = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access only' });
  next();
};

module.exports = { hashPassword, comparePassword, signToken, authRequired, adminOnly };
`);

write(`${root}/backend/src/routes.js`, `const express = require('express');
const { pool } = require('./db');
const { hashPassword, comparePassword, signToken, authRequired, adminOnly } = require('./auth');

const router = express.Router();

// AUTH ROUTES
router.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(400).json({ error: 'Email already exists' });

    const count = await pool.query('SELECT COUNT(*) FROM users');
    const finalRole = count.rows[0].count === '0' ? 'admin' : (role || 'member');

    const hashed = await hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashed, finalRole]
    );

    const token = signToken(rows[0]);
    res.json({ user: rows[0], token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await comparePassword(password, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: rows[0].role };
    res.json({ user, token: signToken(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/auth/me', authRequired, (req, res) => res.json(req.user));

router.get('/users', authRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, role FROM users ORDER BY name');
  res.json(rows);
});

// PROJECTS
router.get('/projects', authRequired, async (req, res) => {
  const { id, role } = req.user;
  let query, params;
  if (role === 'admin') {
    query = 'SELECT * FROM projects ORDER BY created_at DESC';
    params = [];
  } else {
    query = \`SELECT p.* FROM projects p LEFT JOIN project_members pm ON p.id = pm.project_id 
             WHERE p.owner_id = $1 OR pm.user_id = $1 GROUP BY p.id ORDER BY p.created_at DESC\`;
    params = [id];
  }
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

router.post('/projects', authRequired, adminOnly, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const { rows } = await pool.query(
    'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [name, description || '', req.user.id]
  );
  res.json(rows[0]);
});

router.get('/projects/:id', authRequired, async (req, res) => {
  const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
  if (!project.rows.length) return res.status(404).json({ error: 'Not found' });

  const members = await pool.query(\`SELECT u.id, u.name, u.email, u.role FROM users u
    JOIN project_members pm ON u.id = pm.user_id WHERE pm.project_id = $1\`, [req.params.id]);

  const tasks = await pool.query(\`SELECT t.*, u.name AS assignee_name FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id WHERE t.project_id = $1 ORDER BY t.created_at DESC\`, [req.params.id]);

  res.json({ project: project.rows[0], members: members.rows, tasks: tasks.rows });
});

router.put('/projects/:id', authRequired, adminOnly, async (req, res) => {
  const { name, description } = req.body;
  const { rows } = await pool.query(
    'UPDATE projects SET name=$1, description=$2 WHERE id=$3 RETURNING *',
    [name, description, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/projects/:id', authRequired, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/projects/:id/members', authRequired, adminOnly, async (req, res) => {
  const { userId } = req.body;
  await pool.query(
    'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, userId]
  );
  res.json({ success: true });
});

// TASKS
router.get('/tasks/mine', authRequired, async (req, res) => {
  const { rows } = await pool.query(\`SELECT t.*, p.name AS project_name FROM tasks t
    JOIN projects p ON t.project_id = p.id WHERE t.assigned_to = $1 ORDER BY t.due_date ASC NULLS LAST\`, [req.user.id]);
  res.json(rows);
});

router.post('/tasks', authRequired, adminOnly, async (req, res) => {
  const { title, description, project_id, assigned_to, priority, due_date } = req.body;
  const { rows } = await pool.query(
    \`INSERT INTO tasks (title, description, project_id, assigned_to, priority, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *\`,
    [title, description, project_id, assigned_to, priority || 'medium', due_date || null, req.user.id]
  );
  res.json(rows[0]);
});

router.put('/tasks/:id', authRequired, async (req, res) => {
  const { status, title, description, priority, due_date, assigned_to } = req.body;
  const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (!task.rows.length) return res.status(404).json({ error: 'Not found' });

  if (req.user.role !== 'admin') {
    if (task.rows[0].assigned_to !== req.user.id)
      return res.status(403).json({ error: 'Not your task' });
    const { rows } = await pool.query('UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    return res.json(rows[0]);
  }

  const { rows } = await pool.query(
    \`UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description),
     status=COALESCE($3,status), priority=COALESCE($4,priority),
     due_date=COALESCE($5,due_date), assigned_to=COALESCE($6,assigned_to)
     WHERE id=$7 RETURNING *\`,
    [title, description, status, priority, due_date, assigned_to, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/tasks/:id', authRequired, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.get('/stats', authRequired, async (req, res) => {
  const { id, role } = req.user;
  const filter = role === 'admin' ? '' : \`WHERE assigned_to = \${id}\`;
  const total = await pool.query(\`SELECT COUNT(*) FROM tasks \${filter}\`);
  const completed = await pool.query(\`SELECT COUNT(*) FROM tasks \${filter ? filter + ' AND' : 'WHERE'} status='completed'\`);
  const pending = await pool.query(\`SELECT COUNT(*) FROM tasks \${filter ? filter + ' AND' : 'WHERE'} status='pending'\`);
  const inProgress = await pool.query(\`SELECT COUNT(*) FROM tasks \${filter ? filter + ' AND' : 'WHERE'} status='in_progress'\`);
  const overdue = await pool.query(\`SELECT COUNT(*) FROM tasks \${filter ? filter + ' AND' : 'WHERE'} due_date < CURRENT_DATE AND status != 'completed'\`);

  res.json({
    total: +total.rows[0].count,
    completed: +completed.rows[0].count,
    pending: +pending.rows[0].count,
    inProgress: +inProgress.rows[0].count,
    overdue: +overdue.rows[0].count
  });
});

module.exports = router;
`);

write(`${root}/backend/src/server.js`, `const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./db');
const routes = require('./routes');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

app.get('/', (_, res) => res.json({ message: 'Task Manager API running 🚀' }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
initDB()
  .then(() => app.listen(PORT, () => console.log(\`🚀 Server on port \${PORT}\`)))
  .catch(err => { console.error('DB init failed', err); process.exit(1); });
`);

// ============ FRONTEND FILES ============

write(`${root}/frontend/package.json`, JSON.stringify({
  name: "taskflow-frontend",
  private: true,
  version: "1.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview",
    start: "vite preview --port $PORT --host 0.0.0.0"
  },
  dependencies: {
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.20.0",
    "recharts": "^2.10.0"
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.0"
  }
}, null, 2));

write(`${root}/frontend/.env.example`, `VITE_API_URL=http://localhost:5000/api\n`);
write(`${root}/frontend/.env`, `VITE_API_URL=http://localhost:5000/api\n`);

write(`${root}/frontend/vite.config.js`, `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});
`);

write(`${root}/frontend/tailwind.config.js`, `export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: []
};
`);

write(`${root}/frontend/postcss.config.js`, `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
`);

write(`${root}/frontend/index.html`, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TaskFlow - Team Task Manager</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`);

write(`${root}/frontend/src/index.css`, `@tailwind base;
@tailwind components;
@tailwind utilities;

body { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; }
.fade-in { animation: fade 0.3s ease-in; }
@keyframes fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
`);

write(`${root}/frontend/src/main.jsx`, `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
`);

write(`${root}/frontend/src/api.js`, `import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
`);

write(`${root}/frontend/src/AuthContext.jsx`, `import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
`);

// I'll add components.jsx, pages.jsx and App.jsx in a continuation file
// Due to length, splitting into helper files
console.log('\n📝 Creating frontend UI files...');

const componentsCode = `import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const links = [
    { to: '/', label: '📊 Dashboard' },
    { to: '/projects', label: '📁 Projects' },
    { to: '/my-tasks', label: '✅ My Tasks' }
  ];
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-5 flex flex-col">
      <h1 className="text-2xl font-bold mb-8 text-indigo-600">TaskFlow</h1>
      <nav className="flex-1 space-y-1">
        {links.map(l => (
          <Link key={l.to} to={l.to}
            className={\`block px-4 py-2.5 rounded-lg transition \${pathname === l.to ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}\`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="border-t pt-4">
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-xs text-gray-500 mb-3 capitalize">{user?.role}</p>
        <button onClick={() => { logout(); nav('/login'); }} className="text-sm text-red-600 hover:underline">Logout</button>
      </div>
    </aside>
  );
};

export const Layout = ({ children }) => (
  <div className="flex"><Sidebar /><main className="flex-1 p-8 fade-in">{children}</main></div>
);

export const StatCard = ({ label, value, color = 'indigo', icon }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <h2 className={\`text-3xl font-bold mt-2 text-\${color}-600\`}>{value}</h2>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

export const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>}
    <input {...props} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
  </div>
);

export const Button = ({ children, variant = 'primary', ...props }) => {
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
  };
  return <button {...props} className={\`px-4 py-2 rounded-lg font-medium transition \${styles[variant]} \${props.className || ''}\`}>{children}</button>;
};

export const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800'
  };
  return <span className={\`px-2.5 py-1 rounded-full text-xs font-medium \${styles[status] || 'bg-gray-100'}\`}>{status?.replace('_', ' ')}</span>;
};

export const PriorityBadge = ({ priority }) => {
  const colors = { low: 'text-gray-600', medium: 'text-orange-600', high: 'text-red-600' };
  return <span className={\`text-xs font-semibold \${colors[priority]}\`}>● {priority}</span>;
};

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 fade-in">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Loader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);
`;

write(`${root}/frontend/src/components.jsx`, componentsCode);

console.log('\n⚠️  Due to size limits, please copy pages.jsx and App.jsx manually from the chat.');
console.log('\n✅ Project structure created successfully!');
console.log('\n📋 NEXT STEPS:');
console.log('1. cd team-task-manager/backend && npm install');
console.log('2. cd ../frontend && npm install');
console.log('3. Copy pages.jsx and App.jsx from the chat');
console.log('4. Update backend/.env with your PostgreSQL URL');
console.log('5. Run: npm run dev (in both folders)');