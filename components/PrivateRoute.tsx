import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useData } from './DataContext';
import { UserRole } from '../types';

interface PrivateRouteProps {
  role: UserRole;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ role }) => {
  const { currentUser, currentCollaborator, adminLoggedIn } = useData();

  if (role === UserRole.CLIENT) {
    return currentUser ? <Outlet /> : <Navigate to="/client/login" replace />;
  }

  if (role === UserRole.COLLABORATOR) {
    return currentCollaborator ? <Outlet /> : <Navigate to="/collab/login" replace />;
  }

  if (role === UserRole.ADMIN) {
    return adminLoggedIn ? <Outlet /> : <Navigate to="/admin/login" replace />;
  }

  return <Navigate to="/" replace />;
};