// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import WelcomePage from './pages/Welcome';
import LoginPage from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import AdminHome from './pages/admin/Home';
import UserManagement from './pages/admin/Settings/UserManagement';
import BackupRestore from './pages/admin/Settings/Backup&Restore';
import AuditTrail from './pages/admin/Settings/AuditTrail';
import EncoderHome from './pages/encoder/Home';
import Applicants from './pages/shared/Applicants';
import Courses from './pages/shared/Courses';
import Reports from './pages/shared/Reports';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'encoder' }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role)
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/encoder'} replace />;
  return <>{children}</>;
}

export default function App() {
  useThemeStore();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="applicants"     element={<Applicants />} />
          <Route path="applicants/:id" element={<Applicants />} />
          <Route path="courses"        element={<Courses />} />
          <Route path="reports"        element={<Reports />} />
          <Route path="users"          element={<UserManagement />} />
          <Route path="audit"          element={<AuditTrail />} />
          <Route path="backup"         element={<BackupRestore />} />
        </Route>

        {/* Encoder */}
        <Route
          path="/encoder"
          element={
            <ProtectedRoute role="encoder">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EncoderHome />} />
          <Route path="applicants"     element={<Applicants />} />
          <Route path="applicants/:id" element={<Applicants />} />
          <Route path="courses"        element={<Courses />} />
          <Route path="reports"        element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}