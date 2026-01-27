import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { AuthProvider } from './components/AuthContext';
import { DataProvider } from './components/DataContext';
import { PrivateRoute } from './components/PrivateRoute'; // Importação do componente de proteção
import { UserRole } from './types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages Imports
import { CentralAccess } from './pages/CentralAccess';
import { ClientLogin } from './pages/client/ClientLogin';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientRequest } from './pages/client/ClientRequest';
import { ClientBudget } from './pages/client/ClientBudget';
import { ClientAppointments } from './pages/client/ClientAppointments';
import { ClientAppointmentDetail } from './pages/client/ClientAppointmentDetail';
import { ClientAddresses } from './pages/client/ClientAddresses';
import { ClientPayments } from './pages/client/ClientPayments';
import { ClientProfile } from './pages/client/ClientProfile';
import { CollaboratorLogin } from './pages/collaborator/CollaboratorLogin';
import { CollaboratorAgenda } from './pages/collaborator/CollaboratorAgenda';
import { ServiceDetail } from './pages/collaborator/ServiceDetail';
import { ServiceCheckIn } from './pages/collaborator/ServiceCheckIn';
import { ServiceChecklist } from './pages/collaborator/ServiceChecklist';
import { ServicePhotos } from './pages/collaborator/ServicePhotos';
import { ServiceCheckout } from './pages/collaborator/ServiceCheckout';
import { CollaboratorFinance } from './pages/collaborator/CollaboratorFinance';
import { CollaboratorProfile } from './pages/collaborator/CollaboratorProfile';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRequests } from './pages/admin/AdminRequests';
import { AdminCalendar } from './pages/admin/AdminCalendar';
import { AdminCollaborators } from './pages/admin/AdminCollaborators';
import { AdminClients } from './pages/admin/AdminClients';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminServices } from './pages/admin/AdminServices';
import { AdminServicePhotos } from './pages/admin/AdminServicePhotos';
import { PasswordRecovery } from './pages/PasswordRecovery';

const App: React.FC = () => {
  React.useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Rejection:', event.reason);
      toast.error('Erro de conexão ou falha no processamento. Tente novamente.');
    };

    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <HashRouter>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<CentralAccess />} />
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/collab/login" element={<CollaboratorLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/password-recovery" element={<PasswordRecovery />} />

              {/* Rota pública para fazer orçamento (pode ser acessada sem login, mas exige no final) */}
              <Route path="/client/new-request" element={<ClientRequest />} />

              {/* Protected Client Routes */}
              <Route element={<PrivateRoute role={UserRole.CLIENT} />}>
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/addresses" element={<ClientAddresses />} />
                <Route path="/client/profile" element={<ClientProfile />} />
                <Route path="/client/appointments" element={<ClientAppointments />} />
                <Route path="/client/appointments/:id" element={<ClientAppointmentDetail />} />
                <Route path="/client/budget/:id" element={<ClientBudget />} />
                <Route path="/client/payments" element={<ClientPayments />} />
              </Route>

              {/* Protected Collaborator Routes */}
              <Route element={<PrivateRoute role={UserRole.COLLABORATOR} />}>
                <Route path="/collab/agenda" element={<CollaboratorAgenda />} />
                <Route path="/collab/service/:id/detail" element={<ServiceDetail />} />
                <Route path="/collab/service/:id/checkin" element={<ServiceCheckIn />} />
                <Route path="/collab/service/:id/checklist" element={<ServiceChecklist />} />
                <Route path="/collab/service/:id/photos" element={<ServicePhotos />} />
                <Route path="/collab/service/:id/checkout" element={<ServiceCheckout />} />
                <Route path="/collab/finance" element={<CollaboratorFinance />} />
                <Route path="/collab/profile" element={<CollaboratorProfile />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<PrivateRoute role={UserRole.ADMIN} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/requests" element={<AdminRequests />} />
                <Route path="/admin/calendar" element={<AdminCalendar />} />
                <Route path="/admin/collaborators" element={<AdminCollaborators />} />
                <Route path="/admin/clients" element={<AdminClients />} />
                <Route path="/admin/services" element={<AdminServices />} />
                <Route path="/admin/payments" element={<AdminPayments />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/service-photos/:id" element={<AdminServicePhotos />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;