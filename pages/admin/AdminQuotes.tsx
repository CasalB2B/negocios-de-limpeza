import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { useData, Quote } from '../../components/DataContext';
import { MessageSquare, Phone, Mail, MapPin, Home, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, TrendingUp, X } from 'lucide-react';

const STATUS_LABELS: Record<Quote['status'], { label: string; color: string; bg: string }> = {
  NEW: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  CONTACTED: { label: 'Contatado', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  CONVERTED: { label: 'Convertido', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  LOST: { label: 'Perdido', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const QuoteCard: React.FC<{ quote: Quote; onStatusChange: (id: string, s: Quote['status']) => void }> = ({ quote, onStatusChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const status = STATUS_LABELS[quote.status];
  const date = new Date(quote.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header da card */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare size={22} className="text-[#a163ff]" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{quote.name || 'Sem nome'}</h3>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${status.bg} ${status.color} flex-shrink-0`}>
            {status.label}
          </span>
        </div>

        {/* Contato rápido */}
        <div className="mt-4 flex flex-wrap gap-3">
          {quote.whatsapp && (
            <a
              href={`https://wa.me/55${quote.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${quote.name}! Recebemos seu orçamento pela nossa plataforma. Podemos conversar?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Phone size={13} /> {quote.whatsapp}
            </a>
          )}
          {quote.email && (
            <a
              href={`mailto:${quote.email}`}
              className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Mail size={13} /> {quote.email}
            </a>
          )}
          {quote.cep && (
            <span className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
              <MapPin size={13} /> CEP: {quote.cep}
            </span>
          )}
        </div>

        {/* Resumo rápido */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {quote.propertyType && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Tipo de Imóvel</p>
              <p className="text-sm font-bold text-gray-800">{quote.propertyType}</p>
            </div>
          )}
          {quote.serviceOption && (
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Opção de Serviço</p>
              <p className="text-sm font-bold text-purple-800">{quote.serviceOption}</p>
            </div>
          )}
        </div>
      </div>

      {/* Expandir detalhes */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
      >
        Ver detalhes completos
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3 space-y-3 border-t border-gray-100">
          {quote.rooms && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Cômodos</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{quote.rooms}</p>
            </div>
          )}
          {quote.priorities && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Prioridades</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{quote.priorities}</p>
            </div>
          )}
          {quote.internalCleaning && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Limpeza Interna</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{quote.internalCleaning}</p>
            </div>
          )}
          {quote.renovation && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Reforma / Pós-Obra</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{quote.renovation}</p>
            </div>
          )}
          {quote.chatSummary && (
            <button
              onClick={() => setShowChat(true)}
              className="text-xs font-bold text-[#a163ff] hover:underline"
            >
              Ver histórico completo do chat →
            </button>
          )}
        </div>
      )}

      {/* Ações de status */}
      <div className="px-5 pb-5 pt-0 flex flex-wrap gap-2">
        {(['NEW', 'CONTACTED', 'CONVERTED', 'LOST'] as Quote['status'][]).map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(quote.id, s)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
              quote.status === s
                ? `${STATUS_LABELS[s].bg} ${STATUS_LABELS[s].color} border-current`
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >
            {STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {/* Modal: histórico do chat */}
      {showChat && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowChat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">Histórico do Chat — {quote.name}</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{quote.chatSummary}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminQuotes: React.FC = () => {
  const { quotes, updateQuoteStatus } = useData();
  const [filter, setFilter] = useState<Quote['status'] | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? quotes : quotes.filter(q => q.status === filter);

  const counts = {
    ALL: quotes.length,
    NEW: quotes.filter(q => q.status === 'NEW').length,
    CONTACTED: quotes.filter(q => q.status === 'CONTACTED').length,
    CONVERTED: quotes.filter(q => q.status === 'CONVERTED').length,
    LOST: quotes.filter(q => q.status === 'LOST').length,
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Orçamentos via Chat</h1>
          <p className="text-sm text-gray-500 mt-1">Leads gerados pela assistente virtual do site</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-blue-600">Novos</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{counts.NEW}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-yellow-500" />
              <span className="text-xs font-bold text-yellow-600">Contatados</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{counts.CONTACTED}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-xs font-bold text-green-600">Convertidos</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{counts.CONVERTED}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-purple-500" />
              <span className="text-xs font-bold text-purple-600">Taxa de conversão</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {counts.ALL > 0 ? Math.round((counts.CONVERTED / counts.ALL) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'NEW', 'CONTACTED', 'CONVERTED', 'LOST'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
                filter === s
                  ? 'bg-[#a163ff] text-white border-[#a163ff] shadow-md shadow-purple-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s === 'ALL' ? 'Todos' : STATUS_LABELS[s].label} ({counts[s]})
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">Nenhum orçamento {filter !== 'ALL' ? 'com este status' : 'ainda'}</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'ALL' ? 'Os orçamentos do chat aparecerão aqui' : 'Tente outro filtro'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(q => (
              <QuoteCard key={q.id} quote={q} onStatusChange={updateQuoteStatus} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
