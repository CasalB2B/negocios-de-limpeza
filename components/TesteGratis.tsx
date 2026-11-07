import React, { useEffect, useState } from 'react';
import { Sparkles, Lock, MessageCircle, LogOut, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Free trial and subscription state of the company: a banner while the trial runs (or close to renewal)
// and, when the trial or the paid period ends, a screen that blocks the panel until the plan is paid.
// The owner's company (active, no end date) sees nothing.

const WHATSAPP_VENDAS = '5527999808013';
const TELA_ASSINATURA = '#/admin/assinatura';

interface Empresa { nome: string; status: string; teste_ate: string | null; assinatura_ate: string | null }

export function useEmpresaAtual() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  useEffect(() => {
    const carregar = () => supabase.from('empresas').select('nome, status, teste_ate, assinatura_ate').maybeSingle()
      .then(({ data }) => setEmpresa((data as Empresa) ?? null));
    carregar();
    window.addEventListener('ndl-login', carregar);
    return () => window.removeEventListener('ndl-login', carregar);
  }, []);
  return empresa;
}

const diasRestantes = (ate: string) => Math.ceil((new Date(ate).getTime() - Date.now()) / 86_400_000);

// Why the panel is blocked, or null when it is free to use.
function bloqueio(e: Empresa | null): string | null {
  if (!e) return null;
  if (e.status === 'teste') return e.teste_ate && diasRestantes(e.teste_ate) <= 0 ? 'Seu teste grátis terminou' : null;
  if (e.status === 'ativa') return e.assinatura_ate && diasRestantes(e.assinatura_ate) <= 0 ? 'Sua assinatura venceu' : null;
  if (e.status === 'suspensa') return 'O acesso da sua empresa está suspenso';
  if (e.status === 'cancelada') return 'A assinatura da sua empresa foi cancelada';
  return null;
}

export const FaixaTeste: React.FC<{ empresa: Empresa | null }> = ({ empresa }) => {
  if (!empresa || bloqueio(empresa)) return null;
  let texto: string | null = null;
  let detalhe = '';
  if (empresa.status === 'teste' && empresa.teste_ate) {
    const dias = diasRestantes(empresa.teste_ate);
    texto = `Teste grátis: ${dias === 1 ? 'último dia' : `faltam ${dias} dias`}`;
    detalhe = 'Tudo liberado para você experimentar.';
  } else if (empresa.status === 'ativa' && empresa.assinatura_ate && diasRestantes(empresa.assinatura_ate) <= 7) {
    const dias = diasRestantes(empresa.assinatura_ate);
    texto = `Sua assinatura vence ${dias === 1 ? 'amanhã' : `em ${dias} dias`}`;
    detalhe = 'Renove para não perder o acesso.';
  }
  if (!texto) return null;
  return (
    <div className="mb-4 rounded-xl bg-primary text-white px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Sparkles size={16} className="shrink-0" />
      <span className="font-semibold">{texto}</span>
      <span className="opacity-85">{detalhe}</span>
      <a href={TELA_ASSINATURA} className="ml-auto rounded-lg bg-white text-primary font-bold px-3 py-1 hover:bg-white/90">
        {empresa.status === 'teste' ? 'Escolher plano' : 'Renovar'}
      </a>
    </div>
  );
};

export const TesteEncerrado: React.FC<{ empresa: Empresa | null; onSair: () => void; naTelaDeAssinatura: boolean }> = ({ empresa, onSair, naTelaDeAssinatura }) => {
  const motivo = bloqueio(empresa);
  if (!motivo || naTelaDeAssinatura) return null;
  const msg = encodeURIComponent(`Olá! Preciso de ajuda com a assinatura da ${empresa!.nome}.`);
  return (
    <div className="fixed inset-0 z-[60] bg-gray-50/95 dark:bg-darkBg/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-8 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto"><Lock size={22} /></div>
        <h2 className="mt-4 text-xl font-bold text-darkText dark:text-darkTextPrimary">{motivo}</h2>
        <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">
          Seus dados continuam guardados. Escolha um plano para continuar usando o sistema com a sua equipe.
        </p>
        <a href={TELA_ASSINATURA}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold py-3">
          <CreditCard size={17} /> Escolher plano e pagar
        </a>
        <a href={`https://wa.me/${WHATSAPP_VENDAS}?text=${msg}`} target="_blank" rel="noreferrer"
          className="mt-3 text-sm font-semibold text-primary inline-flex items-center gap-1.5">
          <MessageCircle size={14} /> Falar com a equipe
        </a>
        <div>
          <button onClick={onSair} className="mt-3 text-sm font-semibold text-lightText hover:text-darkText inline-flex items-center gap-1.5">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
    </div>
  );
};
