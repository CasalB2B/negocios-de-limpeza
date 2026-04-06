import React, { useEffect, useState, useRef } from 'react';
import { Download, Bell, BellOff, X, Smartphone, CheckCircle } from 'lucide-react';

// ─── Service Worker registration ─────────────────────────────────────────────
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('[SW] Registrado:', reg.scope))
        .catch(err => console.warn('[SW] Falhou:', err));
    });
  }
}

// ─── Hook: send notification via SW (in-app / background) ────────────────────
export function sendNotification(title: string, body: string, url = '/admin/crm', tag = 'nl-msg') {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body, url, tag });
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/icon.svg', tag });
  }
}

// ─── PWA Install + Notification Banner ───────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAManager: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>('default');
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setInstalled(true);
      return;
    }

    // Check if user already dismissed the banner
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return; // 7 days

    // Listen for install prompt (Chrome / Edge / Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Check notification permission
    if ('Notification' in window) {
      setNotifStatus(Notification.permission);
    }

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    }
    setInstalling(false);
    setInstallPrompt(null);
  };

  const handleNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === 'granted') {
      sendNotification('🎉 Notificações ativadas!', 'Você receberá alertas de novas mensagens e pedidos.', '/admin/crm');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    dismissedRef.current = true;
    localStorage.setItem('pwa_banner_dismissed', String(Date.now()));
  };

  // Don't show if already installed or nothing to show
  if (installed || (!showBanner && notifStatus !== 'default')) return null;
  if (!showBanner && notifStatus === 'default') return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm animate-slide-up">
      <div className="bg-white dark:bg-darkSurface rounded-2xl shadow-2xl border border-gray-100 dark:border-darkBorder overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Negócios de Limpeza</p>
            <p className="text-white/80 text-xs">Instale o app para acesso rápido</p>
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Install button — show only if installPrompt exists */}
          {installPrompt && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center gap-3 bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-primaryHover transition-colors disabled:opacity-60"
            >
              {installing ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {installing ? 'Instalando...' : 'Instalar Aplicativo'}
              <span className="ml-auto text-white/70 text-xs font-normal">Grátis</span>
            </button>
          )}

          {/* Notification permission */}
          {notifStatus === 'default' && (
            <button
              onClick={handleNotifPermission}
              className="w-full flex items-center gap-3 bg-gray-50 dark:bg-darkBg text-darkText dark:text-darkTextPrimary border border-gray-200 dark:border-darkBorder px-4 py-3 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-colors"
            >
              <Bell size={18} className="text-primary" />
              Ativar Notificações
              <span className="ml-auto text-lightText dark:text-darkTextSecondary text-xs font-normal">Recomendado</span>
            </button>
          )}

          {notifStatus === 'granted' && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl">
              <CheckCircle size={14} />
              <span className="font-semibold">Notificações ativadas</span>
            </div>
          )}

          {notifStatus === 'denied' && (
            <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
              <BellOff size={14} />
              <span>Notificações bloqueadas. Ative nas configurações do navegador.</span>
            </div>
          )}

          <p className="text-xs text-lightText dark:text-darkTextSecondary text-center">
            Funciona no celular e no computador · Sem App Store
          </p>
        </div>
      </div>
    </div>
  );
};
