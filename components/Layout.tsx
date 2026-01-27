import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Home, Calendar, Users, FileText, Settings, LogOut, DollarSign, User, CheckCircle, Menu, X, Plus, HelpCircle, Briefcase, LayoutDashboard, Smile, MapPin, Sparkles, Grid } from 'lucide-react';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { useData } from './DataContext';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export const Layout: React.FC<LayoutProps> = ({ children, role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, currentCollaborator, logoutClient, logoutCollaborator, logoutAdmin } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutClient();
    logoutCollaborator();
    logoutAdmin();
    navigate('/');
  };

  const handleSupportClick = () => {
    const message = encodeURIComponent("Olá, estou precisando de ajuda com a plataforma Negócios de Limpeza.");
    window.open(`https://wa.me/5527999808013?text=${message}`, '_blank');
  };

  // --- LAYOUT DO CLIENTE (HEADER SUPERIOR + BOTTOM NAV) ---
  if (role === UserRole.CLIENT) {
    const navLinks = [
      { label: 'Início', path: '/client/dashboard', icon: <Home size={20} /> },
      { label: 'Agendamentos', path: '/client/appointments', icon: <Calendar size={20} /> },
      { label: 'Endereços', path: '/client/addresses', icon: <MapPin size={20} /> },
      { label: 'Pagamentos', path: '/client/payments', icon: <DollarSign size={20} /> },
    ];

    return (
      <div className="min-h-screen bg-background dark:bg-darkBg flex flex-col font-sans transition-colors duration-300">
        {/* Top Header */}
        <header className="bg-white dark:bg-darkSurface border-b border-gray-200 dark:border-darkBorder sticky top-0 z-50 shadow-sm transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">

            {/* Logo & Nav */}
            <div className="flex items-center gap-12">
              {/* Logo */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/client/dashboard')}
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <CheckCircle size={18} strokeWidth={3} />
                </div>
                <h1 className="font-bold text-darkText dark:text-darkTextPrimary text-lg tracking-tight leading-tight">Negócios de<br className="md:hidden" /> Limpeza</h1>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`text-sm font-bold transition-colors ${location.pathname === link.path
                      ? 'text-primary'
                      : 'text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'
                      }`}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-6">
              <ThemeToggle />

              <button
                onClick={handleSupportClick}
                className="text-sm font-bold text-lightText dark:text-darkTextSecondary hover:text-primary transition-colors flex items-center gap-2"
              >
                <HelpCircle size={18} /> Suporte
              </button>

              <Button
                onClick={() => navigate('/client/new-request')}
                className="rounded-full px-6 py-2.5 h-auto text-sm"
                icon={<Plus size={16} />}
              >
                Novo Agendamento
              </Button>

              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-darkBorder overflow-hidden">
                  <img
                    src={currentUser?.photo || `https://i.pravatar.cc/150?u=${currentUser?.id || 'client'}`}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Dropdown simples de logout */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-darkSurface rounded-xl shadow-xl border border-gray-100 dark:border-darkBorder opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right">
                  <div className="p-2">
                    <button onClick={() => navigate('/client/profile')} className="w-full text-left px-4 py-2 text-sm text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkBorder rounded-lg font-bold flex items-center gap-2">
                      <User size={16} /> Meu Perfil
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-darkBorder my-1"></div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-bold flex items-center gap-2">
                      <LogOut size={16} /> Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-3 md:hidden">
              <ThemeToggle />
              <button
                className="text-darkText dark:text-darkTextPrimary p-2 active:bg-gray-100 dark:active:bg-darkBorder rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 dark:bg-darkSurface/95 backdrop-blur-md border-t border-gray-100 dark:border-darkBorder absolute w-full left-0 top-16 shadow-xl p-4 flex flex-col gap-2 z-[100] animate-in slide-in-from-top-2">
              <div className="mb-2">
                <Button onClick={() => { navigate('/client/new-request'); setMobileMenuOpen(false); }} fullWidth>Novo Agendamento</Button>
              </div>
              <button onClick={() => { navigate('/client/profile'); setMobileMenuOpen(false); }} className="text-darkText dark:text-darkTextPrimary font-bold text-sm p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-darkBorder rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-darkBg flex items-center justify-center"><User size={18} /></div>
                Meu Perfil
              </button>
              <button onClick={handleSupportClick} className="text-darkText dark:text-darkTextPrimary font-bold text-sm p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-darkBorder rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center"><HelpCircle size={18} /></div>
                Suporte WhatsApp
              </button>
              <div className="h-px bg-gray-100 dark:bg-darkBorder my-2"></div>
              <button onClick={handleLogout} className="text-red-500 font-bold text-sm p-4 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center"><LogOut size={18} /></div>
                Sair da conta
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 mb-20 md:mb-0">
          {children}
        </main>

        {/* Bottom Navigation for Client Mobile */}
        <nav className="md:hidden fixed bottom-1 left-1 right-1 bg-white/80 dark:bg-darkSurface/80 backdrop-blur-lg border border-gray-200 dark:border-darkBorder flex justify-around p-2 z-50 rounded-2xl shadow-xl pb-safe">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-full active:scale-95 ${location.pathname === link.path
                ? 'text-primary bg-primary/5'
                : 'text-lightText dark:text-darkTextSecondary'
                }`}
            >
              {link.icon}
              <span className="text-[10px] mt-1 font-bold">{link.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // --- LAYOUT DE ADMIN E COLABORADOR (SIDEBAR) ---
  const getMenuItems = () => {
    switch (role) {
      case UserRole.ADMIN:
        return [
          { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/dashboard' },
          { icon: <FileText size={20} />, label: 'Solicitações', path: '/admin/requests' },
          { icon: <Calendar size={20} />, label: 'Calendário', path: '/admin/calendar' },
          { icon: <Smile size={20} />, label: 'Clientes', path: '/admin/clients' },
          { icon: <Users size={20} />, label: 'Equipe', path: '/admin/collaborators' },
          { icon: <Sparkles size={20} />, label: 'Serviços', path: '/admin/services' }, // Novo Link
          { icon: <DollarSign size={20} />, label: 'Financeiro', path: '/admin/payments' },
          { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
        ];
      case UserRole.COLLABORATOR:
        return [
          { icon: <Calendar size={20} />, label: 'Agenda', path: '/collab/agenda' },
          { icon: <DollarSign size={20} />, label: 'Financeiro', path: '/collab/finance' },
          { icon: <User size={20} />, label: 'Perfil', path: '/collab/profile' },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-darkBg font-sans transition-colors duration-300">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-darkSurface border-r border-gray-200 dark:border-darkBorder transition-colors duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="font-bold text-darkText dark:text-darkTextPrimary leading-tight text-sm">Negócios de<br />Limpeza</h1>
            <p className="text-[10px] text-lightText dark:text-darkTextSecondary">Portal Administrativo</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-colors border-l-4 ${location.pathname === item.path
                ? 'bg-primary/5 dark:bg-primary/10 text-primary font-bold border-primary'
                : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50 dark:hover:bg-darkBorder border-transparent'
                }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-darkBorder">
          <div className="flex justify-between items-center mb-4 px-2">
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-darkBorder flex items-center justify-center overflow-hidden">
              <img
                src={currentCollaborator?.photo || (role === UserRole.ADMIN ? "https://i.pravatar.cc/150?u=admin" : `https://i.pravatar.cc/150?u=${currentCollaborator?.id}`)}
                alt="Perfil"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Ricardo Silva</p>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-xl w-full text-lightText dark:text-darkTextSecondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (Admin/Collab) */}
        <header className="md:hidden bg-white dark:bg-darkSurface border-b border-gray-200 dark:border-darkBorder p-4 flex justify-between items-center z-10 transition-colors duration-300 shadow-sm h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white">
              <CheckCircle size={18} />
            </div>
            <h1 className="font-bold text-sm text-darkText dark:text-darkTextPrimary leading-tight">Negócios de<br />Limpeza</h1>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button onClick={handleLogout} className="text-lightText dark:text-darkTextSecondary p-2 hover:bg-gray-100 rounded-lg">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Nav (Admin/Collab) */}
        <nav className="md:hidden bg-white/80 dark:bg-darkSurface/80 backdrop-blur-lg border border-gray-200 dark:border-darkBorder flex justify-around p-2 fixed bottom-1 left-1 right-1 rounded-2xl z-50 shadow-xl pb-safe">
          {/* Renderiza os primeiros 4 itens normalmente */}
          {menuItems.slice(0, 4).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl w-full transition-all active:scale-95 ${location.pathname === item.path ? 'text-primary bg-primary/5' : 'text-lightText dark:text-darkTextSecondary'
                }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1 font-bold truncate w-full text-center">{item.label}</span>
            </button>
          ))}

          {/* Menu "Mais" se houver mais de 4 itens (Admin) */}
          {menuItems.length > 4 && (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl w-full transition-all active:scale-95 ${mobileMenuOpen ? 'text-primary bg-primary/5' : 'text-lightText dark:text-darkTextSecondary'}`}
            >
              <Grid size={20} />
              <span className="text-[10px] mt-1 font-bold truncate w-full text-center">Mais</span>
            </button>
          )}
        </nav>

        {/* Mobile Full Menu Overlay (Drawer) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute bottom-0 left-0 w-full bg-white dark:bg-darkSurface rounded-t-3xl p-6 shadow-2xl border-t border-gray-100 dark:border-darkBorder animate-in slide-in-from-bottom-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Menu Completo</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-full text-lightText"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-2 group p-2 rounded-xl transition-colors ${location.pathname === item.path ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${location.pathname === item.path ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-50 dark:bg-darkBg text-lightText dark:text-darkTextSecondary group-hover:text-primary group-hover:bg-primary/10'}`}>
                      {item.icon}
                    </div>
                    <span className={`text-[10px] font-bold text-center leading-tight ${location.pathname === item.path ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};