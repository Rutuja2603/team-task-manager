import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './AuthContext';
import { Login, Signup, Dashboard, Projects, ProjectDetails, MyTasks, AdminPanel } from './pages';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          <Route path="/"        element={<Protected><Dashboard /></Protected>} />
          <Route path="/projects"    element={<Protected><Projects /></Protected>} />
          <Route path="/projects/:id" element={<Protected><ProjectDetails /></Protected>} />
          <Route path="/my-tasks"    element={<Protected><MyTasks /></Protected>} />
          <Route path="/admin"       element={<AdminRoute><AdminPanel /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}