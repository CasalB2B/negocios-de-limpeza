import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Send } from 'lucide-react';
import { ativarPush, estadoPush, testarPush, noAppNativo, type EstadoPush } from '../lib/push';

// Phone notifications status card (only inside the Android/iPhone app).
// modo 'perfil': always visible (collaborator profile). modo 'aviso' (admin dashboard): only while not active.
export const NotificacoesCelular: React.FC<{ modo?: 'perfil' | 'aviso' }> = ({ modo = 'perfil' }) => {
  const [estado, setEstado] = useState<EstadoPush>('indisponivel');
  const [acabouDeAtivar, setAcabouDeAtivar] = useState(false);
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [testado, setTestado] = useState(() => { try { return localStorage.getItem('ndl_push_testado') === '1'; } catch { return false; } });

  useEffect(() => { estadoPush().then(setEstado).catch(() => {}); }, []);
  if (!noAppNativo() || estado === 'indisponivel') return null;
  if (modo === 'aviso' && estado === 'ativo' && !acabouDeAtivar) return null;

  const ativar = async () => {
    setOcupado(true);
    const e = await ativarPush().catch(() => 'pendente' as EstadoPush);
    setEstado(e);
    if (e === 'ativo') setAcabouDeAtivar(true);
    setOcupado(false);
  };
  const testar = async () => {
    setOcupado(true);
    // Make sure this phone is registered before testing (no-op if it already is).
    await ativarPush().catch(() => {});
    const r = await testarPush();
    setMsg(r);
    if (r.startsWith('Pronto')) { setTestado(true); try { localStorage.setItem('ndl_push_testado', '1'); } catch {} }
    setOcupado(false);
  };

  return (
    <div className={`w-full p-4 rounded-2xl border shadow-sm ${estado === 'ativo' ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${estado === 'ativo' ? 'bg-green-50 text-green-600' : estado === 'negado' ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-primary'}`}>
          {estado === 'ativo' ? <CheckCircle2 size={22} /> : estado === 'negado' ? <BellOff size={22} /> : <Bell size={22} />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-darkText text-sm">Notificações no celular</p>
          <p className="text-xs text-lightText">
            {estado === 'ativo' ? 'Ativas: você recebe os avisos da agenda e dos pagamentos.'
              : estado === 'negado' ? 'Bloqueadas. Libere em Configurações do Android → Apps → Negócios de Limpeza → Notificações.'
              : 'Receba aviso de novos serviços, mudanças e lembretes.'}
          </p>
        </div>
        {estado === 'pendente' && (
          <button onClick={ativar} disabled={ocupado} className="shrink-0 rounded-xl bg-primary text-white text-xs font-bold px-3 py-2 disabled:opacity-60">Ativar</button>
        )}
        {estado === 'ativo' && (
          <button onClick={testar} disabled={ocupado} className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-gray-200 text-xs font-bold px-3 py-2 text-primary disabled:opacity-60"><Send size={12} /> Testar</button>
        )}
      </div>
      {msg && <p className="mt-2 text-xs text-lightText">{msg}</p>}
    </div>
  );
};
