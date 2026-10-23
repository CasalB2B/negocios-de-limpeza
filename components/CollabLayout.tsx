import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, DollarSign, User, ArrowLeft } from 'lucide-react';

interface CollabLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  hideNav?: boolean;
}

export const CollabLayout: React.FC<CollabLayoutProps> = ({
  children,
  title,
  showBack = false,
  backTo,
  hideNav = false,
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  const navItems = [
    { label: 'Agenda', icon: CalendarDays, path: '/collab/agenda' },
    { label: 'Financeiro', icon: DollarSign, path: '/collab/finance' },
    { label: 'Perfil', icon: User, path: '/collab/profile' },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg, #f4f4f5)' }}>
      {(title || showBack) && (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {title && <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>}
        </header>
      )}

      <main className={`flex-1 overflow-y-auto px-4 py-5 ${!hideNav ? 'pb-24' : ''}`}>
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex">
            {navItems.map(({ label, icon: Icon, path }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                    active ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-violet-600' : ''}`}>
                    {label}
                  </span>
                  {active && <div className="w-1 h-1 bg-violet-600 rounded-full" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
