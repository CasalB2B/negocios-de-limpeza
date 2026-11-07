import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Check, Loader2, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PLANOS, mensalNoAnual, valorDoCiclo, type Ciclo } from '../../supabase/functions/_shared/planos';

// Company subscription: choose a plan, pay by InfinitePay (Pix or card, the annual plan can be split in
// installments) and the company is activated by itself when the payment is confirmed.

interface Empresa { nome: string; status: string; plano: string | null; ciclo: string | null; teste_ate: string | null; assinatura_ate: string | null }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export const AdminAssinatura: React.FC = () => {
  const [ciclo, setCiclo] = useState<Ciclo>('anual');
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const voltouDoPagamento = window.location.hash.includes('pago=1');

  const carregar = () => supabase.from('empresas').select('nome, status, plano, ciclo, teste_ate, assinatura_ate').maybeSingle()
    .then(({ data: e }) => setEmpresa((e as Empresa) ?? null));
  useEffect(() => {
    carregar();
    // Back from the checkout: the webhook may take a few seconds to confirm.
    if (!voltouDoPagamento) return;
    const t = setInterval(carregar, 4000);
    const fim = setTimeout(() => clearInterval(t), 60_000);
    return () => { clearInterval(t); clearTimeout(fim); };
  }, []);

  const assinar = async (plano: string) => {
    setErro(''); setGerando(plano);
    const { data: r, error } = await supabase.functions.invoke('assinatura', { body: { acao: 'checkout', plano, ciclo } });
    setGerando(null);
    if (error || !r?.url) {
      let msg = r?.error;
      try { msg = msg || (await (error as any)?.context?.json())?.error; } catch { /* keep */ }
      setErro(msg || 'Não foi possível abrir o pagamento agora.');
      return;
    }
    window.location.href = r.url;
  };

  const ativa = empresa?.status === 'ativa' && empresa.assinatura_ate && new Date(empresa.assinatura_ate) > new Date();
  const cortesia = empresa?.status === 'ativa' && !empresa?.assinatura_ate;

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><CreditCard size={22} className="text-primary" /> Assinatura</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Escolha o plano da {empresa?.nome || 'sua empresa'}. Pagamento por Pix ou cartão; o plano anual pode ser parcelado no cartão.</p>
        </div>

        {voltouDoPagamento && !ativa && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm flex items-center gap-2 text-darkText dark:text-darkTextPrimary">
            <Loader2 size={16} className="animate-spin text-primary" /> Confirmando o pagamento com a InfinitePay. Isso leva alguns segundos.
          </div>
        )}
        {ativa && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
            <CheckCircle2 size={18} /> Plano {empresa!.plano} {empresa!.ciclo === 'anual' ? 'anual' : 'mensal'} ativo até {data(empresa!.assinatura_ate!)}. Para renovar ou mudar de plano, é só escolher abaixo: o tempo é somado.
          </div>
        )}
        {cortesia && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 p-4 text-sm text-green-800 dark:text-green-300">Sua empresa tem acesso liberado, sem custo.</div>
        )}
        {erro && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} /> {erro}</div>
        )}

        <div className="flex justify-center">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-darkSurface p-1 text-sm font-bold">
            <button onClick={() => setCiclo('mensal')} className={`px-4 py-2 rounded-lg ${ciclo === 'mensal' ? 'bg-white dark:bg-darkBg shadow text-primary' : 'text-lightText'}`}>Mensal</button>
            <button onClick={() => setCiclo('anual')} className={`px-4 py-2 rounded-lg ${ciclo === 'anual' ? 'bg-white dark:bg-darkBg shadow text-primary' : 'text-lightText'}`}>Anual <span className="text-green-600">−15%</span></button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PLANOS.map(p => {
            const porMes = ciclo === 'anual' ? mensalNoAnual(p) : p.mensal;
            return (
              <div key={p.id} className={`relative rounded-2xl p-6 flex flex-col bg-white dark:bg-darkSurface ${p.destaque ? 'border-2 border-primary shadow-xl shadow-primary/15' : 'border border-gray-200 dark:border-darkBorder'}`}>
                {p.destaque && <span className="absolute -top-3 left-6 rounded-full bg-primary text-white text-xs font-bold px-3 py-1">Mais escolhido</span>}
                <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary">{p.nome}</h2>
                <p className="text-sm text-lightText dark:text-darkTextSecondary">{p.para}</p>
                <p className="mt-4 text-darkText dark:text-darkTextPrimary"><span className="text-3xl font-bold tabular-nums">{brl(porMes)}</span><span className="text-lightText">/mês</span></p>
                <p className="text-xs text-lightText dark:text-darkTextSecondary h-4">{ciclo === 'anual' ? `${brl(valorDoCiclo(p, 'anual'))} por ano, em até 12x no cartão` : 'cobrado todo mês'}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {p.itens.map(it => <li key={it} className="flex gap-2 text-sm text-darkText dark:text-darkTextPrimary"><Check size={15} className="text-primary shrink-0 mt-0.5" /> {it}</li>)}
                </ul>
                <button onClick={() => assinar(p.id)} disabled={!!gerando || cortesia}
                  className={`mt-6 rounded-xl font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50 ${p.destaque ? 'bg-primary hover:bg-primary-hover text-white' : 'border border-gray-200 dark:border-darkBorder text-darkText dark:text-darkTextPrimary hover:border-primary hover:text-primary'}`}>
                  {gerando === p.id && <Loader2 size={16} className="animate-spin" />} Assinar {p.nome}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-center text-lightText dark:text-darkTextSecondary">
          O pagamento é feito na página segura da InfinitePay. Assim que for confirmado, sua empresa é liberada automaticamente.
        </p>
      </div>
    </Layout>
  );
};
