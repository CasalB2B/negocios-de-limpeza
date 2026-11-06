import React, { useEffect, useState } from 'react';
import { Sparkles, Lock, MessageCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

// 14-day free trial of a company created on the sign-up screen: a banner with the days left and,
// after the end, a screen that blocks the panel until the plan is chosen. Paying companies see nothing.

const WHATSAPP_VENDAS = '5527999808013';

interface Empresa { nome: string; status: string; teste_ate: string | null }

export function useEmpresaAtual() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  useEffect(() => {
    const carregar = () => supabase.from('empresas').select('nome, status, teste_ate').maybeSingle()
      .then(({ data }) => setEmpresa((data as Empresa) ?? null));
    carregar();
    window.addEventListener('ndl-login', carregar);
    return () => window.removeEventListener('ndl-login', carregar);
  }, []);
  return empresa;
}

const diasRestantes = (ate: string) => Math.ceil((new Date(ate).getTime() - Date.now()) / 86_400_000);

export const FaixaTeste: React.FC<{ empresa: Empresa | null }> = ({ empresa }) => {
  if (!empresa || empresa.status !== 'teste' || !empresa.teste_ate) return null;
  const dias = diasRestantes(empresa.teste_ate);
  if (dias <= 0) return null;
  const msg = encodeURIComponent(`Olá! Quero assinar o sistema para a ${empresa.nome}.`);
  return (
    <div className="mb-4 rounded-xl bg-primary text-white px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Sparkles size={16} className="shrink-0" />
      <span className="font-semibold">
        Teste grátis: {dias === 1 ? 'último dia' : `faltam ${dias} dias`}
      </span>
      <span className="opacity-85">Tudo liberado para você experimentar.</span>
      <a href={`https://wa.me/${WHATSAPP_VENDAS}?text=${msg}`} target="_blank" rel="noreferrer"
        className="ml-auto rounded-lg bg-white text-primary font-bold px-3 py-1 hover:bg-white/90">
        Escolher plano
      </a>
    </div>
  );
};

export const TesteEncerrado: React.FC<{ empresa: Empresa | null; onSair: () => void }> = ({ empresa, onSair }) => {
  if (!empresa || empresa.status !== 'teste' || !empresa.teste_ate || diasRestantes(empresa.teste_ate) > 0) return null;
  const msg = encodeURIComponent(`Olá! Meu teste grátis terminou e quero assinar o sistema para a ${empresa.nome}.`);
  return (
    <div className="fixed inset-0 z-[60] bg-gray-50/95 dark:bg-darkBg/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-darkSurface border border-gray-100 dark:border-darkBorder p-8 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto"><Lock size={22} /></div>
        <h2 className="mt-4 text-xl font-bold text-darkText dark:text-darkTextPrimary">Seu teste grátis terminou</h2>
        <p className="mt-2 text-sm text-lightText dark:text-darkTextSecondary">
          Seus dados continuam guardados. Escolha um plano para continuar usando o sistema com a sua equipe.
        </p>
        <a href={`https://wa.me/${WHATSAPP_VENDAS}?text=${msg}`} target="_blank" rel="noreferrer"
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold py-3">
          <MessageCircle size={17} /> Falar com a equipe e assinar
        </a>
        <button onClick={onSair} className="mt-3 text-sm font-semibold text-lightText hover:text-darkText inline-flex items-center gap-1.5">
          <LogOut size={14} /> Sair
        </button>
      </div>
    </div>
  );
};
