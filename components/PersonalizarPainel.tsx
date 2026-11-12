import React, { useState } from 'react';
import {
  ArrowDown, ArrowUp, BarChart2, BellRing, BookOpen, Calendar, Check, CreditCard, DollarSign, Eye, EyeOff,
  Landmark, List, MessageCircle, Plus, RotateCcw, Settings, UserPlus, Users, X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { preferencia, salvarPreferencia, podeVer } from '../lib/acesso';

// Dashboard layout per person: which blocks show, their order and the quick-action buttons.
// Saved in app_users.preferencias.painel (follows the account on computer and phone).

export interface ConfigPainel { ordem: string[]; ocultos: string[]; acoes: string[] }

export const BLOCOS: { id: string; label: string; dica: string; dinheiro?: boolean }[] = [
  { id: 'kpis', label: 'Números do dia', dica: 'Serviços hoje, receita, a receber e profissionais ativas' },
  { id: 'mapa', label: 'Mapa da equipe', dica: 'Onde cada profissional está agora' },
  { id: 'sumidos', label: 'Clientes sumidos', dica: 'Quem não agenda há meses' },
  { id: 'graficos', label: 'Gráficos', dica: 'Serviços dos últimos 7 dias e pagamentos do mês', dinheiro: true },
  { id: 'agenda', label: 'Agenda do dia e alertas', dica: 'Faxinas de hoje e o que precisa de atenção' },
  { id: 'acoes', label: 'Ações rápidas', dica: 'Botões para as telas que você mais abre' },
  { id: 'equipe', label: 'Equipe e contratações', dica: 'Ativas, candidatas em processo e avaliações' },
];

export const KPIS: { id: string; label: string; dinheiro?: boolean }[] = [
  { id: 'kpi_hoje', label: 'Serviços hoje' },
  { id: 'kpi_receita', label: 'Receita do mês', dinheiro: true },
  { id: 'kpi_receber', label: 'A receber', dinheiro: true },
  { id: 'kpi_ativas', label: 'Profissionais ativas' },
];

export const ACOES_RAPIDAS: { label: string; path: string; Icone: typeof Plus; cls: string }[] = [
  { label: 'Nova OS', path: '/admin/os', Icone: Plus, cls: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-100' },
  { label: 'Agenda', path: '/admin/calendar', Icone: Calendar, cls: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100' },
  { label: 'Clientes', path: '/admin/clients', Icone: Users, cls: 'text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-100' },
  { label: 'Financeiro', path: '/admin/financeiro', Icone: DollarSign, cls: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
  { label: 'Contas', path: '/admin/financeiro/contas', Icone: Landmark, cls: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
  { label: 'Lançamentos', path: '/admin/financeiro/lancamentos', Icone: List, cls: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
  { label: 'Recebimentos', path: '/admin/financeiro/recebimentos', Icone: CreditCard, cls: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
  { label: 'Profissionais', path: '/admin/rh/colaboradoras', Icone: UserPlus, cls: 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-100' },
  { label: 'Contratação', path: '/admin/rh/contratacao', Icone: BookOpen, cls: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-100' },
  { label: 'Desempenho', path: '/admin/rh/desempenho', Icone: BarChart2, cls: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-100' },
  { label: 'Avisos para a equipe', path: '/admin/avisos', Icone: BellRing, cls: 'text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-100' },
  { label: 'WhatsApp', path: '/admin/whatsapp', Icone: MessageCircle, cls: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-100' },
  { label: 'Configurações', path: '/admin/settings', Icone: Settings, cls: 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-100' },
];

const PADRAO: ConfigPainel = {
  ordem: BLOCOS.map(b => b.id),
  ocultos: [],
  acoes: ['/admin/os', '/admin/financeiro', '/admin/calendar', '/admin/clients', '/admin/rh/colaboradoras', '/admin/rh/contratacao', '/admin/rh/desempenho', '/admin/settings'],
};

export function painelAtual(): ConfigPainel {
  const p = preferencia<Partial<ConfigPainel>>('painel');
  if (!p) return PADRAO;
  // Blocks added later still show up (at the end) for people who saved an older layout.
  const ordem = [...(p.ordem ?? []).filter(id => BLOCOS.some(b => b.id === id)), ...BLOCOS.map(b => b.id).filter(id => !(p.ordem ?? []).includes(id))];
  return { ordem, ocultos: p.ocultos ?? [], acoes: p.acoes ?? PADRAO.acoes };
}

export const PersonalizarPainel: React.FC<{ valor: ConfigPainel; onClose: () => void; onSalvar: (c: ConfigPainel) => void }> = ({ valor, onClose, onSalvar }) => {
  const [c, setC] = useState<ConfigPainel>(valor);
  const veDinheiro = podeVer('/admin/financeiro/recebimentos');

  const alternar = (id: string) => setC(v => ({ ...v, ocultos: v.ocultos.includes(id) ? v.ocultos.filter(x => x !== id) : [...v.ocultos, id] }));
  const mover = (id: string, d: -1 | 1) => setC(v => {
    const o = [...v.ordem]; const i = o.indexOf(id); const j = i + d;
    if (j < 0 || j >= o.length) return v;
    [o[i], o[j]] = [o[j], o[i]];
    return { ...v, ordem: o };
  });
  const alternarAcao = (path: string) => setC(v => ({ ...v, acoes: v.acoes.includes(path) ? v.acoes.filter(x => x !== path) : [...v.acoes, path] }));

  const salvar = () => { onSalvar(c); salvarPreferencia('painel', c); onClose(); };

  const blocos = c.ordem.map(id => BLOCOS.find(b => b.id === id)!).filter(b => b && (!b.dinheiro || veDinheiro));

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-darkSurface rounded-t-3xl sm:rounded-3xl p-5 space-y-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-darkText dark:text-darkTextPrimary">Personalizar o Dashboard</h2>
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Escolha o que aparece e em que ordem. Vale só para você.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 p-1" aria-label="Fechar"><X size={20} /></button>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Blocos</p>
          <div className="space-y-1.5">
            {blocos.map((b, i) => {
              const visivel = !c.ocultos.includes(b.id);
              return (
                <div key={b.id} className={`rounded-xl border p-3 ${visivel ? 'border-gray-200 dark:border-darkBorder' : 'border-dashed border-gray-200 dark:border-darkBorder opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => alternar(b.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${visivel ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`} title={visivel ? 'Esconder' : 'Mostrar'}>
                      {visivel ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{b.label}</p>
                      <p className="text-[11px] text-lightText dark:text-darkTextSecondary truncate">{b.dica}</p>
                    </div>
                    <button onClick={() => mover(b.id, -1)} disabled={i === 0} className="p-1.5 text-gray-400 disabled:opacity-30" aria-label="Subir"><ArrowUp size={15} /></button>
                    <button onClick={() => mover(b.id, 1)} disabled={i === blocos.length - 1} className="p-1.5 text-gray-400 disabled:opacity-30" aria-label="Descer"><ArrowDown size={15} /></button>
                  </div>
                  {b.id === 'kpis' && visivel && (
                    <div className="mt-2 ml-10 flex flex-wrap gap-1.5">
                      {KPIS.filter(k => !k.dinheiro || veDinheiro).map(k => {
                        const on = !c.ocultos.includes(k.id);
                        return (
                          <button key={k.id} onClick={() => alternar(k.id)}
                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${on ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-lightText'}`}>
                            {on && <Check size={11} />} {k.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Botões de Ações rápidas</p>
          <div className="flex flex-wrap gap-1.5">
            {ACOES_RAPIDAS.filter(a => podeVer(a.path)).map(a => {
              const on = c.acoes.includes(a.path);
              return (
                <button key={a.path} onClick={() => alternarAcao(a.path)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${on ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-darkBorder text-darkText dark:text-darkTextPrimary'}`}>
                  <a.Icone size={13} /> {a.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-lightText mt-1.5">Roxo = aparece no Dashboard. Os botões aparecem na ordem em que você marcar.</p>
          {c.acoes.length === 0 && !c.ocultos.includes('acoes') && (
            <p className="text-[11px] font-semibold text-amber-600 mt-1">Nenhum botão marcado: o bloco Ações rápidas vai ficar vazio. Marque alguns ou esconda o bloco lá em cima.</p>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setC(PADRAO)} className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold text-lightText hover:bg-gray-50"><RotateCcw size={14} /> Padrão</button>
          <button onClick={salvar} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold"><Check size={15} /> Salvar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
