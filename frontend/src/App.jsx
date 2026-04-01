import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from './utils/api.js';

// ── Eagerly loaded: needed on first paint ───────────────────────────────────
const LoginPage = lazy(() => import('./components/auth/LoginPage.jsx'));
import HomePage from './pages/HomePage.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

const SignupPage          = lazy(() => import('./components/auth/SignupPage.jsx'));
const ForgotPage          = lazy(() => import('./components/auth/ForgotPage.jsx'));
const VerifyEmail         = lazy(() => import('./components/auth/VerifyEmail.jsx'));
const FacultyActivation   = lazy(() => import('./pages/faculty/FacultyActivation.jsx'));
const SupervisorActivation= lazy(() => import('./pages/auth/SupervisorActivation.jsx'));
const ForcePasswordChange = lazy(() => import('./pages/auth/ForcePasswordChange.jsx'));
const StudentPortal       = lazy(() => import('./pages/student/StudentPortal.jsx'));
const OfficePortal        = lazy(() => import('./pages/office/InternshipOfficePortal.jsx'));
const FacultyPortal       = lazy(() => import('./pages/faculty/FacultyPortal.jsx'));
const SupervisorPortal    = lazy(() => import('./pages/supervisor/SupervisorPortal.jsx'));
const HODPortal           = lazy(() => import('./pages/hod/HODPortal.jsx'));

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }} role="status" aria-live="polite">
    <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1e3a8a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <span className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>Loading application...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initApp = async () => {
      // Don't even bother the server if we don't have a token locally
      const token = localStorage.getItem('token');
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const data = await apiRequest('/auth/me', { silent: true });
        if (data && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        // Only clear the token if the server specifically tells us the session is invalid (401/403).
        // For other errors (like 500 or offline), we keep the token so it can be used once recovered.
        if (err.status === 401 || err.status === 403) {
          console.warn('Session expired or invalid. Clearing token.');
          localStorage.removeItem('token');
          setUser(null);
        } else {
          console.error('Session initialization failed:', err.message);
        }
      } finally {
        setInitializing(false);
      }
    };

    initApp();
  }, []);

  const handleLogin = (data) => {
    const { user: userData, token } = data;
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(userData);

    // Redirect based on role
    const rolePaths = {
      student: '/student',
      internship_office: '/office',
      faculty_supervisor: '/faculty',
      site_supervisor: '/supervisor',
      hod: '/hod'
    };
    navigate(rolePaths[userData.role] || '/', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (initializing) {
    return <PageLoader />;
  }

  // Force Password Change Flow
  if (user && user.mustChangePassword) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ForcePasswordChange onComplete={() => setUser({ ...user, mustChangePassword: false })} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={user ? (
          <Navigate to={
            user.role === 'student' ? '/student' :
              user.role === 'internship_office' ? '/office' :
                user.role === 'faculty_supervisor' ? '/faculty' :
                  user.role === 'site_supervisor' ? '/supervisor' : '/hod'
          } replace />
        ) : <HomePage />} />

        {/* Auth Screen Routes */}
        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPage onBack={() => navigate('/login')} />} />
        <Route path="/verify-email/:token" element={<VerifyEmail onBack={() => navigate('/login')} />} />
        <Route path="/faculty/activate/:token" element={<FacultyActivation />} />
        <Route path="/supervisor/activate/:token" element={<SupervisorActivation />} />

        {/* Portal Routes with Protection */}
        <Route element={<ProtectedRoute user={user} allowedRoles={['student']} />}>
          <Route path="/student/*" element={<StudentPortal user={user} onLogout={handleLogout} onUpdateUser={(updated) => setUser({ ...user, ...updated })} />} />
        </Route>

        <Route element={<ProtectedRoute user={user} allowedRoles={['internship_office']} />}>
          <Route path="/office/*" element={<OfficePortal user={user} onLogout={handleLogout} />} />
        </Route>

        <Route element={<ProtectedRoute user={user} allowedRoles={['faculty_supervisor']} />}>
          <Route path="/faculty/*" element={<FacultyPortal user={user} onLogout={handleLogout} />} />
        </Route>

        <Route element={<ProtectedRoute user={user} allowedRoles={['hod']} />}>
          <Route path="/hod/*" element={<HODPortal user={user} onLogout={handleLogout} />} />
        </Route>

        <Route element={<ProtectedRoute user={user} allowedRoles={['site_supervisor']} />}>
          <Route path="/supervisor/*" element={<SupervisorPortal user={user} onLogout={handleLogout} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

