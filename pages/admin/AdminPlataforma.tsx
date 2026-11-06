import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Building2, Loader2, Plus, Minus, MessageCircle, Users, CalendarClock, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Software owner's panel: all cleaning companies on the platform (trial, plan, usage) and sign-ups.

interface Empresa {
  id: number; nome: string; cnpj: string | null; status: string; plano: string | null; teste_ate: string | null;
  created_at: string; responsavel: string | null; whatsapp: string | null; email: string | null; cidade: string | null;
  tamanho_equipe: string | null; colaboradoras: number; clientes: number; servicos: number;
  admin: { name: string; email: string; phone: string } | null;
}

const STATUS_COR: Record<string, string> = {
  ativa: 'bg-green-100 text-green-700', teste: 'bg-primary/10 text-primary',
  suspensa: 'bg-amber-100 text-amber-700', cancelada: 'bg-gray-100 text-gray-500',
};
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const dias = (ate: string) => Math.ceil((new Date(ate).getTime() - Date.now()) / 86_400_000);
const zap = (fone?: string | null) => {
  const d = (fone ?? '').replace(/\D/g, '');
  return d ? `https://wa.me/${d.startsWith('55') ? d : '55' + d}` : null;
};

export const AdminPlataforma: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState<number | null>(null);

  const carregar = async () => {
    const { data: r, error } = await supabase.functions.invoke('plataforma', { body: { acao: 'listar' } });
    if (error || !r?.ok) setErro(r?.erro || 'Não foi possível carregar.');
    else setEmpresas(r.empresas);
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

  const emTeste = empresas.filter(e => e.status === 'teste');
  const ativas = empresas.filter(e => e.status === 'ativa');
  const cartao = 'rounded-2xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkSurface p-4';

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Building2 size={22} className="text-primary" /> Plataforma</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Todas as empresas que usam o sistema. Só você, como dono, vê esta tela.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { r: 'Empresas', v: empresas.length },
            { r: 'Em teste grátis', v: emTeste.length },
            { r: 'Ativas', v: ativas.length },
            { r: 'Colaboradoras na plataforma', v: empresas.reduce((n, e) => n + e.colaboradoras, 0) },
          ].map(k => (
            <div key={k.r} className={cartao}>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">{k.r}</p>
              <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary tabular-nums">{k.v}</p>
            </div>
          ))}
        </div>

        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
        ) : erro ? (
          <p className="text-sm text-red-600">{erro}</p>
        ) : (
          <div className="space-y-3">
            {empresas.map(e => {
              const restam = e.teste_ate ? dias(e.teste_ate) : null;
              const link = zap(e.whatsapp || e.admin?.phone);
              return (
                <div key={e.id} className={cartao}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-darkText dark:text-darkTextPrimary">{e.nome}</h2>
                        <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COR[e.status] || STATUS_COR.cancelada}`}>{e.status}</span>
                        {e.plano && <span className="text-xs text-lightText dark:text-darkTextSecondary">{e.plano}</span>}
                      </div>
                      <p className="text-xs text-lightText dark:text-darkTextSecondary mt-1">
                        {e.responsavel || e.admin?.name || '—'} · {e.email || e.admin?.email || 'sem e-mail'}{e.cidade ? ` · ${e.cidade}` : ''} · desde {data(e.created_at)}
                      </p>
                    </div>
                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-darkText dark:text-darkTextPrimary">
                    <span className="flex items-center gap-1.5"><Users size={14} className="text-primary" /> {e.colaboradoras} colaboradoras ativas</span>
                    <span>{e.clientes} clientes</span>
                    <span>{e.servicos} serviços</span>
                    {e.tamanho_equipe && <span className="text-lightText dark:text-darkTextSecondary">equipe informada: {e.tamanho_equipe}</span>}
                  </div>

                  {e.id !== 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-darkBorder flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-darkText dark:text-darkTextPrimary mr-1">
                        <CalendarClock size={15} className="text-primary" />
                        {e.teste_ate
                          ? (restam! > 0 ? `Teste até ${data(e.teste_ate)} (faltam ${restam} dias)` : `Teste terminou em ${data(e.teste_ate)}`)
                          : 'Sem prazo de teste'}
                      </span>
                      <button disabled={salvando === e.id} onClick={() => atualizar(e.id, { dias: 7 })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center gap-1"><Plus size={13} /> 7 dias</button>
                      <button disabled={salvando === e.id} onClick={() => atualizar(e.id, { dias: 14 })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center gap-1"><Plus size={13} /> 14 dias</button>
                      <button disabled={salvando === e.id} onClick={() => atualizar(e.id, { dias: -7 })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-darkBg text-darkText dark:text-darkTextPrimary flex items-center gap-1"><Minus size={13} /> 7 dias</button>
                      <select value={e.status} disabled={salvando === e.id} onChange={ev => atualizar(e.id, { status: ev.target.value })}
                        className="ml-auto text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
                        <option value="teste">Em teste</option>
                        <option value="ativa">Ativa (assinante ou cortesia)</option>
                        <option value="suspensa">Suspensa</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                      {salvando === e.id && <Loader2 size={15} className="animate-spin text-primary" />}
                    </div>
                  )}
                  {e.id === 1 && (
                    <p className="mt-3 pt-3 border-t border-gray-100 dark:border-darkBorder text-xs text-lightText dark:text-darkTextSecondary flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" /> Empresa dona da plataforma: tudo liberado, sem custo.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
