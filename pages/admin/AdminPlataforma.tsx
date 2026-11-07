import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import {
  Building2, Loader2, Plus, Minus, MessageCircle, Users, CalendarClock, Sparkles, Search, Mail, Wallet,
  TrendingUp, Send, Trash2, Copy, Check, Activity, Smartphone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PLANOS, mensalNoAnual } from '../../supabase/functions/_shared/planos';

// Software owner's panel: every company on the platform (cards, search, usage, WhatsApp consumption),
// the platform's own numbers (monthly revenue, costs, break-even) and broadcasts to companies.

interface Empresa {
  id: number; nome: string; cnpj: string | null; status: string; plano: string | null; ciclo: string | null;
  teste_ate: string | null; assinatura_ate: string | null; created_at: string; responsavel: string | null;
  whatsapp: string | null; email: string | null; cidade: string | null; tamanho_equipe: string | null;
  colaboradoras: number; clientes: number; servicos: number;
  admin: { name: string; email: string; phone: string } | null;
  whatsapp_conexao?: never;
  envios_mes: number; ultimo_acesso: string | null; ultimo_servico: string | null;
}
type EmpresaAPI = Omit<Empresa, 'whatsapp_conexao'> & { whatsapp: string | null } & { whatsapp_status?: string };
interface Custos { custos_plataforma: { nome: string; valor: number }[] | null; whatsapp_custo_unit: number; absorve_whatsapp: boolean; taxa_cartao_pct: number }

const STATUS_COR: Record<string, string> = {
  ativa: 'bg-green-100 text-green-700', teste: 'bg-primary/10 text-primary',
  suspensa: 'bg-amber-100 text-amber-700', cancelada: 'bg-gray-100 text-gray-500', vencida: 'bg-red-100 text-red-700',
};
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const diasAte = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const soDigitos = (v?: string | null) => (v ?? '').replace(/\D/g, '');
const linkZap = (fone?: string | null, texto = '') => {
  const d = soDigitos(fone);
  return d ? `https://wa.me/${d.startsWith('55') ? d : '55' + d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}` : null;
};
const planoDe = (e: { plano: string | null }) => PLANOS.find(p => p.nome === e.plano);

// Situation shown on the card: an expired trial/subscription reads "vencida".
function situacao(e: Empresa): string {
  if (e.status === 'teste' && e.teste_ate && diasAte(e.teste_ate) <= 0) return 'vencida';
  if (e.status === 'ativa' && e.assinatura_ate && diasAte(e.assinatura_ate) <= 0) return 'vencida';
  return e.status;
}

// What a paying company brings per month (annual plans divided by 12). Courtesy and trial bring nothing.
function receitaMensal(e: Empresa): number {
  if (e.status !== 'ativa' || !e.assinatura_ate || diasAte(e.assinatura_ate) <= 0) return 0;
  const p = planoDe(e);
  if (!p) return 0;
  return e.ciclo === 'anual' ? mensalNoAnual(p) : p.mensal;
}

type Aba = 'empresas' | 'financeiro' | 'disparos';

export const AdminPlataforma: React.FC = () => {
  const [aba, setAba] = useState<Aba>('empresas');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [custos, setCustos] = useState<Custos | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'teste' | 'ativa' | 'vencida' | 'sem_uso'>('todas');

  const carregar = async () => {
    const { data: r, error } = await supabase.functions.invoke('plataforma', { body: { acao: 'listar' } });
    if (error || !r?.ok) setErro(r?.erro || 'Não foi possível carregar.');
    else {
      setEmpresas((r.empresas as any[]).map(e => ({ ...e, whatsappConn: e.whatsapp && typeof e.whatsapp === 'object' ? e.whatsapp : null, whatsapp: typeof e.whatsapp === 'string' ? e.whatsapp : e.whatsapp?.numero ?? null })));
      setCustos(r.custos);
    }
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const atualizar = async (id: number, mudanca: Record<string, unknown>) => {
    setSalvando(id);
    const { data: r } = await supabase.functions.invoke('plataforma', { body: { acao: 'atualizar', id, ...mudanca } });
    if (!r?.ok) window.alert(r?.erro || 'Não foi possível salvar.');
    await carregar();
    setSalvando(null);
  };

  const clientes = empresas.filter(e => e.id !== 1);
  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return clientes.filter(e => {
      if (t && ![e.nome, e.responsavel, e.email, e.admin?.email, e.cidade].some(v => (v ?? '').toLowerCase().includes(t))) return false;
      const s = situacao(e);
      if (filtro === 'teste') return s === 'teste';
      if (filtro === 'ativa') return s === 'ativa';
      if (filtro === 'vencida') return s === 'vencida';
      if (filtro === 'sem_uso') return !e.ultimo_acesso || diasDesde(e.ultimo_acesso) > 7;
      return true;
    });
  }, [clientes, busca, filtro]);

  const mrr = clientes.reduce((n, e) => n + receitaMensal(e), 0);
  const cartao = 'rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface';

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Building2 size={22} className="text-primary" /> Plataforma</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">As empresas que usam o sistema e os números do seu negócio de software. Só você vê esta tela.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { r: 'Empresas clientes', v: String(clientes.length) },
            { r: 'Em teste grátis', v: String(clientes.filter(e => situacao(e) === 'teste').length) },
            { r: 'Pagantes', v: String(clientes.filter(e => receitaMensal(e) > 0).length) },
            { r: 'Vencidas', v: String(clientes.filter(e => situacao(e) === 'vencida').length) },
            { r: 'Receita por mês', v: brl(mrr) },
          ].map(k => (
            <div key={k.r} className={`${cartao} p-4`}>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">{k.r}</p>
              <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary tabular-nums">{k.v}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([['empresas', 'Empresas', Building2], ['financeiro', 'Financeiro', Wallet], ['disparos', 'Disparos', Send]] as const).map(([id, rotulo, Icone]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${aba === id ? 'bg-primary text-white' : 'bg-white dark:bg-darkSurface text-lightText dark:text-darkTextSecondary border border-gray-100 dark:border-darkBorder'}`}>
              <Icone size={15} /> {rotulo}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
        ) : erro ? (
          <p className="text-sm text-red-600">{erro}</p>
        ) : aba === 'empresas' ? (
          <>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lightText" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por empresa, responsável, e-mail ou cidade"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary outline-none focus:border-primary" />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {([['todas', 'Todas'], ['teste', 'Em teste'], ['ativa', 'Ativas'], ['vencida', 'Vencidas'], ['sem_uso', 'Sem uso há 7 dias']] as const).map(([id, r]) => (
                  <button key={id} onClick={() => setFiltro(id)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold ${filtro === id ? 'bg-primary/10 text-primary' : 'text-lightText hover:bg-gray-100 dark:hover:bg-darkSurface'}`}>{r}</button>
                ))}
              </div>
            </div>

            {filtradas.length === 0 && <p className="text-sm text-lightText py-10 text-center">Nenhuma empresa encontrada.</p>}
            <div className="grid md:grid-cols-2 gap-4">
              {filtradas.map(e => <CartaoEmpresa key={e.id} e={e} salvando={salvando === e.id} atualizar={atualizar} />)}
            </div>

            {empresas.filter(e => e.id === 1).map(e => (
              <div key={e.id} className={`${cartao} p-4 flex items-center gap-3 text-sm`}>
                <Sparkles size={16} className="text-primary shrink-0" />
                <span className="text-darkText dark:text-darkTextPrimary"><strong>{e.nome}</strong>: empresa dona da plataforma, tudo liberado sem custo · {e.colaboradoras} colaboradoras · {e.clientes} clientes · {e.envios_mes} lembretes no mês</span>
              </div>
            ))}
          </>
        ) : aba === 'financeiro' ? (
          <Financeiro empresas={clientes} custos={custos} onSalvo={carregar} />
        ) : (
          <Disparos empresas={clientes} />
        )}
      </div>
    </Layout>
  );
};

const CartaoEmpresa: React.FC<{ e: Empresa & { whatsappConn?: { status: string; numero: string | null } | null }; salvando: boolean; atualizar: (id: number, m: Record<string, unknown>) => void }> = ({ e, salvando, atualizar }) => {
  const s = situacao(e);
  const plano = planoDe(e);
  const limite = plano?.lembretes ?? (e.status === 'teste' ? PLANOS[PLANOS.length - 1].lembretes : 0);
  const uso = limite ? Math.min(100, Math.round((e.envios_mes / limite) * 100)) : 0;
  const ativoRecente = e.ultimo_acesso && diasDesde(e.ultimo_acesso) <= 7;
  const zap = linkZap(e.whatsapp || e.admin?.phone);
  const email = e.email || e.admin?.email;
  const conn = (e as any).whatsappConn as { status: string; numero: string | null } | null;
  const prazo = e.status === 'teste' ? e.teste_ate : e.assinatura_ate;

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">{e.nome.charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary truncate">{e.nome}</h2>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COR[s] || STATUS_COR.cancelada}`}>{s}</span>
          </div>
          <p className="text-xs text-lightText dark:text-darkTextSecondary truncate">{e.responsavel || e.admin?.name || '—'}{e.cidade ? ` · ${e.cidade}` : ''} · desde {data(e.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Colaboradoras', e.colaboradoras], ['Clientes', e.clientes], ['Serviços', e.servicos]].map(([r, v]) => (
          <div key={r as string} className="rounded-xl bg-gray-50 dark:bg-darkBg py-2">
            <p className="text-lg font-bold text-darkText dark:text-darkTextPrimary tabular-nums">{v}</p>
            <p className="text-[10px] text-lightText">{r}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary">
          <Wallet size={14} className="text-primary shrink-0" />
          {plano ? `${plano.nome} ${e.ciclo === 'anual' ? 'anual' : e.ciclo === 'mensal' ? 'mensal' : ''}` : e.status === 'teste' ? 'Teste com tudo liberado' : 'Sem plano'}
          {receitaMensal(e) > 0 && <span className="text-lightText">· {brl(receitaMensal(e))}/mês</span>}
        </p>
        {prazo && (
          <p className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary">
            <CalendarClock size={14} className="text-primary shrink-0" />
            {diasAte(prazo) > 0 ? `${e.status === 'teste' ? 'Teste' : 'Assinatura'} até ${data(prazo)} (faltam ${diasAte(prazo)} dias)` : `Venceu em ${data(prazo)}`}
          </p>
        )}
        <p className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary">
          <Activity size={14} className={`shrink-0 ${ativoRecente ? 'text-green-600' : 'text-gray-400'}`} />
          {e.ultimo_acesso ? (diasDesde(e.ultimo_acesso) === 0 ? 'Entrou hoje' : `Último acesso há ${diasDesde(e.ultimo_acesso)} dias`) : 'Nunca entrou'}
          {e.ultimo_servico && <span className="text-lightText">· último serviço {data(e.ultimo_servico)}</span>}
        </p>
        <p className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary">
          <Smartphone size={14} className={`shrink-0 ${conn?.status === 'connected' ? 'text-green-600' : 'text-gray-400'}`} />
          {conn?.status === 'connected' ? `WhatsApp conectado${conn.numero ? ` · ${conn.numero}` : ''}` : 'WhatsApp não conectado'}
        </p>
        {limite > 0 && (
          <div>
            <div className="flex justify-between text-xs text-lightText"><span>Lembretes no mês</span><span className="tabular-nums">{e.envios_mes} de {limite} · restam {Math.max(0, limite - e.envios_mes)}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-darkBg overflow-hidden">
              <div className={`h-full rounded-full ${uso >= 90 ? 'bg-red-500' : uso >= 70 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${uso}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-darkBorder">
        {zap && <a href={zap} target="_blank" rel="noreferrer" className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><MessageCircle size={13} /> WhatsApp</a>}
        {email && <a href={`mailto:${email}`} className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Mail size={13} /> E-mail</a>}
        <button disabled={salvando} onClick={() => atualizar(e.id, { dias: 7 })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center gap-1"><Plus size={12} /> 7d</button>
        <button disabled={salvando} onClick={() => atualizar(e.id, { dias: 14 })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center gap-1"><Plus size={12} /> 14d</button>
        <button disabled={salvando} onClick={() => atualizar(e.id, { dias: -7 })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary flex items-center gap-1"><Minus size={12} /> 7d</button>
        <select value={e.status} disabled={salvando} onChange={ev => atualizar(e.id, { status: ev.target.value })}
          className="ml-auto text-xs font-semibold px-2 py-1.5 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
          <option value="teste">Em teste</option>
          <option value="ativa">Ativa</option>
          <option value="suspensa">Suspensa</option>
          <option value="cancelada">Cancelada</option>
        </select>
        {salvando && <Loader2 size={14} className="animate-spin text-primary" />}
      </div>
    </div>
  );
};

const Financeiro: React.FC<{ empresas: Empresa[]; custos: Custos | null; onSalvo: () => void }> = ({ empresas, custos, onSalvo }) => {
  const [itens, setItens] = useState(custos?.custos_plataforma ?? []);
  const [unit, setUnit] = useState(custos?.whatsapp_custo_unit ?? 0.04);
  const [absorve, setAbsorve] = useState(custos?.absorve_whatsapp ?? false);
  const [taxa, setTaxa] = useState(custos?.taxa_cartao_pct ?? 0);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const fixos = itens.reduce((n, i) => n + (Number(i.valor) || 0), 0);
  const pagantes = empresas.filter(e => receitaMensal(e) > 0);
  const receita = pagantes.reduce((n, e) => n + receitaMensal(e), 0);
  const envios = empresas.reduce((n, e) => n + e.envios_mes, 0);
  const custoZap = absorve ? envios * unit : 0;
  const custoTaxa = receita * taxa / 100;
  const lucro = receita - fixos - custoZap - custoTaxa;

  // Profit per company on each plan: price − card fee − (reminders at the plan limit, when absorbed).
  const margem = (preco: number, lembretes: number) => preco - preco * taxa / 100 - (absorve ? lembretes * unit : 0);
  const empate = (m: number) => (m > 0 ? Math.ceil(fixos / m) : Infinity);

  const salvar = async () => {
    setSalvando(true);
    await supabase.functions.invoke('plataforma', { body: { acao: 'salvar_custos', custos: itens, whatsapp_custo_unit: unit, absorve_whatsapp: absorve, taxa_cartao_pct: taxa } });
    setSalvando(false); setSalvo(true); setTimeout(() => setSalvo(false), 2000);
    onSalvo();
  };

  const cartao = 'rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-5';
  const campo = 'px-3 py-2 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary outline-none focus:border-primary';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { r: 'Receita por mês', v: brl(receita), c: 'text-green-600' },
          { r: 'Custos fixos', v: brl(fixos), c: 'text-darkText dark:text-darkTextPrimary' },
          { r: absorve ? 'WhatsApp + taxa do cartão' : 'Taxa do cartão', v: brl(custoZap + custoTaxa), c: 'text-darkText dark:text-darkTextPrimary' },
          { r: lucro >= 0 ? 'Lucro por mês' : 'Prejuízo por mês', v: brl(Math.abs(lucro)), c: lucro >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(k => (
          <div key={k.r} className={cartao}>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">{k.r}</p>
            <p className={`text-2xl font-bold tabular-nums ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className={cartao}>
        <h3 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><TrendingUp size={17} className="text-primary" /> Quantas empresas para pagar os custos</h3>
        <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Com custos fixos de {brl(fixos)} por mês. Hoje você tem {pagantes.length} empresa{pagantes.length === 1 ? '' : 's'} pagante{pagantes.length === 1 ? '' : 's'}.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead><tr className="text-left text-xs text-lightText uppercase tracking-wide"><th className="py-2">Plano</th><th>Sobra por empresa (mensal)</th><th>Empresas para empatar</th><th>No anual</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-darkBorder">
              {PLANOS.map(p => {
                const mM = margem(p.mensal, p.lembretes);
                const mA = margem(mensalNoAnual(p), p.lembretes);
                return (
                  <tr key={p.id} className="text-darkText dark:text-darkTextPrimary">
                    <td className="py-2.5 font-semibold">{p.nome} <span className="text-lightText font-normal">({brl(p.mensal)})</span></td>
                    <td className="tabular-nums">{brl(mM)}</td>
                    <td className="tabular-nums font-bold">{empate(mM) === Infinity ? '—' : empate(mM)}</td>
                    <td className="tabular-nums">{empate(mA) === Infinity ? '—' : `${empate(mA)} (sobra ${brl(mA)})`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {fixos > 0 && pagantes.length > 0 && (
          <p className="mt-3 text-sm text-darkText dark:text-darkTextPrimary">
            {lucro >= 0 ? 'Os custos já estão pagos. Cada empresa nova é lucro.' : `Faltam cerca de ${Math.max(1, Math.ceil(-lucro / Math.max(1, receita / pagantes.length)))} empresa(s) no ticket médio atual (${brl(receita / pagantes.length)}) para empatar.`}
          </p>
        )}
      </div>

      <div className={cartao}>
        <h3 className="font-bold text-darkText dark:text-darkTextPrimary">Seus custos por mês</h3>
        <p className="text-xs text-lightText dark:text-darkTextSecondary mt-1">Valores de partida estimados. Ajuste com o que você paga de verdade.</p>
        <div className="mt-4 space-y-2">
          {itens.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={it.nome} onChange={ev => setItens(itens.map((x, j) => j === i ? { ...x, nome: ev.target.value } : x))} className={`${campo} flex-1 min-w-0`} />
              <span className="text-sm text-lightText">R$</span>
              <input type="number" inputMode="decimal" value={it.valor || ''} placeholder="0" onChange={ev => setItens(itens.map((x, j) => j === i ? { ...x, valor: Number(ev.target.value) } : x))} className={`${campo} w-28 tabular-nums`} />
              <button onClick={() => setItens(itens.filter((_, j) => j !== i))} aria-label="Remover" className="p-2 text-lightText hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
          <button onClick={() => setItens([...itens, { nome: 'Novo custo', valor: 0 }])} className="text-sm font-bold text-primary flex items-center gap-1"><Plus size={14} /> Adicionar custo</button>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-darkBorder grid md:grid-cols-3 gap-4 text-sm">
          <label className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary">
            <input type="checkbox" checked={absorve} onChange={ev => setAbsorve(ev.target.checked)} className="accent-primary w-4 h-4" />
            Eu pago os lembretes de WhatsApp das empresas
          </label>
          <label className="text-darkText dark:text-darkTextPrimary">Custo de cada lembrete (R$)
            <input type="number" step="0.005" value={unit} onChange={ev => setUnit(Number(ev.target.value))} className={`${campo} w-full mt-1`} />
          </label>
          <label className="text-darkText dark:text-darkTextPrimary">Taxa da InfinitePay no cartão (%)
            <input type="number" step="0.1" value={taxa} onChange={ev => setTaxa(Number(ev.target.value))} className={`${campo} w-full mt-1`} />
          </label>
        </div>
        <p className="mt-2 text-xs text-lightText dark:text-darkTextSecondary">
          Lembretes enviados por todas as empresas neste mês: {envios}{absorve ? ` · custo ${brl(custoZap)}` : ' · hoje cada empresa paga a Meta direto, então não entra no seu custo'}.
        </p>
        <div className="mt-4 flex justify-end">
          <button onClick={salvar} disabled={salvando} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : salvo ? <Check size={15} /> : null} {salvo ? 'Salvo' : 'Salvar custos'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PUBLICOS = [['todas', 'Todas as empresas'], ['teste', 'Em teste grátis'], ['ativa', 'Pagantes'], ['vencida', 'Vencidas (teste ou assinatura)']] as const;

const Disparos: React.FC<{ empresas: Empresa[] }> = ({ empresas }) => {
  const [publico, setPublico] = useState<typeof PUBLICOS[number][0]>('teste');
  const [texto, setTexto] = useState('Olá, {nome}! Tudo bem com a {empresa}? ');
  const [copiado, setCopiado] = useState(false);
  const lista = empresas.filter(e => {
    const s = situacao(e);
    if (publico === 'teste') return s === 'teste';
    if (publico === 'ativa') return receitaMensal(e) > 0;
    if (publico === 'vencida') return s === 'vencida';
    return true;
  });
  const montar = (e: Empresa) => texto
    .replace(/\{nome\}/g, (e.responsavel || e.admin?.name || '').split(' ')[0] || 'tudo bem')
    .replace(/\{empresa\}/g, e.nome);
  const emails = lista.map(e => e.email || e.admin?.email).filter(Boolean) as string[];

  const copiarEmails = async () => {
    try { await navigator.clipboard.writeText(emails.join(', ')); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="grid md:grid-cols-5 gap-5">
      <div className="md:col-span-2 rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-5 space-y-4">
        <h3 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Send size={17} className="text-primary" /> Nova mensagem</h3>
        <label className="block text-sm text-darkText dark:text-darkTextPrimary">Para quem
          <select value={publico} onChange={e => setPublico(e.target.value as any)} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-sm">
            {PUBLICOS.map(([id, r]) => <option key={id} value={id}>{r}</option>)}
          </select>
        </label>
        <label className="block text-sm text-darkText dark:text-darkTextPrimary">Mensagem
          <textarea rows={7} value={texto} onChange={e => setTexto(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-sm" />
        </label>
        <p className="text-xs text-lightText dark:text-darkTextSecondary">Use {'{nome}'} e {'{empresa}'} para personalizar. Ex.: cupom de desconto, função nova, fim do teste.</p>
        <button onClick={copiarEmails} disabled={!emails.length} className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-darkBorder text-sm font-bold text-darkText dark:text-darkTextPrimary flex items-center justify-center gap-2 disabled:opacity-50">
          {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'E-mails copiados' : `Copiar ${emails.length} e-mail(s)`}
        </button>
        <p className="text-xs text-lightText dark:text-darkTextSecondary">O envio automático por e-mail entra junto com o serviço de e-mail do sistema.</p>
      </div>
      <div className="md:col-span-3 rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface divide-y divide-gray-100 dark:divide-darkBorder">
        <p className="px-5 py-3 text-sm font-bold text-darkText dark:text-darkTextPrimary">{lista.length} empresa(s)</p>
        {lista.length === 0 && <p className="p-5 text-sm text-lightText">Nenhuma empresa neste grupo.</p>}
        {lista.map(e => {
          const zap = linkZap(e.whatsapp || e.admin?.phone, montar(e));
          const email = e.email || e.admin?.email;
          return (
            <div key={e.id} className="px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary truncate">{e.nome}</p>
                <p className="text-xs text-lightText truncate">{montar(e)}</p>
              </div>
              {zap && <a href={zap} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><MessageCircle size={13} /> Enviar</a>}
              {email && <a href={`mailto:${email}?body=${encodeURIComponent(montar(e))}`} className="shrink-0 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"><Mail size={13} /> E-mail</a>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
