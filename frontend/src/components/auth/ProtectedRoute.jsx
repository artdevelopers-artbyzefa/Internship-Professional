import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute component to handle role-based access control.
 * @param {Object} props
 * @param {Object} props.user - The current user object.
 * @param {string[]} [props.allowedRoles] - Roles allowed to access this route.
 * @param {string} [props.redirectTo] - Where to redirect if not authorized.
 */
const ProtectedRoute = ({ user, allowedRoles, redirectTo = "/login" }) => {
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they try to access wrong portal
    const rolePaths = {
      student: '/student',
      internship_office: '/office',
      faculty_supervisor: '/faculty',
      site_supervisor: '/supervisor',
      hod: '/hod'
    };
    return <Navigate to={rolePaths[user.role] || '/'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
