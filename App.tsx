import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { DataProvider } from './components/DataContext';
import { PrivateRoute } from './components/PrivateRoute'; // Importação do componente de proteção
import { UserRole } from './types';

// Pages Imports
import { EntrarPage } from './pages/EntrarPage';
import { VendasPage } from './pages/VendasPage';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientRequest } from './pages/client/ClientRequest';
import { ClientBudget } from './pages/client/ClientBudget';
import { ClientAppointments } from './pages/client/ClientAppointments';
import { ClientAppointmentDetail } from './pages/client/ClientAppointmentDetail';
import { ClientAddresses } from './pages/client/ClientAddresses';
import { ClientPayments } from './pages/client/ClientPayments';
import { ClientProfile } from './pages/client/ClientProfile';
import { CollaboratorAgenda } from './pages/collaborator/CollaboratorAgenda';
import { ServiceDetail } from './pages/collaborator/ServiceDetail';
import { ServiceCheckIn } from './pages/collaborator/ServiceCheckIn';
import { ServiceChecklist } from './pages/collaborator/ServiceChecklist';
import { ServicePhotos } from './pages/collaborator/ServicePhotos';
import { ServiceCheckout } from './pages/collaborator/ServiceCheckout';
import { CollaboratorFinance } from './pages/collaborator/CollaboratorFinance';
import { CollaboratorProfile } from './pages/collaborator/CollaboratorProfile';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRequests } from './pages/admin/AdminRequests';
import { AdminCalendar } from './pages/admin/AdminCalendar';
import { AdminCollaborators } from './pages/admin/AdminCollaborators';
import { AdminClients } from './pages/admin/AdminClients';
import { FinPainel } from './pages/admin/financeiro/FinPainel';
import { FinContas } from './pages/admin/financeiro/FinContas';
import { FinLancamentos } from './pages/admin/financeiro/FinLancamentos';
import { FinCartoes } from './pages/admin/financeiro/FinCartoes';
import { FinCalendario } from './pages/admin/financeiro/FinCalendario';
import { FinRecebimentos } from './pages/admin/financeiro/FinRecebimentos';
import { FinCategorias } from './pages/admin/financeiro/FinCategorias';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminServices } from './pages/admin/AdminServices';
import { AdminQuotes } from './pages/admin/AdminQuotes';
import { AdminWhatsApp } from './pages/admin/AdminWhatsApp';
import { AdminAjudaIA } from './pages/admin/AdminAjudaIA';
import { AdminPlataforma } from './pages/admin/AdminPlataforma';
import { AdminAssinatura } from './pages/admin/AdminAssinatura';
import { AdminCRM } from './pages/admin/AdminCRM';
import { AdminInbox } from './pages/admin/AdminInbox';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { QuoteChat } from './pages/client/QuoteChat';
import { PWAManager } from './components/PWAManager';
import { RHProvider } from './components/RHContext';
import { RHNotificationsWatcher } from './components/RHNotifications';
import { AdminRHDashboard } from './pages/admin/rh/AdminRHDashboard';
import { AdminRHColaboradoras } from './pages/admin/rh/AdminRHColaboradoras';
import { AdminRHDesempenho } from './pages/admin/rh/AdminRHDesempenho';
import { AdminRHBonus } from './pages/admin/rh/AdminRHBonus';
import { AdminRHPromocoes } from './pages/admin/rh/AdminRHPromocoes';
import { AdminRHConfiguracoes } from './pages/admin/rh/AdminRHConfiguracoes';
import { AdminRHAvaliacoes } from './pages/admin/rh/AdminRHAvaliacoes';
import { AdminRHContratacao } from './pages/admin/rh/AdminRHContratacao';
import { AvaliacaoPage } from './pages/AvaliacaoPage';
import { EquipePage } from './pages/EquipePage';
import { AjudaPage } from './pages/AjudaPage';
import { AdminMarketing } from './pages/admin/AdminMarketing';
import { AdminRHPlanoCarreira } from './pages/admin/rh/AdminRHPlanoCarreira';
import { AdminOS } from './pages/admin/AdminOS';
import { AdminEstoque } from './pages/admin/AdminEstoque';
import { AdminNFe } from './pages/admin/AdminNFe';

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
        {/* RH: agenda-based push notifications for ligações/entrevistas */}
        <RHNotificationsWatcher />
        <HashRouter>
          <Routes>
            {/* Public Routes */}
            {/* One login screen for everyone; the old per-role login addresses open it too */}
            <Route path="/" element={<EntrarPage />} />
            <Route path="/criar-conta" element={<EntrarPage />} />
            <Route path="/sistema" element={<VendasPage />} />
            <Route path="/client/login" element={<EntrarPage />} />
            <Route path="/collab/login" element={<EntrarPage />} />
            <Route path="/admin/login" element={<EntrarPage />} />
            
            {/* Avaliação pública — sem login */}
            <Route path="/avaliar" element={<AvaliacaoPage />} />
            {/* Página pública da equipe + avaliações — embeddable */}
            <Route path="/equipe" element={<EquipePage />} />
            <Route path="/ajuda" element={<AjudaPage />} />
            <Route path="/ajuda/:id" element={<AjudaPage />} />

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
              <Route path="/admin/os" element={<AdminOS />} />
              <Route path="/admin/collaborators" element={<AdminCollaborators />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/quotes" element={<AdminQuotes />} />
              <Route path="/admin/crm" element={<AdminCRM />} />
              <Route path="/admin/crm/campanhas" element={<AdminCRM />} />
              <Route path="/admin/crm/historico" element={<AdminCRM />} />
              <Route path="/admin/inbox" element={<AdminInbox />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/payments" element={<Navigate to="/admin/financeiro" replace />} />
              <Route path="/admin/financeiro" element={<FinPainel />} />
              <Route path="/admin/financeiro/contas" element={<FinContas />} />
              <Route path="/admin/financeiro/lancamentos" element={<FinLancamentos />} />
              <Route path="/admin/financeiro/cartoes" element={<FinCartoes />} />
              <Route path="/admin/financeiro/cartoes/:id" element={<FinCartoes />} />
              <Route path="/admin/financeiro/calendario" element={<FinCalendario />} />
              <Route path="/admin/financeiro/recebimentos" element={<FinRecebimentos />} />
              <Route path="/admin/financeiro/categorias" element={<FinCategorias />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/whatsapp" element={<AdminWhatsApp />} />
              <Route path="/admin/ajuda-ia" element={<AdminAjudaIA />} />
              <Route path="/admin/plataforma" element={<AdminPlataforma />} />
              <Route path="/admin/assinatura" element={<AdminAssinatura />} />
              <Route path="/admin/rh" element={<AdminRHDashboard />} />
              <Route path="/admin/rh/colaboradoras" element={<AdminRHColaboradoras />} />
              <Route path="/admin/rh/desempenho" element={<AdminRHDesempenho />} />
              <Route path="/admin/rh/bonus" element={<AdminRHBonus />} />
              <Route path="/admin/rh/promocoes" element={<AdminRHPromocoes />} />
              <Route path="/admin/rh/configuracoes" element={<AdminRHConfiguracoes />} />
              <Route path="/admin/rh/avaliacoes" element={<AdminRHAvaliacoes />} />
              <Route path="/admin/rh/contratacao" element={<AdminRHContratacao />} />
              <Route path="/admin/rh/plano-carreira" element={<AdminRHPlanoCarreira />} />
              <Route path="/admin/marketing" element={<AdminMarketing />} />
              <Route path="/admin/estoque" element={<AdminEstoque />} />
              <Route path="/admin/nfe" element={<AdminNFe />} />
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