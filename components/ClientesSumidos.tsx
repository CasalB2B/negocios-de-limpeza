import React, { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getClientesSumidos, ClienteSumido } from '../lib/clientesSumidos';

interface Props {
  services: any[];
}

export const ClientesSumidosCard: React.FC<Props> = ({ services }) => {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<30 | 45 | 60>(30);

  const sumidos = getClientesSumidos(services, filter);
  if (sumidos.length === 0) return null;

  const formatWAMsg = (c: ClienteSumido) =>
    encodeURIComponent(`Olá ${c.nome}! 😊\n\nSentimos sua falta! Faz ${c.diasSumido} dias desde sua última faxina.\nQue tal agendar? Responda aqui ou nos chame. 💜\n— Negócios de Limpeza`);

  const getPhone = (tel: string | null) => {
    if (!tel) return null;
    const d = tel.replace(/\D/g, '');
    return d.startsWith('55') ? d : `55${d}`;
  };

  return (
    <div className="bg-orange-50 border border-orange-200 dark:bg-orange-900/10 dark:border-orange-800/40 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors"
      >
        <span className="text-xl">👻</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-orange-800 dark:text-orange-300">
            {sumidos.length} cliente{sumidos.length > 1 ? 's' : ''} sumido{sumidos.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Sem agendamento há +{filter} dias
          </p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-orange-500" /> : <ChevronDown size={16} className="text-orange-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            {([30, 45, 60] as const).map(d => (
              <button key={d}
                onClick={() => setFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filter === d ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
              >
                +{d} dias
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sumidos.map((c, i) => {
              const phone = getPhone(c.telefone);
              return (
                <div key={i} className="flex items-center gap-3 bg-white dark:bg-darkSurface rounded-xl px-3 py-2.5 border border-orange-100 dark:border-orange-800/30">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                    {c.nome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary truncate">{c.nome}</p>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400">
                      Último: {c.ultimoServico} · {c.diasSumido} dias atrás
                    </p>
                  </div>
                  {phone ? (
                    <a
                      href={`https://wa.me/${phone}?text=${formatWAMsg(c)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[10px] font-bold transition-colors shrink-0"
                    >
                      <MessageCircle size={10} /> Chamar
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400">Sem tel.</span>
                  )}
                </div>
              );
            })}
          </div>

          {sumidos.filter(c => c.telefone).length > 1 && (
            <p className="text-[10px] text-orange-500 text-center">
              {sumidos.filter(c => c.telefone).length} com WhatsApp disponível
            </p>
          )}
        </div>
      )}
    </div>
  );
};
