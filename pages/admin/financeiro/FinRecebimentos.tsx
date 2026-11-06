// Faxinas do mês e o que falta receber de cada uma. A baixa manual (Pix, dinheiro…) já lança a receita na conta escolhida;
// o que a cliente paga pelo link da InfinitePay entra sozinho.
import React, { useEffect, useState, useCallback } from 'react';
import { Check, Clock, CreditCard, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useFinanceiro, useMesFin, brl, hoje, r2 } from '../../../lib/financeiro';
import { FinShell, card, Carregando, Modal, inputCls, labelCls, lerValor, valorParaCampo } from './comum';

interface Servico {
  id: string; client_name: string | null; collaborator_name: string | null; type: string; date: string; time: string | null;
  price: number | null; status: string; payment_status: string | null; payment_method: string | null; signal_amount: number | null;
}
const FORMAS = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto'];

const pagoInteiro = (s: Servico) => ['PAID', 'PAGO', 'FULL_PAID'].includes(s.payment_status ?? '');
const sinalPago = (s: Servico) => s.payment_status === 'SIGNAL_PAID';
const falta = (s: Servico) => pagoInteiro(s) ? 0 : r2((Number(s.price) || 0) - (sinalPago(s) ? Number(s.signal_amount) || 0 : 0));

export const FinRecebimentos: React.FC = () => {
  const fin = useFinanceiro();
  const [mes, setMes] = useMesFin();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'TODOS' | 'RECEBER' | 'PAGOS'>('RECEBER');
  const [baixa, setBaixa] = useState<Servico | null>(null);

  const carregar = useCallback(async () => {
    const [a, m] = mes.split('-');
    // A data do serviço é texto 'DD/MM/AAAA': filtra pelo final "/MM/AAAA".
    const { data } = await supabase.from('services')
      .select('id, client_name, collaborator_name, type, date, time, price, status, payment_status, payment_method, signal_amount')
      .neq('status', 'CANCELLED').like('date', `%/${m}/${a}`);
    setServicos(((data ?? []) as Servico[]).sort((x, y) => x.date.split('/').reverse().join('').localeCompare(y.date.split('/').reverse().join(''))));
    setCarregando(false);
  }, [mes]);
  useEffect(() => { carregar(); }, [carregar]);

  if (carregando || fin.carregando) return <FinShell titulo="Recebimentos"><Carregando erro={fin.erro} /></FinShell>;

  const totalMes = servicos.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const aReceber = servicos.reduce((s, x) => s + falta(x), 0);
  const lista = servicos.filter(s => filtro === 'TODOS' ? true : filtro === 'PAGOS' ? pagoInteiro(s) : !pagoInteiro(s));

  return (
    <FinShell titulo="Recebimentos" mes={mes} onMes={setMes}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className={`${card} p-4`}><p className="text-xs text-lightText">Faxinas do mês</p><p className="text-lg font-extrabold text-darkText dark:text-darkTextPrimary">{servicos.length} · {brl(totalMes)}</p></div>
        <div className={`${card} p-4`}><p className="text-xs text-lightText">Já recebido</p><p className="text-lg font-extrabold text-emerald-600">{brl(totalMes - aReceber)}</p></div>
        <div className={`${card} p-4`}><p className="text-xs text-lightText">Falta receber</p><p className="text-lg font-extrabold text-amber-600">{brl(aReceber)}</p></div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-darkBorder flex gap-1 bg-transparent">
          <div className="flex gap-1 bg-gray-100 dark:bg-darkBorder rounded-xl p-1">
            {([['RECEBER', 'A receber'], ['PAGOS', 'Pagos'], ['TODOS', 'Todos']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1 rounded-lg text-xs font-bold ${filtro === k ? 'bg-white dark:bg-darkSurface shadow-sm text-darkText dark:text-darkTextPrimary' : 'text-lightText'}`}>{l}</button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-lightText text-center py-14">Nada aqui neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-lightText border-b border-gray-100 dark:border-darkBorder">
                  {['Data', 'Cliente', 'Serviço', 'Valor', 'Situação', ''].map(h => <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lista.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-darkBorder">
                    <td className="px-4 py-2.5 whitespace-nowrap text-darkText dark:text-darkTextPrimary">{s.date}</td>
                    <td className="px-4 py-2.5 text-darkText dark:text-darkTextPrimary max-w-[180px] truncate">{s.client_name || '—'}</td>
                    <td className="px-4 py-2.5 text-lightText max-w-[180px] truncate">{s.type}</td>
                    <td className="px-4 py-2.5 font-bold text-darkText dark:text-darkTextPrimary whitespace-nowrap">{brl(Number(s.price) || 0)}</td>
                    <td className="px-4 py-2.5">
                      {pagoInteiro(s) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                          <Check size={11} /> Pago{s.payment_method ? ` · ${s.payment_method}` : ''}
                        </span>
                      ) : sinalPago(s) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">
                          <Zap size={11} /> Sinal pago · falta {brl(falta(s))}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full"><Clock size={11} /> A receber</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!pagoInteiro(s) && falta(s) > 0 && (
                        <button onClick={() => setBaixa(s)} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg">
                          <CreditCard size={12} /> Recebi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-lightText dark:text-darkTextSecondary">
        Pagamentos pelo link da InfinitePay são marcados e lançados sozinhos. Use "Recebi" para Pix direto, dinheiro ou maquininha: o valor já entra na conta escolhida.
      </p>
      {baixa && <BaixaModal servico={baixa} fin={fin} onFechar={() => setBaixa(null)} onFeito={() => { setBaixa(null); carregar(); fin.recarregar(); }} />}
    </FinShell>
  );
};

const BaixaModal: React.FC<{ servico: Servico; fin: ReturnType<typeof useFinanceiro>; onFechar: () => void; onFeito: () => void }> = ({ servico, fin, onFechar, onFeito }) => {
  const contas = fin.contas.filter(c => !c.arquivada);
  const [forma, setForma] = useState(FORMAS[0]);
  const [contaId, setContaId] = useState(contas.find(c => c.padrao)?.id ?? contas[0]?.id ?? '');
  const [valor, setValor] = useState(valorParaCampo(falta(servico)));
  const [data, setData] = useState(hoje());
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    const v = lerValor(valor);
    if (v <= 0) return setMsg('Informe o valor recebido.');
    if (!contaId) return setMsg('Cadastre uma conta na aba Contas.');
    setSalvando(true);
    const cat = fin.categorias.find(c => c.sistema === 'SERVICOS');
    const { error } = await supabase.from('fin_lancamentos').insert({
      tipo: 'RECEITA', descricao: `${(servico.client_name || 'Cliente').trim()} — ${servico.type}`, valor: v, data, pago: true,
      conta_id: contaId, categoria_id: cat?.id ?? null, origem: 'SERVICO', referencia: `${servico.id}:${sinalPago(servico) ? 'restante' : 'total'}`,
      observacao: `Recebido por ${forma}`,
    });
    if (error && !error.message.includes('duplicate')) { setSalvando(false); return setMsg(error.message); }
    const { error: e2 } = await supabase.from('services').update({ payment_status: 'FULL_PAID', payment_method: forma, paid_at: new Date().toISOString() }).eq('id', servico.id);
    setSalvando(false);
    if (e2) return setMsg(e2.message);
    onFeito();
  }

  return (
    <Modal titulo="Registrar recebimento" onFechar={onFechar}>
      <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-lightText">Cliente</span><b className="text-darkText dark:text-darkTextPrimary">{servico.client_name}</b></div>
        <div className="flex justify-between"><span className="text-lightText">Serviço</span><span className="text-darkText dark:text-darkTextPrimary">{servico.type} · {servico.date}</span></div>
        {sinalPago(servico) && <div className="flex justify-between"><span className="text-lightText">Sinal já pago</span><span className="text-teal-600">{brl(Number(servico.signal_amount) || 0)}</span></div>}
      </div>
      <div>
        <label className={labelCls}>Forma de pagamento</label>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMAS.map(f => (
            <button key={f} onClick={() => setForma(f)} className={`py-2 rounded-xl text-xs font-bold border ${forma === f ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Valor recebido</label><input className={inputCls} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} /></div>
        <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={data} onChange={e => setData(e.target.value)} /></div>
        <div className="col-span-2">
          <label className={labelCls}>Entrou na conta</label>
          <select className={inputCls} value={contaId} onChange={e => setContaId(e.target.value)}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>
      {msg && <p className="text-sm text-red-500">{msg}</p>}
      <button onClick={confirmar} disabled={salvando} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-60">
        {salvando ? 'Salvando...' : `Confirmar recebimento de ${brl(lerValor(valor))}`}
      </button>
    </Modal>
  );
};
