import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useData } from './DataContext';
import { UserRole } from '../types';

interface PrivateRouteProps {
  role: UserRole;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ role }) => {
  const { currentUser, currentCollaborator, adminLoggedIn, reviewerMode } = useData();
  const location = useLocation();

  if (role === UserRole.CLIENT) {
    return currentUser ? <Outlet /> : <Navigate to="/client/login" replace />;
  }

  if (role === UserRole.COLLABORATOR) {
    return currentCollaborator ? <Outlet /> : <Navigate to="/collab/login" replace />;
  }

  if (role === UserRole.ADMIN) {
    if (!adminLoggedIn) return <Navigate to="/admin/login" replace />;
    // Revisor (análise da Meta) só acessa a tela do WhatsApp.
    if (reviewerMode && location.pathname !== '/admin/whatsapp') return <Navigate to="/admin/whatsapp" replace />;
    return <Outlet />;
  }

  return <Navigate to="/entrar" replace />;
};