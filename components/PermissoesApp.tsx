import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Bell, Camera, CheckCircle2, Loader2, MapPin, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ativarPush, estadoPush, noAppNativo } from '../lib/push';

// Inside the Android/iPhone app the professional must allow location (map + check-in), notifications
// (new jobs, reminders) and the camera (before/after photos). While anything is missing, a strip stays at
// the top of every screen; once per app session a window asks for them. Outside the app this renders nothing.

type Estado = 'ok' | 'pendente' | 'negado' | 'desligado' | 'verificando';
type Chave = 'local' | 'notif' | 'camera';

const LS = (k: Chave) => `ndl_perm_${k}`;
const lerLS = (k: Chave): Estado | null => { try { return (localStorage.getItem(LS(k)) as Estado) || null; } catch { return null; } };
const gravarLS = (k: Chave, v: Estado) => { try { localStorage.setItem(LS(k), v); } catch { /* ignore */ } };

async function consultar(nome: string): Promise<Estado | null> {
  try {
    const r = await (navigator as any).permissions?.query({ name: nome });
    if (!r) return null;
    return r.state === 'granted' ? 'ok' : r.state === 'denied' ? 'negado' : 'pendente';
  } catch { return null; }
}

// Asking for the position shows the phone's own permission dialog the first time.
function pedirLocalizacao(): Promise<Estado> {
  return new Promise(res => {
    if (!navigator.geolocation) return res('negado');
    navigator.geolocation.getCurrentPosition(
      () => res('ok'),
      e => res(e.code === 1 ? 'negado' : e.code === 2 ? 'desligado' : 'pendente'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

async function pedirCamera(): Promise<Estado> {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    s.getTracks().forEach(t => t.stop());
    return 'ok';
  } catch (e: any) {
    return e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'negado' : 'pendente';
  }
}

const ITENS: { k: Chave; titulo: string; porque: string; Icone: typeof MapPin }[] = [
  { k: 'local', titulo: 'Localização', porque: 'Para você aparecer no mapa da empresa e fazer o check-in no endereço do serviço.', Icone: MapPin },
  { k: 'notif', titulo: 'Notificações', porque: 'Para receber os serviços novos, lembretes e avisos da equipe.', Icone: Bell },
  { k: 'camera', titulo: 'Câmera', porque: 'Para tirar as fotos de antes e depois da limpeza.', Icone: Camera },
];

const comoLiberar = () => Capacitor.getPlatform() === 'ios'
  ? 'Abra os Ajustes do iPhone → Negócios de Limpeza → ative a opção. Depois volte aqui.'
  : 'Abra as Configurações do celular → Apps → Negócios de Limpeza → Permissões → escolha "Permitir". Depois volte aqui.';

export const PermissoesApp: React.FC = () => {
  const nativo = noAppNativo();
  const [estado, setEstado] = useState<Record<Chave, Estado>>({ local: 'verificando', notif: 'verificando', camera: 'verificando' });
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState<Chave | null>(null);

  const verificar = useCallback(async () => {
    const notif = await estadoPush().catch(() => 'pendente' as const);
    const local = (await consultar('geolocation')) ?? lerLS('local') ?? 'pendente';
    const camera = (await consultar('camera')) ?? lerLS('camera') ?? 'pendente';
    const novo: Record<Chave, Estado> = {
      notif: notif === 'ativo' ? 'ok' : notif === 'negado' ? 'negado' : 'pendente',
      // A 'desligado' (GPS off) answer is only known after asking; keep it until it works.
      local: local === 'pendente' && lerLS('local') === 'desligado' ? 'desligado' : local,
      camera,
    };
    setEstado(novo);
    return novo;
  }, []);

  useEffect(() => {
    if (!nativo) return;
    verificar().then(e => {
      const falta = Object.values(e).some(v => v !== 'ok');
      let jaMostrou = false;
      try { jaMostrou = sessionStorage.getItem('ndl_perm_popup') === '1'; } catch { /* ignore */ }
      if (falta && !jaMostrou) { setAberto(true); try { sessionStorage.setItem('ndl_perm_popup', '1'); } catch { /* ignore */ } }
    });
    // Coming back from the phone settings: check again.
    const aoVoltar = () => { if (document.visibilityState === 'visible') verificar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [nativo, verificar]);

  if (!nativo) return null;

  const ativar = async (k: Chave) => {
    setOcupado(k);
    let r: Estado = 'pendente';
    if (k === 'local') r = await pedirLocalizacao();
    if (k === 'camera') r = await pedirCamera();
    if (k === 'notif') { const e = await ativarPush().catch(() => 'pendente'); r = e === 'ativo' ? 'ok' : e === 'negado' ? 'negado' : 'pendente'; }
    if (k !== 'notif') gravarLS(k, r);
    setEstado(prev => ({ ...prev, [k]: r }));
    setOcupado(null);
  };

  const faltando = ITENS.filter(i => estado[i.k] !== 'ok' && estado[i.k] !== 'verificando');
  const tudoOk = ITENS.every(i => estado[i.k] === 'ok');

  return (
    <>
      {faltando.length > 0 && (
        <button onClick={() => setAberto(true)}
          className="w-full mb-4 flex items-center gap-3 text-left bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3">
          <span className="relative shrink-0">
            <AlertTriangle size={20} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold">Falta ativar: {faltando.map(i => i.titulo.toLowerCase()).join(', ')}</span>
            <span className="block text-xs">Sem isso você não aparece no mapa e pode perder avisos. Toque para ativar.</span>
          </span>
        </button>
      )}

      {aberto && createPortal(
        <div className="safe-proprio fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-darkSurface rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary">Ative as permissões do app</h2>
                <p className="text-sm text-lightText dark:text-darkTextSecondary">São necessárias para você trabalhar com a gente pelo celular.</p>
              </div>
              <button onClick={() => setAberto(false)} className="text-gray-400 p-1" aria-label="Fechar"><X size={20} /></button>
            </div>

            {ITENS.map(({ k, titulo, porque, Icone }) => {
              const e = estado[k];
              return (
                <div key={k} className={`rounded-2xl border p-4 ${e === 'ok' ? 'border-green-200 bg-green-50/60' : 'border-gray-200 dark:border-darkBorder'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${e === 'ok' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                      {e === 'ok' ? <CheckCircle2 size={20} /> : <Icone size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{titulo}{e === 'ok' && <span className="text-green-600 font-semibold"> · ativada</span>}</p>
                      <p className="text-xs text-lightText dark:text-darkTextSecondary">{porque}</p>
                      {e === 'negado' && <p className="text-xs font-semibold text-red-600 mt-2">Está bloqueada no celular. {comoLiberar()}</p>}
                      {e === 'desligado' && <p className="text-xs font-semibold text-red-600 mt-2">A localização do celular está desligada. Puxe a barra de cima da tela e ligue a "Localização" (GPS). Depois toque em Ativar de novo.</p>}
                    </div>
                  </div>
                  {e !== 'ok' && (
                    <button onClick={() => ativar(k)} disabled={ocupado !== null}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-bold py-2.5 disabled:opacity-60">
                      {ocupado === k ? <Loader2 size={15} className="animate-spin" /> : null}
                      {e === 'negado' ? 'Já liberei, verificar de novo' : 'Ativar'}
                    </button>
                  )}
                </div>
              );
            })}

            <button onClick={() => setAberto(false)}
              className={`w-full rounded-xl py-3 text-sm font-bold ${tudoOk ? 'bg-green-600 text-white' : 'text-lightText dark:text-darkTextSecondary'}`}>
              {tudoOk ? 'Tudo certo, continuar' : 'Agora não'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
