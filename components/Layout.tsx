import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Home, Calendar, Users, FileText, Settings, LogOut, DollarSign, User, CheckCircle, Menu, X, HelpCircle, Briefcase, LayoutDashboard, Smile, MapPin, Sparkles, Grid, MessageSquare, MessageCircle, Kanban, Inbox, BarChart2, UserCog, Megaphone, UserPlus, BookOpen, ChevronDown, ChevronRight, Eye, Package, Contact, Lock, Landmark, List, CreditCard , BellRing, Star, ShieldOff } from 'lucide-react';
import { GeminiChat } from './GeminiChat';
import { PermissoesApp } from './PermissoesApp';
import { podeVer, podeEditar, atalhosAtuais, salvarAtalhos, atualizarDoBanco, permissoesAtuais, nivelDeAcesso, primeiraRotaPermitida } from '../lib/acesso';
import { empresaId } from '../lib/empresa';
import { FaixaTeste, TesteEncerrado, useEmpresaAtual } from './TesteGratis';
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
  const { currentUser, logoutClient, logoutCollaborator, logoutAdmin, platformSettings, isRefreshing, reviewerMode } = useData();
  const mainRef = useRef<HTMLElement>(null);

  // Office team access level and personal shortcuts (lib/acesso.ts), refreshed from the database on open.
  const [perm, setPerm] = useState(permissoesAtuais());
  const [atalhos, setAtalhos] = useState<string[]>(atalhosAtuais());
  const [arrastandoAtalho, setArrastandoAtalho] = useState<string | null>(null);
  useEffect(() => {
    if (role !== UserRole.ADMIN) return;
    atualizarDoBanco().then(res => { if (res) { setPerm(res.perm); setAtalhos(res.atalhos); } }).catch(() => {});
    const aoMudar = () => setAtalhos(atalhosAtuais());
    window.addEventListener('ndl-atalhos', aoMudar);
    return () => window.removeEventListener('ndl-atalhos', aoMudar);
  }, [role]);
  const alternarAtalho = (path: string) => {
    const nova = atalhos.includes(path) ? atalhos.filter(x => x !== path) : [...atalhos, path];
    setAtalhos(nova);
    salvarAtalhos(nova).catch(() => {});
  };
  const moverAtalho = (de: string, para: string) => {
    if (de === para) return;
    const nova = atalhos.filter(x => x !== de);
    nova.splice(nova.indexOf(para), 0, de);
    setAtalhos(nova);
    salvarAtalhos(nova).catch(() => {});
  };

  // Reset scroll to top on every route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [location.pathname]);

  const handleLogout = () => {
    if (role === UserRole.ADMIN) logoutAdmin();
    else if (role === UserRole.COLLABORATOR) logoutCollaborator();
    else logoutClient();
    navigate('/entrar');
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
      key: 'ATENDIMENTO',
      label: 'Atendimento',
      icon: <MessageCircle size={16} />,
      items: [
        { icon: <MessageCircle size={15} />, label: 'Conversas',  path: '/admin/conversas' },
        { icon: <FileText size={15} />,      label: 'Orçamentos', path: '/admin/orcamentos' },
      ],
    },
    {
      key: 'RH',
      label: 'Recursos Humanos',
      icon: <Users size={16} />,
      items: [
        { icon: <UserPlus size={15} />,   label: 'Contratação',      path: '/admin/rh/contratacao' },
        { icon: <Users size={15} />,      label: 'Profissionais',    path: '/admin/rh/colaboradoras' },
        { icon: <BellRing size={15} />,   label: 'Avisos para a equipe', path: '/admin/avisos' },
        { icon: <MessageSquare size={15}/>,label: 'Avaliações',      path: '/admin/rh/avaliacoes' },
        { icon: <BarChart2 size={15} />,  label: 'Desempenho',       path: '/admin/rh/desempenho' },
        ...(empresaId() === 1 ? [{ icon: <BookOpen size={15} />, label: 'Plano de Carreira', path: '/admin/rh/plano-carreira' }] : []),
        { icon: <Settings size={15} />,   label: 'Config. RH',       path: '/admin/rh/configuracoes' },
      ],
    },
    {
      key: 'FINANCEIRO',
      label: 'Financeiro',
      icon: <DollarSign size={16} />,
      items: [
        { icon: <LayoutDashboard size={15} />, label: 'Painel',       path: '/admin/financeiro' },
        { icon: <DollarSign size={15} />, label: 'Recebimentos',  path: '/admin/financeiro/recebimentos' },
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
        ...(empresaId() !== 1 ? [{ icon: <DollarSign size={15} />, label: 'Assinatura', path: '/admin/assinatura' }] : []),
        { icon: <HelpCircle size={15} />, label: 'Central de Ajuda', path: '/ajuda' },
        // The shared help base is curated by the software owner only.
        ...(localStorage.getItem('ndl_dono') === '1' ? [{ icon: <Sparkles size={15} />, label: 'Aprendizado da IA', path: '/admin/ajuda-ia' }] : []),
        { icon: <MessageCircle size={15} />, label: 'WhatsApp',   path: '/admin/whatsapp' },
      ],
    },
    // Software owner only: every company on the platform.
    ...(localStorage.getItem('ndl_dono') === '1' ? [{
      key: 'PLATAFORMA',
      label: 'Plataforma',
      icon: <Grid size={16} />,
      items: [
        { icon: <Grid size={15} />, label: 'Empresas', path: '/admin/plataforma' },
      ],
    }] : []),
  ];

  // What this person can open, and their shortcuts in the order they chose.
  const dashItem = { icon: <LayoutDashboard size={15} />, label: 'Dashboard', path: '/admin/dashboard' };
  const verDashboard = podeVer('/admin/dashboard', perm);
  const gruposVisiveis = adminGroups
    .map(g => ({ ...g, items: g.items.filter(i => podeVer(i.path, perm)) }))
    .filter(g => g.items.length > 0);
  // Screens that are not in the side menu but can be pinned from their own page (finance tabs).
  const extrasFixaveis = [
    { icon: <Landmark size={15} />,   label: 'Contas',      path: '/admin/financeiro/contas' },
    { icon: <List size={15} />,       label: 'Lançamentos', path: '/admin/financeiro/lancamentos' },
    { icon: <CreditCard size={15} />, label: 'Cartões',     path: '/admin/financeiro/cartoes' },
    { icon: <Calendar size={15} />,   label: 'Calendário financeiro', path: '/admin/financeiro/calendario' },
    { icon: <FileText size={15} />,   label: 'Categorias',  path: '/admin/financeiro/categorias' },
  ].filter(i => podeVer(i.path, perm));
  const itemPorPath = new Map([...(verDashboard ? [dashItem] : []), ...gruposVisiveis.flatMap(g => g.items), ...extrasFixaveis].map(i => [i.path, i]));
  const atalhosVisiveis = atalhos.map(x => itemPorPath.get(x)).filter(Boolean) as typeof dashItem[];

  // Desktop sidebar: only the section of the current page starts open; others open on click.
  const grupoDaRota = (path: string) =>
    adminGroups.find(g => g.items.some(i => path === i.path || path.startsWith(i.path + '/')))?.key;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const k = grupoDaRota(location.pathname);
    return new Set(k ? [k] : []);
  });
  useEffect(() => {
    const k = grupoDaRota(location.pathname);
    if (k) setOpenGroups(prev => prev.has(k) ? prev : new Set(prev).add(k));
  }, [location.pathname]);
  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
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
  const empresaAtual = useEmpresaAtual();
  // Modo revisor: tudo fica visível no menu, mas bloqueado, menos o WhatsApp.
  const isLocked = (path: string) => reviewerMode && path !== '/admin/whatsapp';
  const mobileTabs = reviewerMode
    ? [{ icon: <MessageCircle size={20} />, label: 'WhatsApp', path: '/admin/whatsapp' }]
    : isAdmin
    ? (() => {
        const inicio = verDashboard ? [{ icon: <LayoutDashboard size={20} />, label: 'Início', path: '/admin/dashboard' }] : [];
        const fixos = atalhosVisiveis.filter(a => a.path !== '/admin/dashboard')
          .map(a => ({ icon: React.cloneElement(a.icon, { size: 20 }), label: a.label, path: a.path }));
        const padrao = [
          { icon: <Calendar size={20} />, label: 'Agenda', path: '/admin/calendar' },
          { icon: <Kanban size={20} />, label: 'OS', path: '/admin/os' },
          { icon: <Contact size={20} />, label: 'Clientes', path: '/admin/clients' },
        ].filter(i => podeVer(i.path, perm));
        return [...inicio, ...(fixos.length ? fixos : padrao)].slice(0, 4);
      })()
    : menuItems.slice(0, 4);
  const showMobileMenuButton = isAdmin || menuItems.length > 4;
  // Um item só fica marcado quando nenhum outro item mais específico combina com a página (ex.: Painel /admin/financeiro x Contas /admin/financeiro/contas).
  const isPathActive = (path: string) => {
    const combina = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/');
    if (!combina(path)) return false;
    return !adminGroups.some(g => g.items.some(i => i.path.length > path.length && i.path.startsWith(path + '/') && combina(i.path)));
  };

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
        <div className="px-6 pt-6 pb-5">
          <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-14 w-auto object-contain dark:hidden" />
          <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-14 w-auto object-contain hidden dark:block" />
          <p className="text-[11px] text-lightText dark:text-darkTextSecondary mt-2">Portal Administrativo</p>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto pb-4">
          {(() => {
            const itemCls = (active: boolean, locked: boolean) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-[14px] transition-colors ${
                locked
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : active
                  ? 'bg-primary/10 text-primary font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-primary'
                  : 'text-darkText/80 dark:text-darkTextSecondary font-medium hover:bg-purple-50 dark:hover:bg-darkBorder hover:text-darkText dark:hover:text-darkTextPrimary'
              }`;
            const iconCls = (active: boolean) => active ? 'text-primary' : 'text-gray-400 dark:text-darkTextSecondary';
            const dashActive = location.pathname === '/admin/dashboard';
            const dashLocked = isLocked('/admin/dashboard');
            return (
              <>
                {verDashboard && <button
                  onClick={() => !dashLocked && navigate('/admin/dashboard')}
                  disabled={dashLocked}
                  title={dashLocked ? 'Indisponível no modo revisor' : undefined}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors ${
                    dashLocked ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : dashActive ? 'bg-primary/10' : 'hover:bg-purple-50 dark:hover:bg-darkBorder'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dashActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                    <LayoutDashboard size={16} />
                  </span>
                  <span className={`flex-1 text-[14px] font-bold ${dashActive ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>Dashboard</span>
                  {dashLocked && <Lock size={13} />}
                </button>}

                {/* My shortcuts: star any item below; drag to reorder */}
                {!reviewerMode && (atalhosVisiveis.length > 0 ? (
                  <div className="mt-3 mb-1">
                    <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Star size={10} className="fill-current" /> Meus atalhos</p>
                    <div className="space-y-0.5">
                      {atalhosVisiveis.map(item => {
                        const isActive = isPathActive(item.path);
                        return (
                          <div key={item.path} draggable
                            onDragStart={() => setArrastandoAtalho(item.path)}
                            onDragOver={e => { e.preventDefault(); if (arrastandoAtalho && arrastandoAtalho !== item.path) moverAtalho(arrastandoAtalho, item.path); }}
                            onDragEnd={() => setArrastandoAtalho(null)}
                            className={`relative group ${arrastandoAtalho === item.path ? 'opacity-50' : ''}`}>
                            <button onClick={() => navigate(item.path)} className={`${itemCls(isActive, false)} pr-8 cursor-grab active:cursor-grabbing`}>
                              <span className={iconCls(isActive)}>{React.cloneElement(item.icon, { size: 17 })}</span>
                              <span className="truncate">{item.label}</span>
                            </button>
                            <button onClick={() => alternarAtalho(item.path)} title="Tirar dos atalhos"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-amber-400 opacity-0 group-hover:opacity-100 hover:bg-amber-50">
                              <Star size={13} className="fill-current" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="px-3 mt-2 mb-1 text-[11px] leading-snug text-gray-400">Dica: passe o mouse num item e clique na <Star size={10} className="inline -mt-0.5" /> para criar seus atalhos.</p>
                ))}

                {gruposVisiveis.map(group => {
                  const isOpen = reviewerMode || openGroups.has(group.key);
                  const hasActive = group.items.some(i => isPathActive(i.path));
                  return (
                    <div key={group.key} className="mt-1.5">
                      {/* Group header: icon tile + name; click to open/close */}
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className={`flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-left transition-colors ${
                          isOpen ? 'bg-gray-50 dark:bg-darkBg' : 'hover:bg-purple-50 dark:hover:bg-darkBorder'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          hasActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                        }`}>
                          {React.cloneElement(group.icon, { size: 16 })}
                        </span>
                        <span className={`flex-1 min-w-0 whitespace-nowrap truncate text-[14px] font-bold ${hasActive ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>
                          {group.label}
                        </span>
                        <ChevronDown size={16} className={`text-gray-400 dark:text-darkTextSecondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="mt-1 mb-2 ml-[26px] pl-3 border-l-2 border-primary/15 space-y-0.5">
                          {group.items.map(item => {
                            const isActive = isPathActive(item.path);
                            const locked = isLocked(item.path);
                            const fixado = atalhos.includes(item.path);
                            return (
                              <div key={item.path} className="relative group">
                                <button
                                  onClick={() => !locked && navigate(item.path)}
                                  disabled={locked}
                                  title={locked ? 'Indisponível no modo revisor' : undefined}
                                  className={`${itemCls(isActive, locked)} pr-8`}
                                >
                                  <span className={iconCls(isActive)}>{React.cloneElement(item.icon, { size: 17 })}</span>
                                  <span className="truncate">{item.label}</span>
                                  {locked && <Lock size={12} className="ml-auto" />}
                                </button>
                                {!locked && (
                                  <button onClick={() => alternarAtalho(item.path)} title={fixado ? 'Tirar dos atalhos' : 'Adicionar aos atalhos'}
                                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-opacity hover:bg-amber-50 ${fixado ? 'text-amber-400 opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}>
                                    <Star size={13} className={fixado ? 'fill-current' : ''} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100 dark:border-darkBorder">
          {reviewerMode ? (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-darkBorder flex items-center justify-center shrink-0"><Lock size={14} className="text-gray-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-darkText dark:text-darkTextPrimary">Revisor</p>
                <p className="text-[11px] text-lightText dark:text-darkTextSecondary">Acesso só ao WhatsApp</p>
              </div>
              <button onClick={handleLogout} title="Sair" className="p-2 rounded-lg text-lightText hover:text-red-500 hover:bg-red-50"><LogOut size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-1">
              <button onClick={() => podeVer('/admin/settings', perm) && navigate('/admin/settings')} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-darkBorder flex items-center justify-center overflow-hidden shrink-0">
                  {(platformSettings.adminPhoto || localStorage.getItem('admin_photo'))
                    ? <img src={platformSettings.adminPhoto || localStorage.getItem('admin_photo')!} alt="" className="w-full h-full object-cover" />
                    : <User size={15} className="text-gray-500" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-darkText dark:text-darkTextPrimary truncate">{currentUser?.name || platformSettings.adminName || localStorage.getItem('admin_name') || 'Administrador'}</span>
                  <span className="block text-[11px] text-lightText dark:text-darkTextSecondary truncate">{nivelDeAcesso(perm)}</span>
                </span>
              </button>
              <ThemeToggle className="!p-1.5 shrink-0 [&_svg]:w-4 [&_svg]:h-4" />
              <button onClick={handleLogout} title="Sair" className="p-1.5 rounded-lg text-lightText dark:text-darkTextSecondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"><LogOut size={16} /></button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (Admin/Collab) */}
        <header className="md:hidden bg-white dark:bg-darkSurface border-b border-gray-200 dark:border-darkBorder p-4 flex justify-between items-center z-10 transition-colors duration-300 shadow-sm h-16">
           <div className="flex items-center">
            <img src="/img/logo-lilas.png" alt="Negócios de Limpeza" className="h-9 w-auto dark:hidden" />
            <img src="/img/logo-bege.png" alt="Negócios de Limpeza" className="h-9 w-auto hidden dark:block" />
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button onClick={handleLogout} className="text-lightText dark:text-darkTextSecondary p-2 hover:bg-gray-100 rounded-lg">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-8 mobile-pb-nav md:pb-8">
          {isAdmin && <FaixaTeste empresa={empresaAtual} />}
          {role === UserRole.COLLABORATOR && <PermissoesApp />}
          {isAdmin && !reviewerMode && !podeVer(location.pathname, perm) ? (
            <div className="max-w-md mx-auto mt-16 text-center bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-2xl p-8 space-y-3">
              <ShieldOff size={32} className="mx-auto text-gray-300" />
              <p className="font-bold text-darkText dark:text-darkTextPrimary">Você não tem acesso a esta área</p>
              <p className="text-sm text-lightText dark:text-darkTextSecondary">Se precisar, peça ao administrador para liberar em Configurações → Usuários & Permissões.</p>
              <Button onClick={() => navigate(primeiraRotaPermitida(perm))}>Ir para o início</Button>
            </div>
          ) : (<>
            {isAdmin && !reviewerMode && !podeEditar(location.pathname, perm) && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-2">
                <Eye size={14} className="shrink-0" /> Você pode consultar esta tela, mas não alterar.
              </div>
            )}
            {children}
          </>)}
        </main>
        {isAdmin && <TesteEncerrado empresa={empresaAtual} onSair={handleLogout} naTelaDeAssinatura={location.pathname === '/admin/assinatura'} />}

        {/* The AI button would cover the send button of the WhatsApp screen. */}
        {isAdmin && !reviewerMode && location.pathname !== '/admin/conversas' && <GeminiChat />}

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
                     <p className="text-xs text-lightText dark:text-darkTextSecondary -mt-3">Toque na <Star size={11} className="inline -mt-0.5" /> para fixar uma tela na barra de baixo.</p>
                     {gruposVisiveis.map(group => (
                       <div key={group.key}>
                         <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">{group.label}</p>
                         <div className="grid grid-cols-3 gap-2">
                           {group.items.map(item => {
                             const active = isPathActive(item.path);
                             const locked = isLocked(item.path);
                             return (
                               <button
                                 key={item.path}
                                 onClick={() => { if (locked) return; navigate(item.path); setMobileMenuOpen(false); }}
                                 disabled={locked}
                                 className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors ${locked ? 'bg-gray-50 dark:bg-darkBg text-gray-300 dark:text-gray-600 cursor-not-allowed' : active ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-darkBg text-darkText dark:text-darkTextPrimary active:bg-primary/10'}`}
                               >
                                 {locked && <Lock size={11} className="absolute top-2 right-2" />}
                                 {!locked && (
                                   <span role="button" aria-label={atalhos.includes(item.path) ? 'Tirar dos atalhos' : 'Fixar nos atalhos'}
                                     onClick={e => { e.stopPropagation(); alternarAtalho(item.path); }}
                                     className={`absolute top-1 right-1 p-1 ${atalhos.includes(item.path) ? 'text-amber-400' : active ? 'text-white/60' : 'text-gray-300'}`}>
                                     <Star size={12} className={atalhos.includes(item.path) ? 'fill-current' : ''} />
                                   </span>
                                 )}
                                 {item.icon}
                                 <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     ))}

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