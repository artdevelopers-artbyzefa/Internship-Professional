import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage.jsx';
import SignupPage from './components/auth/SignupPage.jsx';
import ForgotPage from './components/auth/ForgotPage.jsx';
import VerifyEmail from './components/auth/VerifyEmail.jsx';
import StudentPortal from './pages/student/StudentPortal.jsx';
import OfficePortal from './pages/office/InternshipOfficePortal.jsx';
import FacultyPortal from './pages/faculty/FacultyPortal.jsx';
import FacultyActivation from './pages/faculty/FacultyActivation.jsx';
import SupervisorActivation from './pages/auth/SupervisorActivation.jsx';
import SupervisorPortal from './pages/supervisor/SupervisorPortal.jsx';
import HODPortal from './pages/hod/HODPortal.jsx';
import ForcePasswordChange from './pages/auth/ForcePasswordChange.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import NotFound from './pages/error/NotFound.jsx';
import { apiRequest } from './utils/api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Check if there's a valid session on the server via cookie
        const data = await apiRequest('/auth/me');
        if (data && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        // Not logged in or token expired - silent fail is fine
      } finally {
        setInitializing(false);
      }
    };

    initApp();
  }, []);

  const handleLogin = (userData) => {
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
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-gray-500 font-medium">Loading DIMS...</p>
        </div>
      </div>
    );
  }

  // Force Password Change Flow
  if (user && user.mustChangePassword) {
    return <ForcePasswordChange onComplete={() => setUser({ ...user, mustChangePassword: false })} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? (
        user.role === 'student' ? '/student' :
          user.role === 'internship_office' ? '/office' :
            user.role === 'faculty_supervisor' ? '/faculty' :
              user.role === 'site_supervisor' ? '/supervisor' : '/hod'
      ) : '/login'} replace />} />

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

      {/* Fallback - Redirect to home which handles role-based routing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

