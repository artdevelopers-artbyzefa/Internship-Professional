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

  const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    const initApp = async () => {
      const lastActivity = sessionStorage.getItem('lastActivity');
      const sessionActive = sessionStorage.getItem('sessionActive');
      const now = Date.now();

      // Check if session has timed out in this tab
      if (lastActivity && (now - parseInt(lastActivity) > INACTIVITY_LIMIT)) {
        sessionStorage.clear();
        setInitializing(false);
        return;
      }

      // If no session marker in this tab, we force a fresh login (Close Tab requirement)
      if (!sessionActive) {
        setInitializing(false);
        return;
      }

      try {
        const data = await apiRequest('/auth/me');
        setUser(data.user);

        // Refresh marker
        sessionStorage.setItem('lastActivity', Date.now().toString());
      } catch (err) {
        // Not logged in
      } finally {
        setInitializing(false);
      }
    };

    initApp();
  }, []);

  // Inactivity tracking for logical session management
  useEffect(() => {
    if (!user) return;

    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      sessionStorage.setItem('lastActivity', Date.now().toString());

      timer = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(timer);
    };
  }, [user]);

  // Global navigation helpers for backward compatibility if needed by legacy components
  window._handleLogout = () => handleLogout();
  window._goSignup = () => navigate('/signup');
  window._goForgot = () => navigate('/forgot-password');

  const handleLogin = (userData) => {
    sessionStorage.setItem('sessionActive', 'true');
    sessionStorage.setItem('lastActivity', Date.now().toString());
    setUser(userData);

    // Redirect based on role
    const rolePaths = {
      student: '/student',
      internship_office: '/office',
      faculty_supervisor: '/faculty',
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
    sessionStorage.clear();
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
            user.role === 'faculty_supervisor' ? '/faculty' : '/hod'
      ) : '/login'} replace />} />

      {/* Auth Screen Routes */}
      <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<ForgotPage onBack={() => navigate('/login')} />} />
      <Route path="/verify-email/:token" element={<VerifyEmail onBack={() => navigate('/login')} />} />
      <Route path="/faculty/activate/:token" element={<FacultyActivation />} />

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

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

