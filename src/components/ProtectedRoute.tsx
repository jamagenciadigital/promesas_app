import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    // No está autenticado
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Bloquear acceso si el email no está verificado
  if (!user.email_confirmed_at) {
    return <Navigate to="/login" state={{ 
      error: 'Debes confirmar tu correo electrónico antes de acceder al sistema. Por favor, revisa tu bandeja de entrada.' 
    }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.rol)) {
    // Autenticado pero rol no permitido, redirigir a su área
    switch (profile.rol) {
      case 'superadmin':
        return <Navigate to="/superadmin" replace />;
      case 'escenario_deportivo':
      case 'admin_escenario':
        return <Navigate to="/escenario" replace />;
      case 'admin_club':
        return <Navigate to="/club" replace />;
      case 'admin_equipo':
        return <Navigate to="/coordinator" replace />;
      case 'padre':
        return <Navigate to="/player" replace />;
      case 'cartera':
        return <Navigate to="/finance-admin" replace />;
      case 'entrenador':
        return <Navigate to="/coach" replace />;
      case 'jefatura':
        return <Navigate to="/jefatura" replace />;
      case 'liga':
        return <Navigate to="/liga" replace />;
      default:
        // En lugar de bucle infinito, volvemos a login con error
        console.error("Acceso denegado: Rol no configurado", profile.rol);
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};
