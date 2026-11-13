import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { CalendarPlus, Check, Copy, Loader2, MessageCircle, Phone, Plus, Search, Send, Trash2, X } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { supabase } from '../../lib/supabase';
import { empresaId } from '../../lib/empresa';
import { soLeitura } from '../../lib/acesso';

// Atendimento → Orçamentos: the sales funnel of each contact who asked for a price
// (from WhatsApp, the site chat or added by hand). Drag the cards between the stages.
// Data: table `quotes` (status NEW → CONTACTED → PROPOSAL → NEGOTIATING → CONVERTED / LOST).

type Etapa = 'NEW' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATING' | 'CONVERTED' | 'LOST';
interface Orcamento {
  id: string; name: string | null; whatsapp: string | null; email: string | null; status: Etapa; source: string | null;
  service_option: string | null; property_type: string | null; rooms: string | null; priorities: string | null;
  address_street: string | null; address_number: string | null; address_district: string | null; address_city: string | null;
  estimated_value: number | null; crm_notes: string | null; chat_summary: string | null; created_at: string; last_contacted_at: string | null;
}

const ETAPAS: { key: Etapa; label: string; dica: string; cor: string; ponto: string }[] = [
  { key: 'NEW', label: 'Novo contato', dica: 'Pediu informação', cor: 'bg-sky-50 border-sky-200', ponto: 'bg-sky-500' },
  { key: 'CONTACTED', label: 'Orçamento a enviar', dica: 'Falta mandar o valor', cor: 'bg-amber-50 border-amber-200', ponto: 'bg-amber-500' },
  { key: 'PROPOSAL', label: 'Orçamento enviado', dica: 'Aguardando resposta', cor: 'bg-orange-50 border-orange-200', ponto: 'bg-orange-500' },
  { key: 'NEGOTIATING', label: 'Negociando', dica: 'Ajustando data ou valor', cor: 'bg-violet-50 border-violet-200', ponto: 'bg-violet-500' },
  { key: 'CONVERTED', label: 'Fechado', dica: 'Virou agendamento', cor: 'bg-green-50 border-green-200', ponto: 'bg-green-500' },
  { key: 'LOST', label: 'Perdido', dica: 'Não fechou', cor: 'bg-gray-50 border-gray-200', ponto: 'bg-gray-400' },
];
const ORIGEM: Record<string, string> = { whatsapp: 'WhatsApp', web_chat: 'Chat do site', web: 'Site', manual: 'Cadastro manual', conversas: 'Conversas' };
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dias = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const soDigitos = (t: string | null) => (t || '').replace(/\D/g, '');
const paraWa = (t: string | null) => { const d = soDigitos(t); return d.startsWith('55') && d.length >= 12 ? d : '55' + d; };
const endereco = (o: Orcamento) => [o.address_street && `${o.address_street}${o.address_number ? ', ' + o.address_number : ''}`, o.address_district, o.address_city].filter(Boolean).join(' - ');

export const AdminOrcamentos: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const leitura = soLeitura('/admin/orcamentos');
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [aberto, setAberto] = useState<Orcamento | null>(null);
  const [novo, setNovo] = useState<{ name: string; whatsapp: string; service_option: string; estimated_value: string } | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Etapa | null>(null);

  const carregar = async () => {
    const { data } = await supabase.from('quotes').select('*').eq('company_id', empresaId()).order('created_at', { ascending: false }).limit(500);
    setLista((data as Orcamento[]) ?? []);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  // Coming from Conversas: ?novo=1&nome=...&fone=... opens the "new quote" form already filled.
  useEffect(() => {
    if (params.get('novo')) {
      setNovo({ name: params.get('nome') || '', whatsapp: params.get('fone') || '', service_option: '', estimated_value: '' });
      setParams({}, { replace: true });
    }
  }, []);

  const mover = async (o: Orcamento, etapa: Etapa) => {
    if (leitura || o.status === etapa) return;
    setLista(l => l.map(x => x.id === o.id ? { ...x, status: etapa } : x));
    setAberto(a => a && a.id === o.id ? { ...a, status: etapa } : a);
    await supabase.from('quotes').update({ status: etapa, last_contacted_at: new Date().toISOString() }).eq('id', o.id);
  };
  const salvar = async (o: Orcamento, campos: Partial<Orcamento>) => {
    setLista(l => l.map(x => x.id === o.id ? { ...x, ...campos } : x));
    setAberto(a => a && a.id === o.id ? { ...a, ...campos } : a);
    await supabase.from('quotes').update(campos).eq('id', o.id);
  };
  const criar = async () => {
    if (!novo || !novo.name.trim()) return;
    const valor = parseFloat(novo.estimated_value.replace(/\./g, '').replace(',', '.')) || null;
    const { data } = await supabase.from('quotes').insert({
      company_id: empresaId(), name: novo.name.trim(), whatsapp: soDigitos(novo.whatsapp) ? paraWa(novo.whatsapp) : null,
      service_option: novo.service_option.trim() || null, estimated_value: valor, status: valor ? 'PROPOSAL' : 'NEW', source: 'manual',
    }).select('*').single();
    if (data) setLista(l => [data as Orcamento, ...l]);
    setNovo(null);
  };
  const excluir = async (o: Orcamento) => {
    if (!window.confirm(`Excluir o orçamento de ${o.name || 'este contato'}?`)) return;
    await supabase.from('quotes').delete().eq('id', o.id);
    setLista(l => l.filter(x => x.id !== o.id));
    setAberto(null);
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter(o => !q || (o.name || '').toLowerCase().includes(q) || soDigitos(o.whatsapp).includes(soDigitos(q) || '##') || (o.service_option || '').toLowerCase().includes(q));
  }, [lista, busca]);
  const etapasVisiveis = ETAPAS.filter(e => mostrarPerdidos || e.key !== 'LOST');
  const emAberto = lista.filter(o => ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATING'].includes(o.status));
  const valorAberto = emAberto.reduce((t, o) => t + Number(o.estimated_value || 0), 0);
  const fechados30 = lista.filter(o => o.status === 'CONVERTED' && dias(o.last_contacted_at || o.created_at) <= 30).length;

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Orçamentos</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary">{emAberto.length} em aberto{valorAberto ? ` · ${brl(valorAberto)} em jogo` : ''} · {fechados30} fechados nos últimos 30 dias</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome, número ou serviço"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder text-sm outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
            </div>
            {!leitura && <button onClick={() => setNovo({ name: '', whatsapp: '', service_option: '', estimated_value: '' })} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shrink-0"><Plus size={16} /> Novo</button>}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-lightText cursor-pointer">
          <input type="checkbox" className="accent-[#a163ff]" checked={mostrarPerdidos} onChange={e => setMostrarPerdidos(e.target.checked)} /> Mostrar perdidos
        </label>

        {carregando ? <p className="text-sm text-lightText flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Carregando…</p> : (
          <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-3 min-w-max md:min-w-0">
              {etapasVisiveis.map(et => {
                const cards = filtrados.filter(o => o.status === et.key);
                const soma = cards.reduce((t, o) => t + Number(o.estimated_value || 0), 0);
                return (
                  <div key={et.key}
                    onDragOver={e => { if (arrastando && !leitura) { e.preventDefault(); setAlvo(et.key); } }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlvo(a => a === et.key ? null : a); }}
                    onDrop={e => { e.preventDefault(); const o = lista.find(x => x.id === arrastando); setArrastando(null); setAlvo(null); if (o) mover(o, et.key); }}
                    className={`w-72 md:flex-1 md:min-w-[190px] shrink-0 rounded-2xl border ${et.cor} dark:bg-darkSurface dark:border-darkBorder flex flex-col ${alvo === et.key ? 'ring-2 ring-primary' : ''}`}>
                    <div className="px-3 pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${et.ponto}`} />
                        <span className="text-xs font-bold uppercase tracking-wide text-darkText dark:text-darkTextPrimary flex-1">{et.label}</span>
                        <span className="text-xs font-bold text-lightText">{cards.length}</span>
                      </div>
                      <p className="text-[11px] text-lightText mt-0.5">{et.dica}{soma ? ` · ${brl(soma)}` : ''}</p>
                    </div>
                    <div className="px-2 pb-2 space-y-2 min-h-[80px]">
                      {cards.map(o => {
                        const parado = ['NEW', 'CONTACTED', 'PROPOSAL'].includes(o.status) ? dias(o.last_contacted_at || o.created_at) : 0;
                        return (
                          <div key={o.id} draggable={!leitura}
                            onDragStart={() => setArrastando(o.id)} onDragEnd={() => { setArrastando(null); setAlvo(null); }}
                            onClick={() => setAberto(o)}
                            className={`bg-white dark:bg-darkBg rounded-xl border border-gray-100 dark:border-darkBorder shadow-sm p-3 cursor-pointer hover:shadow-md ${arrastando === o.id ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-2">
                              <p className="flex-1 font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{o.name || 'Sem nome'}</p>
                              {o.estimated_value ? <span className="text-xs font-bold text-primary shrink-0">{brl(Number(o.estimated_value))}</span> : null}
                            </div>
                            {(o.service_option || o.property_type) && <p className="text-xs text-lightText truncate mt-0.5">{[o.service_option, o.property_type, o.rooms].filter(Boolean).join(' · ')}</p>}
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-lightText">
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-darkSurface">{ORIGEM[o.source || ''] || 'Contato'}</span>
                              {parado >= 2 && <span className="text-amber-600 font-semibold">parado há {parado} dias</span>}
                            </div>
                          </div>
                        );
                      })}
                      {cards.length === 0 && <p className="text-[11px] text-center text-lightText py-4">Arraste um card para cá</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {aberto && <FichaOrcamento o={aberto} leitura={leitura} onClose={() => setAberto(null)} onMover={e => mover(aberto, e)} onSalvar={c => salvar(aberto, c)}
        onExcluir={() => excluir(aberto)} navigate={navigate} />}

      {novo && createPortal(
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setNovo(null)}>
          <div className="w-full sm:max-w-md bg-white dark:bg-darkSurface rounded-t-3xl sm:rounded-3xl p-5 space-y-3" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Novo orçamento</h2><button onClick={() => setNovo(null)} className="text-gray-400"><X size={20} /></button></div>
            {([['name', 'Nome do contato'], ['whatsapp', 'WhatsApp (com DDD)'], ['service_option', 'Serviço (ex.: faxina completa, pós-obra)'], ['estimated_value', 'Valor do orçamento (R$) — opcional']] as const).map(([k, l]) => (
              <input key={k} placeholder={l} value={(novo as any)[k]} inputMode={k === 'whatsapp' || k === 'estimated_value' ? 'decimal' : undefined}
                onChange={e => setNovo({ ...novo, [k]: e.target.value })}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder text-sm outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
            ))}
            <p className="text-[11px] text-lightText">Com valor, o card já entra em "Orçamento enviado"; sem valor, em "Novo contato".</p>
            <button onClick={criar} disabled={!novo.name.trim()} className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">Criar</button>
          </div>
        </div>, document.body)}
    </Layout>
  );
};

const FichaOrcamento: React.FC<{
  o: Orcamento; leitura: boolean; onClose: () => void; onMover: (e: Etapa) => void; onSalvar: (c: Partial<Orcamento>) => void; onExcluir: () => void; navigate: (p: string) => void;
}> = ({ o, leitura, onClose, onMover, onSalvar, onExcluir, navigate }) => {
  const [valor, setValor] = useState(o.estimated_value ? String(o.estimated_value).replace('.', ',') : '');
  const [notas, setNotas] = useState(o.crm_notes || '');
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  const primeiro = (o.name || '').trim().split(' ')[0];
  const textoOrcamento = `Olá${primeiro ? ', ' + primeiro : ''}! Segue o orçamento da ${o.service_option || 'limpeza'}${o.property_type ? ` (${o.property_type}${o.rooms ? ', ' + o.rooms : ''})` : ''}: ${valor ? `R$ ${valor}` : '[valor]'}. Posso reservar uma data para você?`;

  const salvarValor = () => {
    const v = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || null;
    if (v !== (o.estimated_value ? Number(o.estimated_value) : null)) onSalvar({ estimated_value: v });
  };
  const enviarWhatsApp = async () => {
    if (!o.whatsapp) return;
    setEnviando(true); setMsg('');
    const { data } = await supabase.functions.invoke('whatsapp-send', { body: { action: 'sendText', payload: { number: o.whatsapp, text: textoOrcamento } } });
    setEnviando(false);
    if (data?.ok) { setMsg('Orçamento enviado pelo WhatsApp ✓'); salvarValor(); if (['NEW', 'CONTACTED'].includes(o.status)) onMover('PROPOSAL'); }
    else setMsg(data?.code === 131047 ? 'Passaram 24h desde a última mensagem do cliente: mande pelo celular (use Copiar).' : (data?.error || 'Não foi possível enviar. Use Copiar e mande pelo celular.'));
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-white dark:bg-darkSurface shadow-2xl flex flex-col">
        <div className="p-5 border-b border-gray-100 dark:border-darkBorder flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-lightText">{ORIGEM[o.source || ''] || 'Contato'} · {new Date(o.created_at).toLocaleDateString('pt-BR')}</p>
            <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary truncate">{o.name || 'Sem nome'}</h2>
            {o.whatsapp && <p className="text-sm text-lightText flex items-center gap-1"><Phone size={12} /> {o.whatsapp}</p>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Etapa</p>
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.map(e => (
                <button key={e.key} disabled={leitura} onClick={() => onMover(e.key)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${o.status === e.key ? `${e.cor} text-darkText` : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>
                  <span className={`w-2 h-2 rounded-full ${e.ponto}`} /> {e.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['Serviço', o.service_option], ['Imóvel', o.property_type], ['Cômodos', o.rooms], ['Prioridades', o.priorities]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string} className="bg-gray-50 dark:bg-darkBg rounded-xl p-2.5"><p className="text-[10px] font-bold uppercase text-gray-400">{l}</p><p className="font-semibold text-darkText dark:text-darkTextPrimary">{v}</p></div>
            ))}
          </div>
          {endereco(o) && <p className="text-xs text-lightText">📍 {endereco(o)}</p>}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Valor do orçamento (R$)</p>
            <input value={valor} disabled={leitura} inputMode="decimal" onChange={e => setValor(e.target.value)} onBlur={salvarValor} placeholder="Ex.: 280,00"
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
          </div>
          {o.whatsapp && !leitura && (
            <div className="rounded-2xl border border-green-200 bg-green-50/60 dark:bg-green-900/10 p-3 space-y-2">
              <p className="text-xs font-bold text-green-800 dark:text-green-300">Mensagem do orçamento</p>
              <p className="text-xs text-darkText dark:text-darkTextPrimary whitespace-pre-wrap">{textoOrcamento}</p>
              <div className="flex gap-2">
                <button onClick={enviarWhatsApp} disabled={enviando || !valor} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600 text-white text-xs font-bold disabled:opacity-50">
                  {enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar pelo WhatsApp
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(textoOrcamento); setMsg('Mensagem copiada.'); }} className="px-3 py-2 rounded-xl border border-green-200 text-green-700 text-xs font-bold flex items-center gap-1"><Copy size={13} /> Copiar</button>
              </div>
              {msg && <p className="text-[11px] font-semibold text-green-800 dark:text-green-300">{msg}</p>}
            </div>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Anotações</p>
            <textarea value={notas} disabled={leitura} onChange={e => setNotas(e.target.value)} onBlur={() => notas !== (o.crm_notes || '') && onSalvar({ crm_notes: notas })}
              placeholder="Ex.: prefere sexta de manhã; pediu desconto para quinzenal"
              className="w-full min-h-[80px] p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder outline-none focus:border-primary text-darkText dark:text-darkTextPrimary" />
          </div>
          {o.chat_summary && (
            <details className="rounded-xl bg-gray-50 dark:bg-darkBg p-3">
              <summary className="text-xs font-bold text-lightText cursor-pointer">O que o cliente disse no atendimento automático</summary>
              <p className="mt-2 text-xs whitespace-pre-wrap text-darkText dark:text-darkTextPrimary">{o.chat_summary}</p>
            </details>
          )}
        </div>
        {!leitura && (
          <div className="p-4 border-t border-gray-100 dark:border-darkBorder grid grid-cols-2 gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
            {o.whatsapp && <button onClick={() => navigate(`/admin/conversas?fone=${soDigitos(o.whatsapp)}`)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-darkBorder text-xs font-bold text-darkText dark:text-darkTextPrimary"><MessageCircle size={14} /> Abrir conversa</button>}
            <button onClick={() => { onMover('CONVERTED'); navigate('/admin/calendar'); }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"><CalendarPlus size={14} /> Fechou: agendar</button>
            {o.status !== 'LOST' && <button onClick={() => onMover('LOST')} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-lightText"><X size={14} /> Marcar como perdido</button>}
            <button onClick={onExcluir} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-red-500"><Trash2 size={14} /> Excluir</button>
          </div>
        )}
      </div>
    </div>, document.body);
};
