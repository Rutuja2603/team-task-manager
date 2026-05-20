const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./db');
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Home Route
app.get('/', (req, res) => {
  res.send('TaskFlow Backend Running Successfully');
});

// API Routes
app.use('/api', routes);

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('DB init failed:', err);
    process.exit(1);
  });