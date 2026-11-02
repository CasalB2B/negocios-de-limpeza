import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, Loader, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Payment providers each company connects by itself. New providers get a card here.
const PROVEDORES = [
  { id: 'infinitepay', nome: 'InfinitePay', descricao: 'Link de pagamento com Pix e cartão. O dinheiro cai direto na sua conta InfinitePay.', disponivel: true },
  { id: 'mercadopago', nome: 'Mercado Pago', descricao: 'Pix, cartão e boleto pelo Mercado Pago.', disponivel: false },
] as const;

type Status = { handle: string | null; chave_configurada: boolean };

async function chamar(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('infinitepay', { body });
  if (error) {
    let msg = '';
    try { msg = (await (error as any)?.context?.json())?.error ?? ''; } catch {}
    throw new Error(msg || 'Não foi possível falar com a InfinitePay agora. Tente de novo.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const PagamentosIntegracao: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [tag, setTag] = useState('');
  const [testando, setTestando] = useState(false);
  const [linkTeste, setLinkTeste] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarChave, setMostrarChave] = useState(false);
  const [chave, setChave] = useState('');
  const [salvandoChave, setSalvandoChave] = useState(false);
  const [msgChave, setMsgChave] = useState('');

  useEffect(() => {
    chamar({ acao: 'status' })
      .then((s: Status) => { setStatus(s); setTag(s.handle ? `$${s.handle}` : ''); })
      .catch(() => setStatus({ handle: null, chave_configurada: false }));
  }, []);

  const conectar = async () => {
    setErro(''); setLinkTeste(''); setTestando(true);
    try {
      const r = await chamar({ acao: 'testar', handle: tag });
      setStatus(s => ({ handle: r.handle, chave_configurada: s?.chave_configurada ?? false }));
      setTag(`$${r.handle}`);
      setLinkTeste(r.url);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setTestando(false);
    }
  };

  const salvarChave = async (valor: string) => {
    setMsgChave(''); setSalvandoChave(true);
    try {
      const r = await chamar({ acao: 'salvar_chave', chave: valor });
      setStatus(s => ({ handle: s?.handle ?? null, chave_configurada: r.configurada }));
      setChave('');
      setMsgChave(r.configurada ? 'Chave salva no servidor.' : 'Chave removida.');
    } catch (e: any) {
      setMsgChave(e.message);
    } finally {
      setSalvandoChave(false);
    }
  };

  const conectado = !!status?.handle;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-bold text-darkText dark:text-darkTextPrimary text-base flex items-center gap-2">
          <CreditCard size={18} className="text-primary" /> Recebimentos
        </h4>
        <p className="text-xs text-lightText dark:text-darkTextSecondary mt-1">
          Conecte onde você recebe. As cobranças das OS saem por aqui e o pagamento é confirmado sozinho.
        </p>
      </div>

      {PROVEDORES.map(p => p.id !== 'infinitepay' ? (
        <div key={p.id} className="rounded-2xl border border-dashed border-gray-200 dark:border-darkBorder p-5 flex items-center justify-between gap-3 opacity-70">
          <div className="min-w-0">
            <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{p.nome}</p>
            <p className="text-xs text-lightText dark:text-darkTextSecondary">{p.descricao}</p>
          </div>
          <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-darkBg text-lightText dark:text-darkTextSecondary">Em breve</span>
        </div>
      ) : (
        <div key={p.id} className="bg-gray-50 dark:bg-darkBg rounded-2xl border border-gray-200 dark:border-darkBorder p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-base text-darkText dark:text-darkTextPrimary">{p.nome}</p>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">{p.descricao}</p>
            </div>
            {status === null ? (
              <Loader size={16} className="animate-spin text-lightText shrink-0" />
            ) : (
              <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${conectado ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                {conectado ? '● Conectado' : '● Não conectado'}
              </span>
            )}
          </div>

          <ol className="text-xs text-lightText dark:text-darkTextSecondary space-y-1 list-decimal pl-4">
            <li>Abra o app <strong className="text-darkText dark:text-darkTextPrimary">InfinitePay</strong> e toque no seu perfil.</li>
            <li>Copie a sua <strong className="text-darkText dark:text-darkTextPrimary">InfiniteTag</strong> (começa com <code>$</code>).</li>
            <li>Cole abaixo e toque em <strong className="text-darkText dark:text-darkTextPrimary">Conectar e testar</strong>. Vamos gerar um link de R$ 1,00 só para você conferir o nome da sua empresa — não precisa pagar.</li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={tag}
              onChange={e => setTag(e.target.value)}
              placeholder="$suaempresa"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary focus:border-primary outline-none"
            />
            <button
              onClick={conectar}
              disabled={testando || !tag.trim()}
              className="shrink-0 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {testando ? <Loader size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {conectado ? 'Atualizar e testar' : 'Conectar e testar'}
            </button>
          </div>

          {erro && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-px" /> {erro}</p>
          )}
          {linkTeste && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-xs text-green-800 dark:text-green-300 space-y-1">
              <p className="font-bold">Conectado! Confira se o checkout mostra a sua empresa:</p>
              <a href={linkTeste} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline">
                Abrir link de teste (R$ 1,00) <ExternalLink size={12} />
              </a>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-darkBorder pt-3">
            <button onClick={() => setMostrarChave(v => !v)} className="w-full flex items-center justify-between text-xs font-bold text-lightText dark:text-darkTextSecondary">
              <span className="flex items-center gap-1.5"><KeyRound size={13} /> Opcional: chave de API {status?.chave_configurada ? '(configurada)' : ''}</span>
              {mostrarChave ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {mostrarChave && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-lightText dark:text-darkTextSecondary">
                  Com a chave, cada cobrança aceita <strong>um único pagamento</strong> e vence em 7 dias. Gere na área de integrações/Checkout da sua conta InfinitePay (começa com <code>inchk_</code>). Ela fica guardada só no servidor.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={chave}
                    onChange={e => setChave(e.target.value)}
                    placeholder={status?.chave_configurada ? '•••••••• (já configurada)' : 'inchk_...'}
                    className="flex-1 min-w-0 p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary focus:border-primary outline-none"
                  />
                  <button
                    onClick={() => salvarChave(chave)}
                    disabled={salvandoChave || !chave.trim()}
                    className="shrink-0 px-4 py-3 rounded-xl border border-primary text-primary text-sm font-bold disabled:opacity-50"
                  >
                    Salvar chave
                  </button>
                  {status?.chave_configurada && (
                    <button onClick={() => salvarChave('')} disabled={salvandoChave} className="shrink-0 px-4 py-3 rounded-xl text-sm font-bold text-red-600">
                      Remover
                    </button>
                  )}
                </div>
                {msgChave && <p className="text-xs font-semibold text-darkText dark:text-darkTextPrimary">{msgChave}</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
