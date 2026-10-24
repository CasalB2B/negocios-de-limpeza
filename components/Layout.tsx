import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Home, Calendar, Users, FileText, Settings, LogOut, DollarSign, User, CheckCircle, Menu, X, HelpCircle, Briefcase, LayoutDashboard, Smile, MapPin, Sparkles, Grid, MessageSquare, MessageCircle, Kanban, Inbox, BarChart2, UserCog, Megaphone, UserPlus, BookOpen, ChevronDown, ChevronRight, Eye, Package, Contact } from 'lucide-react';
import { GeminiChat } from './GeminiChat';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';
import { useData } from './DataContext';
import { supabase } from '../lib/supabase';
import { startCollabPreview, startClientPreview, getClientPreview, exitPreviewToAdmin, type PreviewCollab, type PreviewClient } from '../lib/adminPreview';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export const Layout: React.FC<LayoutProps> = ({ children, role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewCollabs, setPreviewCollabs] = useState<PreviewCollab[]>([]);
  const [loadingPreviewCollabs, setLoadingPreviewCollabs] = useState(false);
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [clientPreviewList, setClientPreviewList] = useState<PreviewClient[]>([]);
  const [loadingClientList, setLoadingClientList] = useState(false);
  const { currentUser, logoutClient, logoutCollaborator, logoutAdmin, platformSettings, isRefreshing } = useData();
  const mainRef = useRef<HTMLElement>(null);

  // Reset scroll to top on every route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  const handleLogout = () => {
    if (role === UserRole.ADMIN) logoutAdmin();
    else if (role === UserRole.COLLABORATOR) logoutCollaborator();
    else logoutClient();
    navigate('/');
  };

  const openPreviewPanel = async () => {
    const next = !showPreviewPanel;
    setShowPreviewPanel(next);
    if (next) {
      setLoadingPreviewCollabs(true);
      const { data } = await supabase.from('colaboradoras_rh').select('id, nome, foto').eq('status', 'ATIVA').order('nome');
      setPreviewCollabs((data as PreviewCollab[]) ?? []);
      setLoadingPreviewCollabs(false);
    }
  };

  const avisarFalhaPreview = () =>
    window.alert('Não foi possível abrir a visualização: o armazenamento do navegador está cheio. Feche outras abas do sistema ou limpe os dados do site e tente de novo.');

  const handlePreviewCollab = (collab: PreviewCollab) => {
    try { startCollabPreview(collab); } catch { avisarFalhaPreview(); return; }
    sessionStorage.setItem('ndl_preview_return_path', window.location.hash || '#/admin/dashboard');
    setShowPreviewPanel(false);
    // Query-string change forces a TRUE full-page load (not a same-document hash navigation)
    // so DataContext re-initializes fresh with the preview auth from localStorage
    window.location.assign(window.location.origin + '/?_ndl=1#/collab/agenda');
  };

  const openClientPanel = async () => {
    const next = !showClientPanel;
    setShowClientPanel(next);
    setShowPreviewPanel(false);
    if (next) {
      setLoadingClientList(true);
      const { data } = await supabase.from('app_users').select('id, name, photo, email').eq('role', 'CLIENT').order('name');
      setClientPreviewList((data as PreviewClient[]) ?? []);
      setLoadingClientList(false);
    }
  };

  const handlePreviewClient = (client: PreviewClient) => {
    try { startClientPreview(client); } catch { avisarFalhaPreview(); return; }
    sessionStorage.setItem('ndl_preview_return_path', window.location.hash || '#/admin/dashboard');
    setShowClientPanel(false);
    // Query-string change forces a TRUE full-page load (not a same-document hash navigation)
    // so DataContext re-initializes fresh with the preview auth from localStorage
    window.location.assign(window.location.origin + '/?_ndl=1#/client/dashboard');
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

    const clientPreview = getClientPreview();
    return (
      <div className="min-h-screen bg-background dark:bg-darkBg flex flex-col font-sans transition-colors duration-300">
        {clientPreview && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between gap-2 text-xs">
            <span className="truncate"><Eye size={12} className="inline mr-1" />Visualizando como <strong>{clientPreview.clientName}</strong></span>
            <button onClick={exitPreviewToAdmin} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg font-medium whitespace-nowrap">
              ← Voltar ao Admin
            </button>
          </div>
        )}
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
                <h1 className="font-bold text-darkText dark:text-darkTextPrimary text-lg tracking-tight leading-tight">Negócios de<br className="md:hidden"/> Limpeza</h1>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`text-sm font-bold transition-colors ${
                      location.pathname === link.path 
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
               
               <div className="relative group cursor-pointer">
                  <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-darkBorder overflow-hidden">
                    <img src={currentUser?.photo || `https://i.pravatar.cc/150?u=${currentUser?.id || 'ju'}`} alt="Perfil" className="w-full h-full object-cover" />
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
            <div className="md:hidden bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder absolute w-full left-0 top-16 shadow-xl p-4 flex flex-col gap-4 z-40 animate-in slide-in-from-top-2">
                <button onClick={() => { navigate('/client/profile'); setMobileMenuOpen(false); }} className="text-darkText dark:text-darkTextPrimary font-bold text-sm p-3 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-darkBorder rounded-xl">
                   <User size={16} /> Meu Perfil
                </button>
                <button onClick={handleSupportClick} className="text-darkText dark:text-darkTextPrimary font-bold text-sm p-3 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-darkBorder rounded-xl">
                   <HelpCircle size={16} /> Suporte WhatsApp
                </button>
                <button onClick={handleLogout} className="text-red-500 font-bold text-sm p-3 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">
                   <LogOut size={16} /> Sair da conta
                </button>
            </div>
          )}
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 mobile-pb-nav md:pb-8">
          {children}
        </main>

        {/* Bottom Navigation for Client Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-darkSurface border-t border-gray-200 dark:border-darkBorder flex justify-around px-2 pt-2 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-nav-safe">
           {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-full active:scale-95 ${
                location.pathname === link.path 
                  ? 'text-primary' 
                  : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50 dark:hover:bg-darkBorder'
              }`}
            >
              {link.icon}
              <span className="text-[11px] mt-1 font-bold">{link.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // --- LAYOUT DE ADMIN E COLABORADOR (SIDEBAR) ---

  // Groups config for admin nav
  const adminGroups = [
    {
      key: 'OPERAÇÕES',
      label: 'Operações',
      icon: <Kanban size={16} />,
      items: [
        { icon: <Calendar size={15} />,   label: 'Agendamento',   path: '/admin/calendar' },
        { icon: <Kanban size={15} />,     label: 'OS / Pipeline', path: '/admin/os' },
        { icon: <Contact size={15} />,    label: 'Clientes',      path: '/admin/clients' },
        { icon: <Sparkles size={15} />,   label: 'Serviços',      path: '/admin/services' },
      ],
    },
    {
      key: 'RH',
      label: 'Recursos Humanos',
      icon: <Users size={16} />,
      items: [
        { icon: <UserPlus size={15} />,   label: 'Contratação',      path: '/admin/rh/contratacao' },
        { icon: <Users size={15} />,      label: 'Colaboradoras',    path: '/admin/rh/colaboradoras' },
        { icon: <MessageSquare size={15}/>,label: 'Avaliações',      path: '/admin/rh/avaliacoes' },
        { icon: <BarChart2 size={15} />,  label: 'Desempenho',       path: '/admin/rh/desempenho' },
        { icon: <BookOpen size={15} />,   label: 'Plano de Carreira',path: '/admin/rh/plano-carreira' },
        { icon: <Settings size={15} />,   label: 'Config. RH',       path: '/admin/rh/configuracoes' },
      ],
    },
    {
      key: 'FINANCEIRO',
      label: 'Financeiro',
      icon: <DollarSign size={16} />,
      items: [
        { icon: <DollarSign size={15} />, label: 'Financeiro', path: '/admin/payments' },
        { icon: <Package size={15} />,    label: 'Estoque',    path: '/admin/estoque' },
        { icon: <FileText size={15} />,   label: 'Nota Fiscal', path: '/admin/nfe' },
      ],
    },
    {
      key: 'CONFIG',
      label: 'Configurações',
      icon: <Settings size={16} />,
      items: [
        { icon: <Settings size={15} />,   label: 'Configurações', path: '/admin/settings' },
      ],
    },
  ];

  // Which groups are expanded (auto-expand active group)
  const getInitialExpanded = () => {
    const set = new Set<string>();
    adminGroups.forEach(g => {
      if (g.items.some(i => location.pathname.startsWith(i.path) || location.pathname === i.path)) {
        set.add(g.key);
      }
    });
    return set;
  };
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(getInitialExpanded);

  // Auto-expand when route changes
  useEffect(() => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      adminGroups.forEach(g => {
        if (g.items.some(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))) {
          next.add(g.key);
        }
      });
      return next;
    });
  }, [location.pathname]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const getMenuItems = () => {
    switch (role) {
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

  const isAdmin = role === UserRole.ADMIN;
  const mobileTabs = isAdmin
    ? [
        { icon: <LayoutDashboard size={20} />, label: 'Início', path: '/admin/dashboard' },
        { icon: <Calendar size={20} />, label: 'Agenda', path: '/admin/calendar' },
        { icon: <Kanban size={20} />, label: 'OS', path: '/admin/os' },
        { icon: <Contact size={20} />, label: 'Clientes', path: '/admin/clients' },
      ]
    : menuItems.slice(0, 4);
  const showMobileMenuButton = isAdmin || menuItems.length > 4;
  const isPathActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-darkBg font-sans transition-colors duration-300">
      {/* Subtle refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-violet-200 overflow-hidden">
          <div className="h-full bg-violet-500 animate-pulse w-2/3 ml-auto mr-0" style={{ animation: 'ndl-slide 1.5s ease-in-out infinite' }} />
        </div>
      )}
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-darkSurface border-r border-gray-200 dark:border-darkBorder transition-colors duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="font-bold text-darkText dark:text-darkTextPrimary leading-tight text-sm">Negócios de<br/>Limpeza</h1>
            <p className="text-[10px] text-lightText dark:text-darkTextSecondary">Portal Administrativo</p>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-2 overflow-y-auto pb-4">
          {/* Dashboard — top-level item */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-colors mb-2 ${
              location.pathname === '/admin/dashboard'
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-lightText dark:text-darkTextSecondary hover:bg-purple-50 dark:hover:bg-darkBorder'
            }`}
          >
            <LayoutDashboard size={16} />
            <span className="text-sm font-semibold">Dashboard</span>
          </button>

          {/* Collapsible groups */}
          {adminGroups.map(group => {
            const isOpen = expandedGroups.has(group.key);
            const hasActive = group.items.some(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));
            return (
              <div key={group.key} className="mb-1">
                {/* Group header — clickable block */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-colors group ${
                    hasActive && !isOpen
                      ? 'bg-primary/5 text-primary'
                      : 'hover:bg-purple-50 dark:hover:bg-darkBorder text-darkText dark:text-darkTextPrimary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${hasActive ? 'text-primary' : 'text-gray-400 dark:text-darkTextSecondary'}`}>
                      {group.icon}
                    </span>
                    <span className="text-sm font-bold">{group.label}</span>
                  </div>
                  <span className={`transition-transform duration-200 text-gray-400 dark:text-darkTextSecondary ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={16} />
                  </span>
                </button>

                {/* Sub-items */}
                {isOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-100 dark:border-darkBorder space-y-0.5">
                    {group.items.map(item => {
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      return (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg w-full transition-colors text-sm ${
                            isActive
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-lightText dark:text-darkTextSecondary hover:bg-purple-50 dark:hover:bg-darkBorder'
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-darkBorder">
          <div className="flex justify-between items-center mb-4 px-2">
             <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 mb-4 px-2 cursor-pointer" onClick={() => navigate('/admin/settings')}>
             <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-darkBorder flex items-center justify-center overflow-hidden shrink-0">
                {(platformSettings.adminPhoto || localStorage.getItem('admin_photo'))
                  ? <img src={platformSettings.adminPhoto || localStorage.getItem('admin_photo')!} alt="Admin" className="w-full h-full object-cover"/>
                  : <span className="text-lg">👤</span>}
             </div>
             <div>
                <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{platformSettings.adminName || localStorage.getItem('admin_name') || 'Administrador'}</p>
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

          {/* Vista Rápida — Super Admin only */}
          {role === UserRole.ADMIN && (
            <div className="relative mt-2 border-t border-gray-100 pt-2">
              <button
                onClick={openPreviewPanel}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
              >
                <Eye size={13} />
                Ver como colaboradora...
              </button>
              {showPreviewPanel && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 dark:bg-darkSurface dark:border-darkBorder rounded-xl shadow-xl overflow-hidden">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">Escolha uma colaboradora</p>
                  <div className="max-h-44 overflow-y-auto">
                    {loadingPreviewCollabs ? (
                      <p className="text-xs text-gray-400 p-3 text-center">Carregando...</p>
                    ) : previewCollabs.length === 0 ? (
                      <p className="text-xs text-gray-400 p-3 text-center">Nenhuma ativa</p>
                    ) : previewCollabs.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handlePreviewCollab(c)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        {c.foto
                          ? <img src={c.foto} alt={c.nome} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-[10px] flex-shrink-0">{c.nome[0]}</div>
                        }
                        <span className="truncate">{c.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ver como cliente */}
              <button
                onClick={openClientPanel}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors mt-0.5"
              >
                <User size={13} />
                Ver como cliente...
              </button>
              {showClientPanel && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 dark:bg-darkSurface dark:border-darkBorder rounded-xl shadow-xl overflow-hidden">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">Escolha um cliente</p>
                  <div className="max-h-44 overflow-y-auto">
                    {loadingClientList ? (
                      <p className="text-xs text-gray-400 p-3 text-center">Carregando...</p>
                    ) : clientPreviewList.length === 0 ? (
                      <p className="text-xs text-gray-400 p-3 text-center">Nenhum cliente</p>
                    ) : clientPreviewList.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handlePreviewClient(c)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {c.photo
                          ? <img src={c.photo} alt={c.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] flex-shrink-0">{c.name[0]}</div>
                        }
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
            <h1 className="font-bold text-sm text-darkText dark:text-darkTextPrimary leading-tight">Negócios de<br/>Limpeza</h1>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button onClick={handleLogout} className="text-lightText dark:text-darkTextSecondary p-2 hover:bg-gray-100 rounded-lg">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-8 mobile-pb-nav md:pb-8">
          {children}
        </main>

        {isAdmin && <GeminiChat />}

        {/* Mobile Bottom Nav (Admin/Collab) */}
        <nav className="md:hidden bg-white dark:bg-darkSurface border-t border-gray-200 dark:border-darkBorder flex justify-around px-2 pt-2 fixed bottom-0 left-0 w-full z-40 pb-nav-safe">
           {mobileTabs.map((item) => {
            const mobileActive = isPathActive(item.path);
            return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg w-full transition-all active:scale-95 ${
                mobileActive ? 'text-primary' : 'text-lightText dark:text-darkTextSecondary'
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1 font-medium truncate w-full text-center">{item.label}</span>
            </button>
          );})}

          
          {showMobileMenuButton && (
             <button
                onClick={() => setMobileMenuOpen(true)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg w-full transition-all active:scale-95 ${mobileMenuOpen ? 'text-primary' : 'text-lightText dark:text-darkTextSecondary'}`}
             >
                <Grid size={20} />
                <span className="text-[10px] mt-1 font-medium truncate w-full text-center">Menu</span>
             </button>
          )}
        </nav>

        {/* Mobile Full Menu Overlay (Drawer) */}
        {mobileMenuOpen && (
           <div className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setMobileMenuOpen(false)}>
              <div 
                 className="absolute bottom-0 left-0 w-full max-h-[85vh] overflow-y-auto bg-white dark:bg-darkSurface rounded-t-3xl p-6 pb-safe shadow-2xl border-t border-gray-100 dark:border-darkBorder animate-in slide-in-from-bottom-10"
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
                 
                 {isAdmin ? (
                   <div className="space-y-5">
                     {adminGroups.map(group => (
                       <div key={group.key}>
                         <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">{group.label}</p>
                         <div className="grid grid-cols-3 gap-2">
                           {group.items.map(item => {
                             const active = isPathActive(item.path);
                             return (
                               <button
                                 key={item.path}
                                 onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                                 className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors ${active ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-darkBg text-darkText dark:text-darkTextPrimary active:bg-primary/10'}`}
                               >
                                 {item.icon}
                                 <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     ))}

                     <div className="border-t border-gray-100 dark:border-darkBorder pt-4 space-y-2">
                       <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">Visualizar como</p>
                       <div className="grid grid-cols-2 gap-2">
                         <button
                           onClick={() => { setShowClientPanel(false); openPreviewPanel(); }}
                           className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold ${showPreviewPanel ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'}`}
                         >
                           <Eye size={14} /> Colaboradora
                         </button>
                         <button
                           onClick={openClientPanel}
                           className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold ${showClientPanel ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}
                         >
                           <User size={14} /> Cliente
                         </button>
                       </div>
                       {(showPreviewPanel || showClientPanel) && (
                         <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-darkBorder divide-y divide-gray-50 dark:divide-darkBorder">
                           {(showPreviewPanel ? loadingPreviewCollabs : loadingClientList) ? (
                             <p className="text-xs text-gray-400 p-3 text-center">Carregando...</p>
                           ) : (showPreviewPanel ? previewCollabs : clientPreviewList).length === 0 ? (
                             <p className="text-xs text-gray-400 p-3 text-center">Nenhum registro encontrado</p>
                           ) : showPreviewPanel ? previewCollabs.map(c => (
                             <button key={c.id} onClick={() => handlePreviewCollab(c)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-darkText dark:text-darkTextPrimary active:bg-purple-50">
                               {c.foto
                                 ? <img src={c.foto} alt={c.nome} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                 : <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">{(c.nome || '?').trim().charAt(0)}</div>}
                               <span className="truncate">{(c.nome || '').trim()}</span>
                             </button>
                           )) : clientPreviewList.map(c => (
                             <button key={c.id} onClick={() => handlePreviewClient(c)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-darkText dark:text-darkTextPrimary active:bg-blue-50">
                               {c.photo
                                 ? <img src={c.photo} alt={c.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                 : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">{(c.name || '?').trim().charAt(0)}</div>}
                               <span className="truncate">{(c.name || '').trim()}</span>
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>
                 ) : (
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
                 )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};