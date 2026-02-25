import React, { useState, useEffect } from 'react';
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
import { apiRequest } from './utils/api.js';

export default function App() {
  const [screen, setScreen] = useState('login'); // 'login' | 'signup' | 'forgot' | 'verify' | 'activate' | 'app'
  const [user, setUser]     = useState(null);
  const [initializing, setInitializing] = useState(true);

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
            setScreen('app');
            // Refresh marker
            sessionStorage.setItem('lastActivity', Date.now().toString());
        } catch (err) {
            // Not logged in
        } finally {
            setInitializing(false);
        }

        // Simple path-based routing for verification
        if (window.location.pathname.includes('/verify-email/')) {
            setScreen('verify');
        } else if (window.location.pathname.includes('/faculty/activate/')) {
            setScreen('activate');
        }
    };

    initApp();
  }, []);

  // Inactivity tracking for logical session management
  useEffect(() => {
    if (!user || screen !== 'app') return;

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
  }, [user, screen]);

  // Global navigation helpers
  window._goForgot = () => setScreen('forgot');
  window._goSignup = () => setScreen('signup');
  window._handleLogout = () => handleLogout();

  const handleLogin = (userData) => {
    sessionStorage.setItem('sessionActive', 'true');
    sessionStorage.setItem('lastActivity', Date.now().toString());
    setUser(userData);
    setScreen('app');
  };

  const handleLogout = async () => {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout error:', err);
    }
    sessionStorage.clear();
    setUser(null);
    setScreen('login');
    window.history.pushState({}, '', '/'); // Reset URL
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

  // Auth screens
  if (screen === 'login')    return <LoginPage  onLogin={handleLogin} />;
  if (screen === 'signup')   return <SignupPage  onBack={() => setScreen('login')} />;
  if (screen === 'forgot')   return <ForgotPage  onBack={() => setScreen('login')} />;
  if (screen === 'verify')   return <VerifyEmail onBack={() => setScreen('login')} />;
  if (screen === 'activate') return <FacultyActivation />;

  // Role-based portals
  if (screen === 'app' && user) {
    switch (user.role) {
      case 'student':            return <StudentPortal user={user} onLogout={handleLogout} />;
      case 'internship_office':  return <OfficePortal  user={user} onLogout={handleLogout} />;
      case 'faculty_supervisor': return <FacultyPortal user={user} onLogout={handleLogout} />;
      case 'hod':                return <HODPortal     user={user} onLogout={handleLogout} />;
      default:                   return <StudentPortal user={user} onLogout={handleLogout} />;
    }
  }

  return <LoginPage onLogin={handleLogin} />;
}

