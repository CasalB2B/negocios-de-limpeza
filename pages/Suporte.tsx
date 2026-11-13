import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Copy, Headphones, Loader2, MessageCircle, Plus, Sparkles, Ticket, X } from 'lucide-react';
import { Layout } from '../components/Layout';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { empresaId } from '../lib/empresa';
import { reduzirFoto } from '../lib/foto';
import { SuporteConversa, Chamado, STATUS_SUPORTE, CATEGORIAS_SUPORTE } from '../components/SuporteConversa';

// Support of the platform for each company: live chat with the support team, tickets that go to the
// developer when needed, and the support WhatsApp number (set by the platform owner).

interface Config { whatsapp: string | null; email: string | null; horario: string | null; chat_ativo: boolean }

export const Suporte: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const [novo, setNovo] = useState<{ assunto: string; categoria: string; descricao: string; print: { url: string; nome: string } | null } | null>(null);
  const [eu, setEu] = useState<{ nome: string; email: string }>({ nome: '', email: '' });
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from('suporte_chamados').select('*').eq('company_id', empresaId()).order('atualizado_em', { ascending: false }).limit(100);
    setChamados((data as Chamado[]) ?? []);
    setCarregando(false);
    // Keep the open conversation's status in sync (e.g. Aberto → Em atendimento after a reply).
    setAberto(a => a ? ((data as Chamado[]) ?? []).find(x => x.id === a.id) ?? a : a);
    return (data as Chamado[]) ?? [];
  };

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('suporte_config').select('whatsapp, email, horario, chat_ativo').eq('id', 1).maybeSingle();
      setConfig((c as Config) ?? null);
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data: me } = await supabase.from('app_users').select('name, email').eq('auth_id', u.user.id).maybeSingle();
        setEu({ nome: me?.name || 'Cliente', email: me?.email || u.user.email || '' });
      }
      const lista = await carregar();
      const id = new URLSearchParams(window.location.hash.split('?')[1] || '').get('c');
      if (id) { const c2 = lista.find(x => x.id === id); if (c2) setAberto(c2); }
    })();
  }, []);

  const chatAberto = chamados.find(c => c.canal === 'chat' && c.status !== 'resolvido');

  const conversarAgora = async () => {
    if (chatAberto) { setAberto(chatAberto); return; }
    setSalvando(true);
    const { data } = await supabase.from('suporte_chamados').insert({
      company_id: empresaId(), canal: 'chat', autor_nome: eu.nome, autor_email: eu.email, assunto: 'Conversa com o suporte', categoria: 'duvida',
    }).select('*').single();
    setSalvando(false);
    if (data) { setChamados(l => [data as Chamado, ...l]); setAberto(data as Chamado); }
  };

  const abrirChamado = async () => {
    if (!novo || !novo.assunto.trim() || !novo.descricao.trim()) return;
    setSalvando(true);
    const { data } = await supabase.from('suporte_chamados').insert({
      company_id: empresaId(), canal: 'chamado', autor_nome: eu.nome, autor_email: eu.email, assunto: novo.assunto.trim().slice(0, 120), categoria: novo.categoria,
    }).select('*').single();
    if (data) {
      await supabase.from('suporte_mensagens').insert({ chamado_id: data.id, autor_nome: eu.nome, do_suporte: false, texto: novo.descricao.trim(), anexo: novo.print?.url ?? null, anexo_nome: novo.print?.nome ?? null });
      const lista = await carregar();
      setAberto(lista.find(x => x.id === data.id) ?? (data as Chamado));
    }
    setSalvando(false);
    setNovo(null);
  };

  const naoLido = (c: Chamado) => !!c.ultima_do_suporte && (!c.lido_cliente_em || c.atualizado_em > c.lido_cliente_em);
  const wa = (config?.whatsapp || '').replace(/\D/g, '');

  if (aberto) {
    return (
      <Layout role={UserRole.ADMIN}>
        <div className="-m-4 md:m-0 h-[calc(100dvh-8.5rem)] md:h-[calc(100vh-6rem)] flex flex-col md:rounded-2xl overflow-hidden md:border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-darkBorder">
            <button onClick={() => { setAberto(null); carregar(); }} className="p-1.5 -ml-1 text-lightText" aria-label="Voltar"><ArrowLeft size={20} /></button>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{aberto.canal === 'chat' ? 'Conversa com o suporte' : `Chamado #${aberto.numero} · ${aberto.assunto}`}</p>
              <p className="text-[11px] text-lightText">{config?.horario || ''}</p>
            </div>
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_SUPORTE[aberto.status]?.cls}`}>{STATUS_SUPORTE[aberto.status]?.label}</span>
          </div>
          <div className="flex-1 min-h-0"><SuporteConversa chamado={aberto} souSuporte={false} meuNome={eu.nome} onMudou={carregar} /></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Headphones size={22} className="text-primary" /> Suporte</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary">Fale com a equipe da Negócios de Limpeza Gestão. {config?.horario ? `Atendimento: ${config.horario}.` : ''}</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => navigate('/ajuda')} className="text-left rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface p-4 hover:border-primary">
            <BookOpen size={20} className="text-primary" />
            <p className="font-bold text-sm mt-2 text-darkText dark:text-darkTextPrimary">Central de Ajuda</p>
            <p className="text-xs text-lightText">Passo a passo de cada tela. Ou pergunte ao assistente <Sparkles size={11} className="inline" />.</p>
          </button>
          {config?.chat_ativo !== false && (
            <button onClick={conversarAgora} disabled={salvando} className="text-left rounded-2xl border-2 border-primary bg-primary/5 p-4">
              <MessageCircle size={20} className="text-primary" />
              <p className="font-bold text-sm mt-2 text-darkText dark:text-darkTextPrimary">{chatAberto ? 'Continuar a conversa' : 'Conversar agora'}</p>
              <p className="text-xs text-lightText">Uma pessoa do suporte responde por aqui, ao vivo.</p>
            </button>
          )}
          <button onClick={() => setNovo({ assunto: '', categoria: 'erro', descricao: '', print: null })} className="text-left rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface p-4 hover:border-primary">
            <Ticket size={20} className="text-primary" />
            <p className="font-bold text-sm mt-2 text-darkText dark:text-darkTextPrimary">Abrir chamado</p>
            <p className="text-xs text-lightText">Erro ou pedido que precisa de mais tempo. Você acompanha cada etapa.</p>
          </button>
        </div>

        {wa.length >= 10 && (
          <div className="rounded-2xl border border-green-200 bg-green-50/60 dark:bg-green-900/10 p-4 flex items-center gap-3 flex-wrap">
            <MessageCircle size={20} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">WhatsApp do suporte</p>
              <p className="text-sm text-green-800 dark:text-green-300 font-semibold select-all">+{wa}</p>
            </div>
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Olá! Preciso de ajuda com o sistema Negócios de Limpeza Gestão.')}`} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold">Chamar no WhatsApp</a>
            <button onClick={() => { navigator.clipboard?.writeText('+' + wa); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="px-3 py-2 rounded-xl border border-green-200 text-green-700 text-xs font-bold flex items-center gap-1"><Copy size={13} /> {copiado ? 'Copiado' : 'Copiar'}</button>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Seus atendimentos</p>
          <div className="rounded-2xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface divide-y divide-gray-100 dark:divide-darkBorder">
            {carregando && <p className="p-4 text-sm text-lightText flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando…</p>}
            {!carregando && chamados.length === 0 && <p className="p-5 text-sm text-center text-lightText">Nenhum atendimento ainda.</p>}
            {chamados.map(c => (
              <button key={c.id} onClick={() => setAberto(c)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-darkBg">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{c.canal === 'chat' ? <MessageCircle size={16} /> : <Ticket size={16} />}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-darkText dark:text-darkTextPrimary truncate">{c.canal === 'chat' ? 'Conversa com o suporte' : `#${c.numero} · ${c.assunto}`}</span>
                  <span className={`block text-xs truncate ${naoLido(c) ? 'text-primary font-semibold' : 'text-lightText'}`}>{c.ultima_do_suporte ? 'Suporte: ' : ''}{c.ultima_msg || CATEGORIAS_SUPORTE[c.categoria]}</span>
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_SUPORTE[c.status]?.cls}`}>{STATUS_SUPORTE[c.status]?.label}</span>
                  {naoLido(c) && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {novo && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setNovo(null)}>
          <div className="w-full sm:max-w-lg bg-white dark:bg-darkSurface rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Abrir chamado</h2><button onClick={() => setNovo(null)} className="text-gray-400"><X size={20} /></button></div>
            <select value={novo.categoria} onChange={e => setNovo({ ...novo, categoria: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder text-sm text-darkText dark:text-darkTextPrimary">
              {Object.entries(CATEGORIAS_SUPORTE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <input value={novo.assunto} onChange={e => setNovo({ ...novo, assunto: e.target.value })} maxLength={120} placeholder="Assunto (ex.: não consigo salvar um cliente)"
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder text-sm outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
            <textarea value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} placeholder="Conte o que aconteceu: em qual tela, o que você fez e o que apareceu."
              className="w-full min-h-[120px] p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder text-sm outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
            <label className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer">
              <Plus size={15} /> {novo.print ? `Print: ${novo.print.nome}` : 'Anexar print da tela (ajuda muito)'}
              <input type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) setNovo({ ...novo, print: { url: await reduzirFoto(f, 1400, 0.8), nome: f.name || 'print.jpg' } }); }} />
            </label>
            {novo.print && <img src={novo.print.url} alt="" className="max-h-40 rounded-xl" />}
            <p className="text-[11px] text-lightText">Você recebe o aviso no celular quando o suporte responder. Responderemos também pelo e-mail {eu.email || 'do seu cadastro'}, se precisar.</p>
            <button onClick={abrirChamado} disabled={salvando || !novo.assunto.trim() || !novo.descricao.trim()} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
              {salvando ? 'Enviando…' : 'Abrir chamado'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};
