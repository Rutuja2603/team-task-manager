# Team Task Manager

A full-stack Team Task Management web application built using React, Node.js, Express, and PostgreSQL with role-based authentication and task management functionality.

---

# Live Demo

## Frontend (Netlify)
https://your-netlify-url.netlify.app

## Backend (Render)
https://team-task-manager-backend-r1u1.onrender.com/

---

# Features

## User Features
- User Registration & Login
- JWT Authentication
- Create Tasks
- Update Tasks
- Delete Tasks
- Task Status Management
- Priority-based Tasks

---

## Admin Features
- Secure Admin Dashboard Access
- View All Users
- Monitor User Activities
- Platform Statistics
- Role-Based Access Control

---

# Tech Stack

## Frontend
- React.js
- Vite
- Axios
- CSS

## Backend
- Node.js
- Express.js
- JWT Authentication
- bcrypt.js

## Database
- PostgreSQL

---

# Deployment

- Frontend: Netlify
- Backend: Render
- Database: Render PostgreSQL

---

# Project Structure

team-task-manager/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── config/
│   ├── db.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env
│   ├── vite.config.js
│   └── package.json
│
└── README.md

---

# Environment Variables

## Backend (.env)

```env
PORT=5000
DATABASE_URL=your_postgresql_database_url
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

## Frontend (.env)

```env
VITE_API_URL=https://team-task-manager-backend-r1u1.onrender.com/api
```

---

# Installation & Setup

## Clone Repository

```bash
git clone https://github.com/Rutuja2603/team-task-manager.git
cd team-task-manager
```

---

# Backend Setup

```bash
cd backend
npm install
npm start
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# API Endpoints

## Authentication

### Register User
```http
POST /api/auth/signup
```

### Login User
```http
POST /api/auth/login
```

---

# Task APIs

### Get Tasks
```http
GET /api/tasks
```

### Create Task
```http
POST /api/tasks
```

### Update Task
```http
PUT /api/tasks/:id
```

### Delete Task
```http
DELETE /api/tasks/:id
```

---

# Database Tables

## Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user'
);
```

## Tasks Table

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20),
  status VARCHAR(20),
  user_id INTEGER REFERENCES users(id)
);
```

---

# Deployment Steps

## Backend Deployment
1. Deploy backend on Render
2. Add environment variables
3. Connect PostgreSQL database
4. Deploy server

## Frontend Deployment
1. Deploy frontend on Netlify
2. Add `VITE_API_URL`
3. Connect frontend with backend
4. Redeploy frontend

---

# Security Features

- JWT Authentication
- Password Hashing using bcrypt
- Protected Routes
- Role-Based Authorization
- Admin Access Control

---

# Author

Rutuja Mane

---

# License

This project is developed for educational and learning purposes.
