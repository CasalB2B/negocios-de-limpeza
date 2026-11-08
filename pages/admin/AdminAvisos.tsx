import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Link2, Loader2, Send, Smartphone, Users } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';

// Notices from the company admin to the team, as phone notifications: meeting reminders, news, a link.
interface Pessoa { id: string; name: string; role: string; temApp: boolean }
interface Enviado { titulo: string; corpo: string; rota: string | null; criado_em: string; resultado: string | null; usuario_id: string }

const DESTINOS = [
  { id: 'equipe', rotulo: 'Toda a equipe', ajuda: 'Todas as profissionais com acesso ao app' },
  { id: 'admins', rotulo: 'Administradores', ajuda: 'Outras pessoas que gerenciam a empresa' },
  { id: 'escolher', rotulo: 'Escolher pessoas', ajuda: 'Marque quem vai receber' },
] as const;

const MODELOS = [
  { titulo: '📅 Reunião da equipe', corpo: 'Lembrete: reunião amanhã às 9h. Contamos com você!' },
  { titulo: '📢 Aviso importante', corpo: '' },
  { titulo: '🎉 Parabéns, equipe!', corpo: 'Obrigada pelo trabalho desta semana. Vocês arrasaram!' },
];

const campo = 'w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary';

export const AdminAvisos: React.FC = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [historico, setHistorico] = useState<Enviado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [destino, setDestino] = useState<'equipe' | 'admins' | 'escolher'>('equipe');
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [link, setLink] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const carregar = async () => {
    const { data } = await supabase.functions.invoke('push', { body: { acao: 'aviso_info' } });
    if (data?.ok) { setPessoas(data.pessoas || []); setHistorico(data.historico || []); }
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const alvo = useMemo(() => pessoas.filter(p =>
    destino === 'equipe' ? p.role === 'COLLABORATOR' : destino === 'admins' ? p.role === 'ADMIN' : escolhidos.has(String(p.id))), [pessoas, destino, escolhidos]);
  const comApp = alvo.filter(p => p.temApp).length;

  // Group the history by notice (same title + text + minute) to show "sent to N people".
  const enviados = useMemo(() => {
    const m = new Map<string, Enviado & { pessoas: number; ok: number }>();
    for (const h of historico) {
      const k = `${h.titulo}|${h.corpo}|${h.criado_em.slice(0, 16)}`;
      const atual = m.get(k) || { ...h, pessoas: 0, ok: 0 };
      atual.pessoas++;
      if ((h.resultado || '').includes('ok')) atual.ok++;
      m.set(k, atual);
    }
    return [...m.values()];
  }, [historico]);

  const enviar = async () => {
    setMsg(null);
    if (!titulo.trim() || !corpo.trim()) { setMsg({ ok: false, texto: 'Escreva o título e a mensagem.' }); return; }
    if (!alvo.length) { setMsg({ ok: false, texto: 'Escolha para quem enviar.' }); return; }
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke('push', {
      body: { acao: 'aviso', destino, usuarios: [...escolhidos], titulo, corpo, link },
    });
    let r = data;
    if (error && !data) { try { r = await (error as any)?.context?.json(); } catch { /* ignore */ } }
    setEnviando(false);
    if (r?.ok) {
      setMsg({ ok: true, texto: `Aviso enviado para ${r.pessoas} ${r.pessoas === 1 ? 'pessoa' : 'pessoas'}${r.comApp < r.pessoas ? ` (${r.comApp} com o app no celular)` : ''}.` });
      setTitulo(''); setCorpo(''); setLink('');
      carregar();
    } else setMsg({ ok: false, texto: r?.erro || 'Não foi possível enviar.' });
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><BellRing size={22} className="text-primary" /> Avisos para a equipe</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Mande uma notificação para o celular da equipe: lembrete de reunião, novidade, um link. Chega no app, sem gastar WhatsApp.</p>
        </header>

        <section className="rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-5 space-y-5">
          <div>
            <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Para quem</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {DESTINOS.map(d => (
                <button key={d.id} onClick={() => setDestino(d.id)}
                  className={`text-left rounded-xl border p-3 transition ${destino === d.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-darkBorder'}`}>
                  <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{d.rotulo}</p>
                  <p className="text-[11px] text-lightText">{d.ajuda}</p>
                </button>
              ))}
            </div>
            {destino === 'escolher' && (
              <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-gray-100 dark:border-darkBorder divide-y divide-gray-100 dark:divide-darkBorder">
                {pessoas.length === 0 && <p className="text-sm text-lightText p-3">{carregando ? 'Carregando...' : 'Ninguém com acesso ao app ainda.'}</p>}
                {pessoas.map(p => {
                  const id = String(p.id);
                  const marcado = escolhidos.has(id);
                  return (
                    <label key={id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-darkBg">
                      <input type="checkbox" className="accent-[#a163ff] w-4 h-4" checked={marcado}
                        onChange={() => setEscolhidos(s => { const n = new Set(s); marcado ? n.delete(id) : n.add(id); return n; })} />
                      <span className="flex-1 text-sm font-semibold text-darkText dark:text-darkTextPrimary">{p.name}</span>
                      <span className="text-[11px] text-lightText">{p.role === 'ADMIN' ? 'Admin' : 'Profissional'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.temApp ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.temApp ? 'com app' : 'sem app'}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="mt-2 text-xs text-lightText flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><Users size={13} /> {alvo.length} {alvo.length === 1 ? 'pessoa' : 'pessoas'}</span>
              <span className="inline-flex items-center gap-1"><Smartphone size={13} /> {comApp} com o app e notificações ligadas</span>
            </div>
            {alvo.length > comApp && <p className="mt-1 text-[11px] text-amber-700">Quem ainda não instalou o app não recebe. Mande o acesso em Profissionais → Dar acesso.</p>}
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {MODELOS.map(m => (
                <button key={m.titulo} onClick={() => { setTitulo(m.titulo); if (m.corpo) setCorpo(m.corpo); }}
                  className="text-xs font-semibold rounded-full border border-gray-200 dark:border-darkBorder px-3 py-1.5 text-lightText hover:border-primary hover:text-primary">{m.titulo}</button>
              ))}
            </div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Título</label>
            <input className={campo} maxLength={65} placeholder="Ex: 📅 Reunião da equipe" value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Mensagem</label>
            <textarea className={`${campo} min-h-[90px]`} maxLength={240} placeholder="Ex: Reunião amanhã às 9h na sede. Contamos com você!" value={corpo} onChange={e => setCorpo(e.target.value)} />
            <p className="text-[11px] text-lightText text-right">{corpo.length}/240</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5 flex items-center gap-1.5"><Link2 size={14} /> Link (opcional)</label>
            <input className={campo} type="url" placeholder="https://meet.google.com/... ou outro link" value={link} onChange={e => setLink(e.target.value)} />
            <p className="text-[11px] text-lightText mt-1">Ao tocar na notificação, abre este link.</p>
          </div>

          {(titulo || corpo) && (
            <div className="rounded-xl bg-gray-900 text-white p-3 flex gap-3 items-start">
              <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
              <div className="min-w-0">
                <p className="text-[11px] text-white/60">Negócios de Limpeza · agora</p>
                <p className="text-sm font-bold">{titulo || 'Título'}</p>
                <p className="text-sm text-white/85 break-words">{corpo || 'Mensagem'}</p>
              </div>
            </div>
          )}

          {msg && <p className={`text-sm font-semibold rounded-xl px-3 py-2 ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.texto}</p>}
          <button onClick={enviar} disabled={enviando}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover text-white font-bold py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Enviar aviso agora
          </button>
        </section>

        <section>
          <h2 className="font-bold text-darkText dark:text-darkTextPrimary mb-3">Avisos enviados</h2>
          {enviados.length === 0 && <p className="text-sm text-lightText">Nenhum aviso enviado ainda.</p>}
          <div className="space-y-2">
            {enviados.map((h, i) => (
              <div key={i} className="rounded-xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{h.titulo}</p>
                  <span className="text-[11px] text-lightText shrink-0">{new Date(h.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm text-lightText dark:text-darkTextSecondary">{h.corpo}</p>
                <p className="text-[11px] text-lightText mt-1 flex items-center gap-1"><Check size={12} className="text-green-600" /> Entregue em {h.ok} de {h.pessoas} {h.pessoas === 1 ? 'pessoa' : 'pessoas'}{h.rota ? ' · com link' : ''}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};
