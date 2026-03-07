// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import WelcomePage from './pages/Welcome';
import LoginPage from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import AdminHome from './pages/admin/Home';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import EncoderHome from './pages/encoder/Home';
import EncoderRegistration from './pages/encoder/Registration';
import EncoderReports from './pages/encoder/Reports';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'encoder' }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={user?.role === 'admin' ? '/admin' : '/encoder'} replace />;
  return <>{children}</>;
}

export default function App() {
  useThemeStore(); // initialize theme on mount
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<AdminHome />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Encoder */}
        <Route path="/encoder" element={<ProtectedRoute role="encoder"><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<EncoderHome />} />
          <Route path="register" element={<EncoderRegistration />} />
          <Route path="reports" element={<EncoderReports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}