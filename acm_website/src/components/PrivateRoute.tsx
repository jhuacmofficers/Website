import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface PrivateRouteProps {
  message?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ message }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ message, from: location }} replace />
  );
};

export default PrivateRoute;
