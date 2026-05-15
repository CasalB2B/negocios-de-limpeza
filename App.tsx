import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { DataProvider } from './components/DataContext';
import { PrivateRoute } from './components/PrivateRoute'; // Importação do componente de proteção
import { UserRole } from './types';

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
import { AdminQuotes } from './pages/admin/AdminQuotes';
import { AdminWhatsApp } from './pages/admin/AdminWhatsApp';
import { AdminCRM } from './pages/admin/AdminCRM';
import { AdminInbox } from './pages/admin/AdminInbox';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { QuoteChat } from './pages/client/QuoteChat';
import { PWAManager } from './components/PWAManager';
import { RHProvider } from './components/RHContext';
import { AdminRHDashboard } from './pages/admin/rh/AdminRHDashboard';
import { AdminRHColaboradoras } from './pages/admin/rh/AdminRHColaboradoras';
import { AdminRHDesempenho } from './pages/admin/rh/AdminRHDesempenho';
import { AdminRHBonus } from './pages/admin/rh/AdminRHBonus';
import { AdminRHPromocoes } from './pages/admin/rh/AdminRHPromocoes';
import { AdminRHConfiguracoes } from './pages/admin/rh/AdminRHConfiguracoes';
import { AdminRHAvaliacoes } from './pages/admin/rh/AdminRHAvaliacoes';
import { AvaliacaoPage } from './pages/AvaliacaoPage';

// ── Troca o manifest dinamicamente conforme a rota ────────────────────────────
function ManifestSwitcher() {
  React.useEffect(() => {
    const update = () => {
      const isAdmin = window.location.hash.startsWith('#/admin');
      const manifest = isAdmin ? '/manifest-admin.json' : '/manifest.json';
      let tag = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (!tag) { tag = document.createElement('link'); tag.rel = 'manifest'; document.head.appendChild(tag); }
      if (tag.href !== manifest) tag.setAttribute('href', manifest);
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return null;
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DataProvider>
      <RHProvider>
        {/* PWA: manifest dinâmico + install prompt + notifications */}
        <ManifestSwitcher />
        <PWAManager />
        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<CentralAccess />} />
            <Route path="/client/login" element={<ClientLogin />} />
            <Route path="/collab/login" element={<CollaboratorLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Avaliação pública — sem login */}
            <Route path="/avaliar" element={<AvaliacaoPage />} />

            {/* Rota pública para fazer orçamento (pode ser acessada sem login, mas exige no final) */}
            <Route path="/client/new-request" element={<ClientRequest />} />
            {/* Chat de orçamento com IA - rota pública */}
            <Route path="/client/quote-chat" element={<QuoteChat />} />

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
              <Route path="/admin/quotes" element={<AdminQuotes />} />
              <Route path="/admin/crm" element={<AdminCRM />} />
              <Route path="/admin/crm/campanhas" element={<AdminCRM />} />
              <Route path="/admin/crm/historico" element={<AdminCRM />} />
              <Route path="/admin/inbox" element={<AdminInbox />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
              <Route path="/admin/rh" element={<AdminRHDashboard />} />
              <Route path="/admin/rh/colaboradoras" element={<AdminRHColaboradoras />} />
              <Route path="/admin/rh/desempenho" element={<AdminRHDesempenho />} />
              <Route path="/admin/rh/bonus" element={<AdminRHBonus />} />
              <Route path="/admin/rh/promocoes" element={<AdminRHPromocoes />} />
              <Route path="/admin/rh/configuracoes" element={<AdminRHConfiguracoes />} />
              <Route path="/admin/rh/avaliacoes" element={<AdminRHAvaliacoes />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </RHProvider>
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;