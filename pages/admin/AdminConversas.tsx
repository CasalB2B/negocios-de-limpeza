import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, CheckCheck, Clock, Loader2, MessageCircle, Paperclip, RotateCcw, Search, Send, Smartphone, UserCheck, X, Bot, Tag, Plus,
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import { empresaId } from '../../lib/empresa';
import { soLeitura } from '../../lib/acesso';
import { waAdmin } from '../../lib/whatsapp';

// "Conversas": the company's WhatsApp inside the system, like WhatsApp Web. With the official
// connection in coexistence mode the number keeps working on the phone; messages from clients,
// replies typed on the phone and the system's automatic messages all show up here, and the team
// can answer from here too. Data: whatsapp_contatos (one row per contact) + whatsapp_messages.

interface Contato {
  phone: string; nome: string | null; atendente_id: string | null; atendente_nome: string | null;
  status: 'aberta' | 'resolvida'; lida_em: string | null; ultima_msg: string | null; ultima_direcao: string | null; etiquetas?: string[];
  ultima_em: string | null; ultima_entrada_em: string | null;
}
interface Mensagem { id: string; direction: 'in' | 'out' | 'echo'; body: string | null; type: string | null; status: string | null; created_at: string; template_name?: string | null }

const soDigitos = (t: string) => (t || '').replace(/\D/g, '');
const formatarFone = (p: string) => {
  const d = soDigitos(p);
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${d}`;
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaOuHora = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return hora(iso);
  const ontem = new Date(hoje.getTime() - 86400000);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const tituloDia = (iso: string) => {
  const d = new Date(iso); const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === new Date(hoje.getTime() - 86400000).toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};
const naoLida = (c: Contato) => !!c.ultima_entrada_em && (!c.lida_em || c.ultima_entrada_em > c.lida_em);
const textoDe = (m: Mensagem) => {
  const b = m.body || '';
  const tipos: Record<string, string> = { '[image]': '📷 Foto', '[audio]': '🎤 Áudio', '[video]': '🎬 Vídeo', '[document]': '📄 Documento', '[sticker]': 'Figurinha', '[location]': '📍 Localização', '[reaction]': 'Reação' };
  return tipos[b] || b || (m.type ? `[${m.type}]` : '');
};

type Filtro = 'todas' | 'naolidas' | 'minhas' | 'resolvidas';

// Our own labels (the WhatsApp Business app labels are not shared by Meta). Each company edits its list.
interface Etiqueta { id?: string; nome: string; cor: string }
const CORES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800', orange: 'bg-orange-100 text-orange-800', sky: 'bg-sky-100 text-sky-800',
  green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-700', violet: 'bg-violet-100 text-violet-800', gray: 'bg-gray-100 text-gray-700',
};
const ETIQUETAS_PADRAO: Etiqueta[] = [
  { nome: 'Entrar em contato', cor: 'amber' }, { nome: 'Enviar orçamento', cor: 'orange' }, { nome: 'Orçamento enviado', cor: 'sky' },
  { nome: 'Cliente', cor: 'green' }, { nome: 'Urgente', cor: 'red' }, { nome: 'Pós-venda', cor: 'violet' },
];
const corDa = (lista: Etiqueta[], nome: string) => CORES[lista.find(e => e.nome === nome)?.cor || 'gray'] || CORES.gray;

export const AdminConversas: React.FC = () => {
  const navigate = useNavigate();
  const leitura = soLeitura('/admin/conversas');
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [clientes, setClientes] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [aberto, setAberto] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [janelaAberta, setJanelaAberta] = useState<boolean | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [eu, setEu] = useState<{ id: string; nome: string } | null>(null);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null);
  const [editandoEtiquetas, setEditandoEtiquetas] = useState(false);
  const [novaEtiqueta, setNovaEtiqueta] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const abertoRef = useRef<string | null>(null);
  abertoRef.current = aberto;

  const carregarContatos = async () => {
    const { data } = await supabase.from('whatsapp_contatos').select('*').eq('company_id', empresaId()).order('ultima_em', { ascending: false, nullsFirst: false }).limit(300);
    setContatos((data as Contato[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      // The connection table is server-only (it holds the token): ask the WhatsApp function for the status.
      const st = await waAdmin('status', { company_id: empresaId() }).catch(() => null);
      setConectado(!!st?.ok && !!st.connection && st.connection.status !== 'disconnected');
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        const { data: me } = await supabase.from('app_users').select('id, name').eq('auth_id', u.user.id).maybeSingle();
        if (me) setEu({ id: String(me.id), nome: me.name || 'Eu' });
      }
      const { data: cli } = await supabase.from('app_users').select('id, name, phone').eq('role', 'CLIENT').not('phone', 'is', null).limit(5000);
      const mapa = new Map<string, { id: string; name: string }>();
      for (const x of cli ?? []) {
        const d = soDigitos(x.phone || '');
        if (d.length >= 10) mapa.set((d.startsWith('55') ? d : '55' + d).slice(-11), { id: String(x.id), name: x.name });
      }
      setClientes(mapa);
      const { data: et } = await supabase.from('whatsapp_etiquetas').select('id, nome, cor').eq('company_id', empresaId()).order('ordem');
      if (et?.length) setEtiquetas(et as Etiqueta[]);
      else {
        const { data: criadas } = await supabase.from('whatsapp_etiquetas')
          .insert(ETIQUETAS_PADRAO.map((e, i) => ({ ...e, ordem: i, company_id: empresaId() }))).select('id, nome, cor');
        setEtiquetas((criadas as Etiqueta[]) ?? ETIQUETAS_PADRAO);
      }
      await carregarContatos();
      // Coming from Orçamentos: ?fone=55279... opens that conversation.
      const fone = new URLSearchParams((window.location.hash.split('?')[1] || '')).get('fone');
      if (fone) abrir(fone.startsWith('55') ? fone : '55' + fone);
    })();
    // Live: new messages and contact changes (RLS keeps it to this company).
    const canal = supabase.channel('conversas')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (p: any) => {
        const m = p.new as Mensagem & { phone: string };
        if (m.phone === abertoRef.current) {
          setMensagens(l => l.some(x => x.id === m.id) ? l : [...l, m]);
          if (m.direction === 'in') marcarLida(m.phone);
        }
        carregarContatos();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages' }, (p: any) => {
        const m = p.new as Mensagem;
        setMensagens(l => l.map(x => x.id === m.id ? { ...x, status: m.status } : x));
      })
      .subscribe();
    const t = window.setInterval(carregarContatos, 30000);
    return () => { supabase.removeChannel(canal); window.clearInterval(t); };
  }, []);

  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [mensagens, aberto]);

  const marcarLida = async (phone: string) => {
    const agora = new Date().toISOString();
    setContatos(l => l.map(c => c.phone === phone ? { ...c, lida_em: agora } : c));
    await supabase.from('whatsapp_contatos').update({ lida_em: agora }).eq('company_id', empresaId()).eq('phone', phone);
  };

  const abrir = async (phone: string) => {
    setAberto(phone); setAviso(''); setTexto(''); setJanelaAberta(null);
    setCarregandoMsgs(true);
    const { data } = await supabase.from('whatsapp_messages').select('id, direction, body, type, status, created_at, template_name')
      .eq('company_id', empresaId()).eq('phone', phone).order('created_at', { ascending: false }).limit(300);
    setMensagens(((data as Mensagem[]) ?? []).reverse());
    setCarregandoMsgs(false);
    marcarLida(phone);
    supabase.functions.invoke('whatsapp-send', { body: { action: 'window', payload: { number: phone } } })
      .then(({ data: w }) => setJanelaAberta(w?.ok ? !!w.open : null)).catch(() => {});
  };

  const nomeDe = (c: Contato) => clientes.get(soDigitos(c.phone).slice(-11))?.name || c.nome || formatarFone(c.phone);
  const clienteDe = (phone: string) => clientes.get(soDigitos(phone).slice(-11));

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return contatos.filter(c => {
      if (filtroEtiqueta && !(c.etiquetas || []).includes(filtroEtiqueta)) return false;
      if (filtro === 'naolidas' && !naoLida(c)) return false;
      if (filtro === 'minhas' && c.atendente_id !== eu?.id) return false;
      if (filtro === 'resolvidas' ? c.status !== 'resolvida' : filtro !== 'todas' && c.status === 'resolvida') return false;
      if (!q) return true;
      return nomeDe(c).toLowerCase().includes(q) || soDigitos(c.phone).includes(soDigitos(q) || '##') || (c.ultima_msg || '').toLowerCase().includes(q);
    });
  }, [contatos, busca, filtro, filtroEtiqueta, clientes, eu]);

  const contato = contatos.find(c => c.phone === aberto) || null;

  const enviar = async () => {
    const t = texto.trim();
    if (!t || !aberto || enviando) return;
    setEnviando(true); setAviso('');
    const { data, error } = await supabase.functions.invoke('whatsapp-send', { body: { action: 'sendText', payload: { number: aberto, text: t } } });
    setEnviando(false);
    if (error || !data?.ok) {
      const fora = data?.code === 131047 || String(data?.error || '').includes('24');
      setAviso(fora ? 'O cliente não mandou mensagem nas últimas 24 horas. Pela regra do WhatsApp, só dá para responder pelo celular ou com um modelo aprovado (tela WhatsApp → Modelos).' : (data?.error || 'Não foi possível enviar.'));
      if (fora) setJanelaAberta(false);
      return;
    }
    setTexto('');
    if (contato && !contato.atendente_id && eu) assumir();
  };

  const enviarArquivo = async (f: File | undefined) => {
    if (!f || !aberto) return;
    if (f.size > 15_000_000) { setAviso('Arquivo grande demais (máximo 15 MB).'); return; }
    setEnviando(true); setAviso('');
    const base64 = await new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.readAsDataURL(f); });
    const tipo = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'document';
    const { data } = await supabase.functions.invoke('whatsapp-send', { body: { action: 'sendMedia', payload: { number: aberto, base64, mimeType: f.type || 'application/octet-stream', mediaType: tipo, fileName: f.name, caption: texto.trim() } } });
    setEnviando(false);
    if (arquivoRef.current) arquivoRef.current.value = '';
    if (!data?.ok) { setAviso(data?.error || 'Não foi possível enviar o arquivo.'); return; }
    setTexto('');
  };

  const assumir = async () => {
    if (!aberto || !eu) return;
    setContatos(l => l.map(c => c.phone === aberto ? { ...c, atendente_id: eu.id, atendente_nome: eu.nome } : c));
    await supabase.from('whatsapp_contatos').update({ atendente_id: eu.id, atendente_nome: eu.nome }).eq('company_id', empresaId()).eq('phone', aberto);
  };
  const mudarStatus = async (status: 'aberta' | 'resolvida') => {
    if (!aberto) return;
    setContatos(l => l.map(c => c.phone === aberto ? { ...c, status } : c));
    await supabase.from('whatsapp_contatos').update({ status }).eq('company_id', empresaId()).eq('phone', aberto);
  };

  const alternarEtiqueta = async (nome: string) => {
    if (!aberto) return;
    const atual = contatos.find(c => c.phone === aberto)?.etiquetas || [];
    const nova = atual.includes(nome) ? atual.filter(x => x !== nome) : [...atual, nome];
    setContatos(l => l.map(c => c.phone === aberto ? { ...c, etiquetas: nova } : c));
    await supabase.from('whatsapp_contatos').update({ etiquetas: nova }).eq('company_id', empresaId()).eq('phone', aberto);
  };
  const criarEtiqueta = async () => {
    const nome = novaEtiqueta.trim().slice(0, 30);
    if (!nome || etiquetas.some(e => e.nome.toLowerCase() === nome.toLowerCase())) { setNovaEtiqueta(''); return; }
    const cores = Object.keys(CORES);
    const cor = cores[etiquetas.length % cores.length];
    const { data } = await supabase.from('whatsapp_etiquetas').insert({ company_id: empresaId(), nome, cor, ordem: etiquetas.length }).select('id, nome, cor').single();
    setEtiquetas(l => [...l, (data as Etiqueta) ?? { nome, cor }]);
    setNovaEtiqueta('');
    if (aberto) alternarEtiqueta(nome);
  };
  const apagarEtiqueta = async (e: Etiqueta) => {
    if (!window.confirm(`Apagar a etiqueta "${e.nome}"? Ela sai de todas as conversas.`)) return;
    if (e.id) await supabase.from('whatsapp_etiquetas').delete().eq('id', e.id);
    setEtiquetas(l => l.filter(x => x.nome !== e.nome));
    const comEla = contatos.filter(c => (c.etiquetas || []).includes(e.nome));
    setContatos(l => l.map(c => ({ ...c, etiquetas: (c.etiquetas || []).filter(x => x !== e.nome) })));
    for (const c of comEla) await supabase.from('whatsapp_contatos').update({ etiquetas: (c.etiquetas || []).filter(x => x !== e.nome) }).eq('company_id', empresaId()).eq('phone', c.phone);
    if (filtroEtiqueta === e.nome) setFiltroEtiqueta(null);
  };

  const qtdNaoLidas = contatos.filter(c => c.status !== 'resolvida' && naoLida(c)).length;

  if (conectado === false) {
    return (
      <Layout role={UserRole.ADMIN}>
        <div className="max-w-lg mx-auto mt-10 text-center bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-3xl p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto"><MessageCircle size={26} /></div>
          <h1 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Conecte o WhatsApp da empresa</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary">Com a conexão oficial (coexistência), o número continua funcionando no celular e todas as conversas aparecem aqui, como um WhatsApp Web, para a equipe responder.</p>
          <button onClick={() => navigate('/admin/whatsapp')} className="px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-bold">Conectar WhatsApp</button>
        </div>
      </Layout>
    );
  }

  const cli = aberto ? clienteDe(aberto) : undefined;

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="-m-4 md:m-0 h-[calc(100dvh-8.5rem)] md:h-[calc(100vh-6rem)] flex rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface">
        {/* Conversation list */}
        <aside className={`${aberto ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] shrink-0 flex-col border-r border-gray-100 dark:border-darkBorder`}>
          <div className="p-3 space-y-2 border-b border-gray-100 dark:border-darkBorder">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><MessageCircle size={18} className="text-green-600" /> Conversas</h1>
              {qtdNaoLidas > 0 && <span className="text-[11px] font-bold bg-green-600 text-white rounded-full px-2 py-0.5">{qtdNaoLidas} não lidas</span>}
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome, número ou mensagem"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder text-sm outline-none focus:border-green-500 text-darkText dark:text-darkTextPrimary" />
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {([['todas', 'Abertas'], ['naolidas', 'Não lidas'], ['minhas', 'Minhas'], ['resolvidas', 'Resolvidas']] as [Filtro, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setFiltro(k)}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${filtro === k ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText'}`}>{l}</button>
              ))}
            </div>
            {etiquetas.length > 0 && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar items-center">
                <Tag size={12} className="text-gray-400 shrink-0" />
                {etiquetas.map(e => (
                  <button key={e.nome} onClick={() => setFiltroEtiqueta(f => f === e.nome ? null : e.nome)}
                    className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${CORES[e.cor] || CORES.gray} ${filtroEtiqueta === e.nome ? 'ring-2 ring-offset-1 ring-green-600' : filtroEtiqueta ? 'opacity-50' : ''}`}>{e.nome}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {conectado === null && <p className="p-4 text-sm text-lightText flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando…</p>}
            {conectado && lista.length === 0 && (
              <p className="p-6 text-sm text-center text-lightText">{contatos.length ? 'Nenhuma conversa neste filtro.' : 'Ainda não há conversas. Quando alguém mandar mensagem para o WhatsApp da empresa, ela aparece aqui.'}</p>
            )}
            {lista.map(c => {
              const nl = naoLida(c);
              return (
                <button key={c.phone} onClick={() => abrir(c.phone)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gray-50 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBg ${aberto === c.phone ? 'bg-green-50/60 dark:bg-green-900/10' : ''}`}>
                  <span className="w-11 h-11 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold shrink-0">{nomeDe(c).replace(/[^\p{L}\d]/gu, '').charAt(0).toUpperCase() || '#'}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`flex-1 truncate text-sm ${nl ? 'font-bold' : 'font-semibold'} text-darkText dark:text-darkTextPrimary`}>{nomeDe(c)}</span>
                      <span className={`text-[11px] shrink-0 ${nl ? 'text-green-600 font-bold' : 'text-lightText'}`}>{diaOuHora(c.ultima_em)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      {c.ultima_direcao !== 'in' && <CheckCheck size={13} className="text-gray-400 shrink-0" />}
                      <span className={`flex-1 truncate text-xs ${nl ? 'text-darkText dark:text-darkTextPrimary font-semibold' : 'text-lightText'}`}>{textoDe({ body: c.ultima_msg } as Mensagem)}</span>
                      {nl && <span className="w-2.5 h-2.5 rounded-full bg-green-600 shrink-0" />}
                    </span>
                    {(c.etiquetas || []).length > 0 && (
                      <span className="flex flex-wrap gap-1 mt-1">{(c.etiquetas || []).map(n => <span key={n} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${corDa(etiquetas, n)}`}>{n}</span>)}</span>
                    )}
                    {(c.atendente_nome || c.status === 'resolvida') && (
                      <span className="block text-[10px] text-lightText mt-0.5">{c.status === 'resolvida' ? '✓ Resolvida' : `Atendendo: ${c.atendente_nome}`}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Chat */}
        <section className={`${aberto ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col bg-[#efeae2] dark:bg-darkBg`}>
          {!aberto || !contato ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-lightText">
              <MessageCircle size={40} className="text-green-600/40 mb-3" />
              <p className="font-bold text-darkText dark:text-darkTextPrimary">WhatsApp da empresa</p>
              <p className="text-sm max-w-sm mt-1">Escolha uma conversa. As mensagens respondidas no celular também aparecem aqui, e o que a equipe responder daqui chega no cliente pelo mesmo número.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder">
                <button onClick={() => setAberto(null)} className="md:hidden p-1.5 -ml-1 text-lightText" aria-label="Voltar"><ArrowLeft size={20} /></button>
                <span className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold shrink-0">{nomeDe(contato).charAt(0).toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{nomeDe(contato)}</p>
                  <p className="text-[11px] text-lightText truncate">{formatarFone(contato.phone)}{cli ? ' · cliente cadastrado' : ''}{contato.atendente_nome ? ` · atendendo: ${contato.atendente_nome}` : ''}</p>
                </div>
                {!leitura && (
                  <div className="flex items-center gap-1 shrink-0">
                    {cli
                      ? <button onClick={() => navigate('/admin/clients')} className="hidden xl:inline-flex text-xs font-bold px-2.5 py-1.5 rounded-lg text-primary hover:bg-primary/5">Ver cliente</button>
                      : <button onClick={() => navigate('/admin/clients')} className="hidden xl:inline-flex text-xs font-bold px-2.5 py-1.5 rounded-lg text-primary hover:bg-primary/5">Cadastrar cliente</button>}
                    <button onClick={() => navigate(`/admin/orcamentos?novo=1&nome=${encodeURIComponent(cli?.name || contato.nome || '')}&fone=${contato.phone}`)} className="inline-flex text-xs font-bold px-2.5 py-1.5 rounded-lg text-primary hover:bg-primary/5">Orçamento</button>
                    <button onClick={() => navigate('/admin/calendar')} className="hidden xl:inline-flex text-xs font-bold px-2.5 py-1.5 rounded-lg text-primary hover:bg-primary/5">Agendar</button>
                    {contato.atendente_id !== eu?.id && (
                      <button onClick={assumir} title="Eu vou atender" className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700"><UserCheck size={14} /> <span className="hidden lg:inline">Atender</span></button>
                    )}
                    {contato.status === 'aberta'
                      ? <button onClick={() => mudarStatus('resolvida')} title="Marcar como resolvida" className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-darkBg text-lightText"><Check size={14} /> <span className="hidden lg:inline">Resolver</span></button>
                      : <button onClick={() => mudarStatus('aberta')} title="Reabrir" className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-darkBg text-lightText"><RotateCcw size={14} /> <span className="hidden lg:inline">Reabrir</span></button>}
                  </div>
                )}
              </header>
              <div className="px-3 py-1.5 bg-white/80 dark:bg-darkSurface/80 border-b border-gray-100 dark:border-darkBorder flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <Tag size={12} className="text-gray-400 shrink-0" />
                {(contato.etiquetas || []).map(n => (
                  <span key={n} className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${corDa(etiquetas, n)}`}>
                    {n}{!leitura && <button onClick={() => alternarEtiqueta(n)} aria-label={`Tirar ${n}`}><X size={10} /></button>}
                  </span>
                ))}
                {!leitura && (
                  <button onClick={() => setEditandoEtiquetas(v => !v)} className="shrink-0 text-[11px] font-bold text-green-700 px-2 py-0.5 rounded-full border border-dashed border-green-300">
                    {editandoEtiquetas ? 'Fechar' : (contato.etiquetas || []).length ? '+ etiqueta' : '+ Adicionar etiqueta'}
                  </button>
                )}
              </div>
              {editandoEtiquetas && !leitura && (
                <div className="px-3 py-2 bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {etiquetas.map(e => {
                      const tem = (contato.etiquetas || []).includes(e.nome);
                      return (
                        <span key={e.nome} className={`inline-flex items-center gap-1 text-xs font-bold pl-2.5 pr-1.5 py-1 rounded-full ${CORES[e.cor] || CORES.gray} ${tem ? 'ring-2 ring-green-600' : ''}`}>
                          <button onClick={() => alternarEtiqueta(e.nome)} className="inline-flex items-center gap-1">{tem && <Check size={11} />}{e.nome}</button>
                          <button onClick={() => apagarEtiqueta(e)} className="opacity-40 hover:opacity-100" aria-label={`Apagar etiqueta ${e.nome}`}><X size={11} /></button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input value={novaEtiqueta} onChange={e => setNovaEtiqueta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') criarEtiqueta(); }}
                      placeholder="Nova etiqueta (ex.: Retornar amanhã)" maxLength={30}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder text-xs outline-none focus:border-green-500 text-darkText dark:text-darkTextPrimary" />
                    <button onClick={criarEtiqueta} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold"><Plus size={12} /> Criar</button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-3 md:px-8 py-4 space-y-1.5">
                {carregandoMsgs && <p className="text-center text-xs text-lightText"><Loader2 size={14} className="inline animate-spin" /> Carregando…</p>}
                {mensagens.map((m, i) => {
                  const minha = m.direction !== 'in';
                  const novoDia = i === 0 || new Date(mensagens[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString();
                  return (
                    <React.Fragment key={m.id}>
                      {novoDia && <div className="flex justify-center my-2"><span className="text-[11px] font-semibold bg-white/90 dark:bg-darkSurface text-lightText px-3 py-1 rounded-lg shadow-sm capitalize">{tituloDia(m.created_at)}</span></div>}
                      <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] md:max-w-[65%] rounded-xl px-3 py-1.5 shadow-sm text-sm whitespace-pre-wrap break-words ${minha ? 'bg-[#d9fdd3] dark:bg-[#005c4b] dark:text-white rounded-tr-sm' : 'bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary rounded-tl-sm'}`}>
                          {minha && m.direction === 'out' && (m.template_name ? <p className="text-[10px] font-bold text-green-700 dark:text-green-300 flex items-center gap-1 mb-0.5"><Bot size={11} /> Automático · {m.template_name}</p> : null)}
                          <span>{textoDe(m)}</span>
                          <span className="float-right ml-2 mt-1 flex items-center gap-1 text-[10px] text-gray-500 dark:text-white/60">
                            {m.direction === 'echo' && <Smartphone size={10} />}
                            {hora(m.created_at)}
                            {minha && (m.status === 'read' ? <CheckCheck size={13} className="text-sky-500" /> : m.status === 'delivered' ? <CheckCheck size={13} /> : m.status === 'failed' ? <X size={12} className="text-red-500" /> : <Check size={12} />)}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={fimRef} />
              </div>

              {(aviso || janelaAberta === false) && (
                <div className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2">
                  <Clock size={14} className="shrink-0 mt-0.5" />
                  <span>{aviso || 'Faz mais de 24 horas que o cliente mandou mensagem. Pela regra do WhatsApp, só dá para responder pelo celular ou com um modelo aprovado (tela WhatsApp → Modelos).'}</span>
                </div>
              )}

              {leitura ? (
                <p className="px-4 py-3 text-xs text-lightText bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder">Você pode ler as conversas, mas não responder.</p>
              ) : (
                <div className="flex items-end gap-2 px-3 py-2.5 bg-white dark:bg-darkSurface border-t border-gray-100 dark:border-darkBorder" style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))' }}>
                  <input ref={arquivoRef} type="file" className="hidden" accept="image/*,application/pdf,video/*,audio/*" onChange={e => enviarArquivo(e.target.files?.[0])} />
                  <button onClick={() => arquivoRef.current?.click()} disabled={enviando} className="w-10 h-10 shrink-0 rounded-full text-lightText hover:text-green-600 flex items-center justify-center" aria-label="Enviar foto ou arquivo"><Paperclip size={19} /></button>
                  <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={texto.length > 60 ? 3 : 1}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                    placeholder="Digite uma mensagem"
                    className="flex-1 resize-none max-h-32 rounded-2xl bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder px-3.5 py-2.5 text-sm outline-none focus:border-green-500 text-darkText dark:text-darkTextPrimary" />
                  <button onClick={enviar} disabled={!texto.trim() || enviando} className="w-10 h-10 shrink-0 rounded-full bg-green-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="Enviar">
                    {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Layout>
  );
};
