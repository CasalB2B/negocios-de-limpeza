import React, { useState, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import { Star, MessageSquare, Copy, ExternalLink, Check, Filter } from 'lucide-react';

const CARGO_LABEL: Record<CargoRH, string> = {
  JUNIOR: 'Auxiliar de Limpeza', SENIOR: 'Faxineira', PROFISSIONAL: 'Faxineira Profissional', LIDER: 'Líder de Equipe', GERENTE: 'Gerente de Equipe',
};

type Periodo = 'semana' | 'mes' | 'ano' | 'todos';

function getBaseUrl() {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

function getLinkAvaliacao(colaboradoraId: string) {
  return `${getBaseUrl()}#/avaliar?c=${colaboradoraId}`;
}

function getMsgWhatsApp(nomeColaboradora: string, link: string) {
  return encodeURIComponent(
    `Olá! 😊 Gostaríamos muito de saber sua opinião sobre a faxina realizada por *${nomeColaboradora}* da Negócios de Limpeza.\n\nAvalie agora em apenas 1 minutinho clicando no link abaixo:\n👉 ${link}\n\nSua opinião faz toda a diferença para nós! 💜`
  );
}

function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} className={s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'} />
      ))}
    </span>
  );
}

export const AdminRHAvaliacoes: React.FC = () => {
  const { colaboradoras, avaliacoes } = useRH();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [colabFiltro, setColabFiltro] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const now = new Date();

  const avaliacoesFiltradas = useMemo(() => {
    return avaliacoes.filter(a => {
      if (colabFiltro && a.colaboradoraId !== colabFiltro) return false;
      const d = new Date(a.createdAt);
      if (periodo === 'semana') {
        const semAgo = new Date(now); semAgo.setDate(semAgo.getDate() - 7);
        return d >= semAgo;
      }
      if (periodo === 'mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (periodo === 'ano') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [avaliacoes, periodo, colabFiltro, now]);

  const mediaGeral = useMemo(() => {
    if (!avaliacoesFiltradas.length) return null;
    return avaliacoesFiltradas.reduce((s, a) => s + a.estrelas, 0) / avaliacoesFiltradas.length;
  }, [avaliacoesFiltradas]);

  const porColaboradora = useMemo(() => {
    const map = new Map<string, { total: number; soma: number; avaliacoes: typeof avaliacoesFiltradas }>();
    for (const a of avaliacoesFiltradas) {
      const entry = map.get(a.colaboradoraId) ?? { total: 0, soma: 0, avaliacoes: [] };
      entry.total++;
      entry.soma += a.estrelas;
      entry.avaliacoes.push(a);
      map.set(a.colaboradoraId, entry);
    }
    return map;
  }, [avaliacoesFiltradas]);

  const handleCopy = (id: string, link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes', label: 'Este mês' },
    { key: 'ano', label: 'Este ano' },
    { key: 'todos', label: 'Todos' },
  ];

  const ativas = colaboradoras.filter(c => c.status === 'ATIVA');

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Avaliações</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">Avaliações enviadas pelos clientes via link</p>
        </div>

        {/* Período + filtro */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex rounded-xl border border-gray-200 dark:border-darkBorder overflow-hidden shrink-0">
            {PERIODOS.map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${periodo === p.key ? 'bg-primary text-white' : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50 dark:hover:bg-darkBg'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <select value={colabFiltro} onChange={e => setColabFiltro(e.target.value)}
            className="border border-input bg-white dark:bg-darkSurface rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todas as colaboradoras</option>
            {ativas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4">
            <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{avaliacoesFiltradas.length}</p>
            <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">Avaliações recebidas</p>
          </div>
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4">
            {mediaGeral != null ? (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{mediaGeral.toFixed(1)}</p>
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                </div>
                <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">Média geral</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">—</p>
                <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">Sem avaliações</p>
              </>
            )}
          </div>
        </div>

        {/* Por colaboradora — links de compartilhamento */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-3">
          <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm flex items-center gap-2">
            <ExternalLink size={16} className="text-primary" /> Links de Avaliação
          </h2>
          <p className="text-xs text-lightText dark:text-darkTextSecondary">Compartilhe com o cliente logo após a faxina.</p>
          <div className="space-y-2">
            {ativas.map(col => {
              const link = getLinkAvaliacao(col.id);
              const waLink = `https://wa.me/?text=${getMsgWhatsApp(col.nome, link)}`;
              const stats = porColaboradora.get(col.id);
              const copied = copiedId === col.id;
              return (
                <div key={col.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm overflow-hidden shrink-0">
                    {col.foto ? <img src={col.foto} alt={col.nome} className="w-full h-full object-cover rounded-xl" /> : col.nome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary truncate">{col.nome}</p>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">{CARGO_LABEL[col.cargoAtual]}{stats ? ` · ${stats.total} aval. · ${(stats.soma / stats.total).toFixed(1)}⭐` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* WhatsApp */}
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-lg flex items-center justify-center transition-colors"
                      title="Enviar por WhatsApp">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                    {/* Copiar link */}
                    <button onClick={() => handleCopy(col.id, link)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-gray-200 dark:bg-darkBorder hover:bg-primary/10 text-lightText hover:text-primary'}`}
                      title="Copiar link">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de avaliações */}
        {avaliacoesFiltradas.length === 0 ? (
          <div className="text-center py-12 text-lightText dark:text-darkTextSecondary">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nenhuma avaliação neste período.</p>
            <p className="text-sm mt-1">Compartilhe o link com seus clientes após cada faxina.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary text-sm">
              {avaliacoesFiltradas.length} {avaliacoesFiltradas.length === 1 ? 'avaliação' : 'avaliações'} encontradas
            </h2>
            {avaliacoesFiltradas.map(a => {
              const col = colaboradoras.find(c => c.id === a.colaboradoraId);
              return (
                <div key={a.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{a.nomeCliente}</p>
                      <p className="text-xs text-lightText dark:text-darkTextSecondary">
                        Para: <span className="font-medium text-darkText dark:text-darkTextPrimary">{col?.nome ?? '—'}</span>
                        {a.dataFaxina && ` · Faxina em ${new Date(a.dataFaxina + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <StarRow value={a.estrelas} size={14} />
                      <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-0.5">
                        {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  {a.comentario && (
                    <div className="bg-gray-50 dark:bg-darkBg rounded-xl px-3 py-2">
                      <p className="text-sm text-darkText dark:text-darkTextPrimary italic">"{a.comentario}"</p>
                    </div>
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
