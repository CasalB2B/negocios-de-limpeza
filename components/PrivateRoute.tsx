import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../types';
import { toast } from 'react-toastify';

interface PrivateRouteProps {
  role: UserRole;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ role }) => {
  const { role: userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && userRole !== role) {
      if (!userRole) {
        toast.info('Sessão expirada ou não autorizado. Faça login.');
      } else {
        toast.error('Acesso restrito. Você não tem permissão para acessar esta área.');
      }
    }
  }, [role, userRole, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return userRole === role ? <Outlet /> : <Navigate to="/" replace />;
};