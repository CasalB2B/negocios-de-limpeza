import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Headphones, Loader2, MessageCircle, Search, Settings, Ticket, X } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import { SuporteConversa, Chamado, STATUS_SUPORTE, CATEGORIAS_SUPORTE } from '../../components/SuporteConversa';

// Platform owner: support desk for every company (live chats and tickets) and the support settings
// (WhatsApp number, e-mail, hours, live chat on/off) shown to the companies in /suporte.

type Filtro = 'abertos' | 'chats' | 'desenvolvedor' | 'resolvidos';

export const AdminSuporte: React.FC = () => {
  const dono = localStorage.getItem('ndl_dono') === '1';
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [empresas, setEmpresas] = useState<Map<number, string>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('abertos');
  const [busca, setBusca] = useState('');
  const [meuNome, setMeuNome] = useState('Suporte');
  const [config, setConfig] = useState<{ whatsapp: string; email: string; horario: string; chat_ativo: boolean } | null>(null);
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [salvoConfig, setSalvoConfig] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from('suporte_chamados').select('*').order('atualizado_em', { ascending: false }).limit(300);
    setChamados((data as Chamado[]) ?? []);
    setCarregando(false);
    // Keep the open conversation's status in sync (e.g. Aberto → Em atendimento after a reply).
    setAberto(a => a ? ((data as Chamado[]) ?? []).find(x => x.id === a.id) ?? a : a);
    return (data as Chamado[]) ?? [];
  };

  useEffect(() => {
    if (!dono) return;
    (async () => {
      const { data: e } = await supabase.from('empresas').select('id, nome');
      setEmpresas(new Map((e ?? []).map((x: any) => [Number(x.id), x.nome])));
      const { data: c } = await supabase.from('suporte_config').select('whatsapp, email, horario, chat_ativo').eq('id', 1).maybeSingle();
      setConfig({ whatsapp: c?.whatsapp || '', email: c?.email || '', horario: c?.horario || '', chat_ativo: c?.chat_ativo !== false });
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data: me } = await supabase.from('app_users').select('name').eq('auth_id', u.user.id).maybeSingle();
        if (me?.name) setMeuNome(me.name);
      }
      const lista = await carregar();
      const id = new URLSearchParams(window.location.hash.split('?')[1] || '').get('c');
      if (id) { const x = lista.find(c => c.id === id); if (x) setAberto(x); }
    })();
    const canal = supabase.channel('suporte-dono')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suporte_chamados' }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const naoLido = (c: Chamado) => c.ultima_do_suporte === false && (!c.lido_suporte_em || c.atualizado_em > c.lido_suporte_em);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return chamados.filter(c => {
      if (filtro === 'abertos' && c.status === 'resolvido') return false;
      if (filtro === 'chats' && (c.canal !== 'chat' || c.status === 'resolvido')) return false;
      if (filtro === 'desenvolvedor' && c.status !== 'desenvolvedor') return false;
      if (filtro === 'resolvidos' && c.status !== 'resolvido') return false;
      if (!q) return true;
      return [c.assunto, c.autor_nome, c.autor_email, empresas.get(c.company_id), String(c.numero)].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [chamados, filtro, busca, empresas]);

  const mudarStatus = async (status: string) => {
    if (!aberto) return;
    setAberto({ ...aberto, status });
    setChamados(l => l.map(c => c.id === aberto.id ? { ...c, status } : c));
    await supabase.from('suporte_chamados').update({ status, atualizado_em: new Date().toISOString() }).eq('id', aberto.id);
  };

  const salvarConfig = async () => {
    if (!config) return;
    await supabase.from('suporte_config').update({ ...config, whatsapp: config.whatsapp.replace(/\D/g, '') || null, atualizado_em: new Date().toISOString() }).eq('id', 1);
    setSalvoConfig(true); setTimeout(() => setSalvoConfig(false), 2000);
  };

  if (!dono) return <Layout role={UserRole.ADMIN}><p className="text-sm text-lightText">Só o dono da plataforma acessa esta tela.</p></Layout>;

  const pendentes = chamados.filter(naoLido).length;

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="-m-4 md:m-0 h-[calc(100dvh-8.5rem)] md:h-[calc(100vh-6rem)] flex md:rounded-2xl overflow-hidden md:border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface">
        <aside className={`${aberto ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] shrink-0 flex-col border-r border-gray-100 dark:border-darkBorder`}>
          <div className="p-3 space-y-2 border-b border-gray-100 dark:border-darkBorder">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Headphones size={18} className="text-primary" /> Suporte das empresas</h1>
              <button onClick={() => setEditandoConfig(v => !v)} className="p-1.5 rounded-lg text-lightText hover:text-primary" title="Configurar o suporte" aria-label="Configurar o suporte"><Settings size={17} /></button>
            </div>
            {pendentes > 0 && <p className="text-xs font-bold text-primary">{pendentes} {pendentes === 1 ? 'atendimento esperando resposta' : 'atendimentos esperando resposta'}</p>}
            {editandoConfig && config && (
              <div className="rounded-xl bg-gray-50 dark:bg-darkBg p-3 space-y-2">
                <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary">O que as empresas veem em Suporte</p>
                <input value={config.whatsapp} onChange={e => setConfig({ ...config, whatsapp: e.target.value })} placeholder="WhatsApp do suporte (com DDI e DDD, ex.: 5527999990000)"
                  className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary" />
                <input value={config.email} onChange={e => setConfig({ ...config, email: e.target.value })} placeholder="E-mail do suporte"
                  className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary" />
                <input value={config.horario} onChange={e => setConfig({ ...config, horario: e.target.value })} placeholder="Horário (ex.: Segunda a sexta, das 8h às 18h)"
                  className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary" />
                <label className="flex items-center gap-2 text-xs font-semibold text-darkText dark:text-darkTextPrimary">
                  <input type="checkbox" className="accent-[#a163ff]" checked={config.chat_ativo} onChange={e => setConfig({ ...config, chat_ativo: e.target.checked })} /> Mostrar o "Conversar agora" (chat ao vivo)
                </label>
                <button onClick={salvarConfig} className="w-full py-2 rounded-lg bg-primary text-white text-xs font-bold flex items-center justify-center gap-1">{salvoConfig ? <><Check size={13} /> Salvo</> : 'Salvar'}</button>
              </div>
            )}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa, pessoa, assunto ou nº"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder text-sm outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {([['abertos', 'Abertos'], ['chats', 'Chats'], ['desenvolvedor', 'Desenvolvedor'], ['resolvidos', 'Resolvidos']] as [Filtro, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setFiltro(k)} className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${filtro === k ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {carregando && <p className="p-4 text-sm text-lightText flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando…</p>}
            {!carregando && lista.length === 0 && <p className="p-6 text-sm text-center text-lightText">Nada por aqui.</p>}
            {lista.map(c => (
              <button key={c.id} onClick={() => setAberto(c)} className={`w-full text-left px-3 py-3 border-b border-gray-50 dark:border-darkBorder flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-darkBg ${aberto?.id === c.id ? 'bg-primary/5' : ''}`}>
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{c.canal === 'chat' ? <MessageCircle size={16} /> : <Ticket size={16} />}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`flex-1 truncate text-sm ${naoLido(c) ? 'font-bold' : 'font-semibold'} text-darkText dark:text-darkTextPrimary`}>{c.canal === 'chat' ? 'Chat' : `#${c.numero}`} · {empresas.get(c.company_id) || `Empresa ${c.company_id}`}</span>
                    <span className="text-[10px] text-lightText shrink-0">{new Date(c.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  </span>
                  <span className="block text-xs text-lightText truncate">{c.autor_nome}{c.canal === 'chamado' ? ` · ${c.assunto}` : ''}</span>
                  <span className={`block text-xs truncate ${naoLido(c) ? 'text-primary font-semibold' : 'text-lightText'}`}>{c.ultima_msg}</span>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_SUPORTE[c.status]?.cls}`}>{STATUS_SUPORTE[c.status]?.label}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className={`${aberto ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
          {!aberto ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-lightText">
              <Headphones size={40} className="text-primary/30 mb-3" />
              <p className="text-sm max-w-sm">Escolha um atendimento. Você recebe uma notificação no celular quando uma empresa escreve.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-darkBorder space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setAberto(null)} className="md:hidden p-1 -ml-1 text-lightText" aria-label="Voltar"><ArrowLeft size={20} /></button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{aberto.canal === 'chat' ? 'Chat ao vivo' : `Chamado #${aberto.numero} · ${aberto.assunto}`}</p>
                    <p className="text-[11px] text-lightText truncate">{empresas.get(aberto.company_id) || `Empresa ${aberto.company_id}`} · {aberto.autor_nome} {aberto.autor_email ? `· ${aberto.autor_email}` : ''} · {CATEGORIAS_SUPORTE[aberto.categoria]}</p>
                  </div>
                  <button onClick={() => setAberto(null)} className="hidden md:block p-1 text-gray-400" aria-label="Fechar"><X size={18} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_SUPORTE).map(([k, v]) => (
                    <button key={k} onClick={() => mudarStatus(k)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${aberto.status === k ? `${v.cls} border-transparent` : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0"><SuporteConversa chamado={aberto} souSuporte meuNome={meuNome} onMudou={carregar} /></div>
            </>
          )}
        </section>
      </div>
    </Layout>
  );
};
