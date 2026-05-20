const express = require('express');
const { pool } = require('./db');
const {
  hashPassword, comparePassword, signToken,
  authRequired, adminOnly
} = require('./auth');

const router = express.Router();

/* ============ AUTH ============ */

router.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    // block anyone from registering with the admin email
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskflow.com';
    if (email.toLowerCase() === adminEmail.toLowerCase())
      return res.status(400).json({ error: 'This email is reserved' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length)
      return res.status(400).json({ error: 'Email already exists' });

    // everyone who signs up is always a member
    const hashed = await hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashed, 'member']
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length)
      return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await comparePassword(password, rows[0].password);
    if (!ok)
      return res.status(400).json({ error: 'Invalid credentials' });

    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: rows[0].role };
    res.json({ user, token: signToken(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/auth/me', authRequired, (req, res) => res.json(req.user));

/* ============ USERS ============ */

router.get('/users', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC'
  );
  res.json(rows);
});

// admin can delete a user (cannot delete themselves)
router.delete('/users/:id', authRequired, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Cannot delete yourself' });
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

/* ============ PROJECTS ============ */

router.get('/projects', authRequired, async (req, res) => {
  const { id, role } = req.user;
  let query, params;

  if (role === 'admin') {
    query = 'SELECT * FROM projects ORDER BY created_at DESC';
    params = [];
  } else {
    query = `
      SELECT p.* FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = $1 OR pm.user_id = $1
      GROUP BY p.id ORDER BY p.created_at DESC
    `;
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

  const members = await pool.query(`
    SELECT u.id, u.name, u.email, u.role FROM users u
    JOIN project_members pm ON u.id = pm.user_id
    WHERE pm.project_id = $1
  `, [req.params.id]);

  const tasks = await pool.query(`
    SELECT t.*, u.name AS assignee_name FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.project_id = $1 ORDER BY t.created_at DESC
  `, [req.params.id]);

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

router.delete('/projects/:id/members/:userId', authRequired, adminOnly, async (req, res) => {
  await pool.query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
    [req.params.id, req.params.userId]
  );
  res.json({ success: true });
});

/* ============ TASKS ============ */

router.get('/tasks/mine', authRequired, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, p.name AS project_name FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.assigned_to = $1 ORDER BY t.due_date ASC NULLS LAST
  `, [req.user.id]);
  res.json(rows);
});

router.get('/tasks/all', authRequired, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, p.name AS project_name, u.name AS assignee_name FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assigned_to = u.id
    ORDER BY t.created_at DESC
  `);
  res.json(rows);
});

router.post('/tasks', authRequired, adminOnly, async (req, res) => {
  const { title, description, project_id, assigned_to, priority, due_date } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, project_id, assigned_to, priority, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
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
    const { rows } = await pool.query(
      'UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    return res.json(rows[0]);
  }

  const { rows } = await pool.query(
    `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description),
     status=COALESCE($3,status), priority=COALESCE($4,priority),
     due_date=COALESCE($5,due_date), assigned_to=COALESCE($6,assigned_to)
     WHERE id=$7 RETURNING *`,
    [title, description, status, priority, due_date, assigned_to, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/tasks/:id', authRequired, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

/* ============ STATS ============ */

router.get('/stats', authRequired, async (req, res) => {
  const { id, role } = req.user;
  const filter = role === 'admin' ? '' : `WHERE assigned_to = ${id}`;

  const total      = await pool.query(`SELECT COUNT(*) FROM tasks ${filter}`);
  const completed  = await pool.query(`SELECT COUNT(*) FROM tasks ${filter ? filter + ' AND' : 'WHERE'} status='completed'`);
  const pending    = await pool.query(`SELECT COUNT(*) FROM tasks ${filter ? filter + ' AND' : 'WHERE'} status='pending'`);
  const inProgress = await pool.query(`SELECT COUNT(*) FROM tasks ${filter ? filter + ' AND' : 'WHERE'} status='in_progress'`);
  const overdue    = await pool.query(`SELECT COUNT(*) FROM tasks ${filter ? filter + ' AND' : 'WHERE'} due_date < CURRENT_DATE AND status != 'completed'`);
  const projects   = await pool.query(`SELECT COUNT(*) FROM projects`);
  const users      = await pool.query(`SELECT COUNT(*) FROM users`);

  res.json({
    total:      +total.rows[0].count,
    completed:  +completed.rows[0].count,
    pending:    +pending.rows[0].count,
    inProgress: +inProgress.rows[0].count,
    overdue:    +overdue.rows[0].count,
    projects:   +projects.rows[0].count,
    users:      +users.rows[0].count,
  });
});

module.exports = router;