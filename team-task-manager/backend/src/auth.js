const bcrypt = require('bcryptjs');
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