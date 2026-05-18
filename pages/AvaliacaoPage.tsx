import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRH } from '../components/RHContext';
import { Star, CheckCircle, AlertCircle } from 'lucide-react';

const CARGO_LABEL: Record<string, string> = {
  JUNIOR: 'Faxineira Júnior',
  SENIOR: 'Faxineira Sênior',
  PROFISSIONAL: 'Faxineira Profissional',
  LIDER: 'Líder de Equipe',
  GERENTE: 'Gerente de Equipe',
};

export const AvaliacaoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const colaboradoraId = searchParams.get('c') || '';
  const { colaboradoras, addAvaliacao, rhLoading } = useRH();

  const colaboradora = colaboradoras.find(c => c.id === colaboradoraId);

  const [estrelas, setEstrelas] = useState(0);
  const [hoverEstrela, setHoverEstrela] = useState(0);
  const [nomeCliente, setNomeCliente] = useState('');
  const [dataFaxina, setDataFaxina] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async () => {
    if (!nomeCliente.trim()) { setErro('Por favor, informe seu nome.'); return; }
    if (estrelas === 0) { setErro('Por favor, selecione uma avaliação de 1 a 5 estrelas.'); return; }
    setErro('');
    setEnviando(true);
    await addAvaliacao({
      colaboradoraId,
      nomeCliente: nomeCliente.trim(),
      dataFaxina: dataFaxina || undefined,
      estrelas,
      comentario: comentario.trim() || undefined,
    });
    setEnviado(true);
    setEnviando(false);
  };

  if (rhLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!colaboradoraId || !colaboradora) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle size={48} className="text-red-400 mx-auto" />
          <h2 className="font-bold text-xl text-darkText dark:text-darkTextPrimary">Link inválido</h2>
          <p className="text-lightText dark:text-darkTextSecondary text-sm">Este link de avaliação não é válido ou expirou. Por favor, solicite um novo link à equipe Negócios de Limpeza.</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-6">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <div>
            <h2 className="font-bold text-2xl text-darkText dark:text-darkTextPrimary">Obrigada!</h2>
            <p className="text-lightText dark:text-darkTextSecondary mt-2 text-sm leading-relaxed">
              Sua avaliação foi registrada com sucesso. 💜<br/>
              Seu feedback é muito importante para continuarmos melhorando o serviço!
            </p>
          </div>
          <div className="flex justify-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={28} className={s <= estrelas ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
            ))}
          </div>
          <div className="bg-white dark:bg-darkSurface rounded-2xl p-4 flex items-center gap-3 border border-gray-100 dark:border-darkBorder">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg overflow-hidden shrink-0">
              {colaboradora.foto ? <img src={colaboradora.foto} alt={colaboradora.nome} className="w-full h-full object-cover" /> : colaboradora.nome[0]}
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{colaboradora.nome}</p>
              <p className="text-xs text-lightText dark:text-darkTextSecondary">{CARGO_LABEL[colaboradora.cargoAtual]}</p>
            </div>
          </div>
          <p className="text-xs text-lightText dark:text-darkTextSecondary">
            Negócios de Limpeza — Guarapari, ES<br/>
            <em>Amor · Compromisso · Confiança</em>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-darkSurface border-b border-gray-100 dark:border-darkBorder py-4 px-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold">NL</div>
        <div>
          <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary leading-tight">Negócios de Limpeza</p>
          <p className="text-[10px] text-lightText dark:text-darkTextSecondary">Guarapari, ES</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-8 space-y-6">
        {/* Colaboradora card */}
        <div className="bg-white dark:bg-darkSurface rounded-3xl border border-gray-100 dark:border-darkBorder p-6 flex flex-col items-center gap-3 shadow-sm">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary overflow-hidden">
            {colaboradora.foto
              ? <img src={colaboradora.foto} alt={colaboradora.nome} className="w-full h-full object-cover" />
              : colaboradora.nome[0]}
          </div>
          <div className="text-center">
            <p className="font-bold text-xl text-darkText dark:text-darkTextPrimary">{colaboradora.nome}</p>
            <span className="inline-block mt-1 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
              {CARGO_LABEL[colaboradora.cargoAtual]}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-darkSurface rounded-3xl border border-gray-100 dark:border-darkBorder p-6 space-y-5 shadow-sm">
          <div className="text-center">
            <h2 className="font-bold text-lg text-darkText dark:text-darkTextPrimary">Como foi sua faxina?</h2>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Sua opinião nos ajuda a melhorar sempre</p>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-3">
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverEstrela(s)}
                onMouseLeave={() => setHoverEstrela(0)}
                onClick={() => setEstrelas(s)}
                className="transition-transform active:scale-90 hover:scale-110"
              >
                <Star
                  size={40}
                  className={`transition-colors ${
                    s <= (hoverEstrela || estrelas)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200 dark:text-gray-700'
                  }`}
                />
              </button>
            ))}
          </div>

          {estrelas > 0 && (
            <p className="text-center text-sm font-bold text-primary animate-in fade-in">
              {estrelas === 1 ? 'Muito ruim' : estrelas === 2 ? 'Ruim' : estrelas === 3 ? 'Regular' : estrelas === 4 ? 'Bom' : '⭐ Excelente!'}
            </p>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Seu nome *</label>
            <input
              type="text"
              placeholder="Como devemos te chamar?"
              value={nomeCliente}
              onChange={e => setNomeCliente(e.target.value)}
              className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">
              Data da faxina <span className="font-normal text-lightText">(opcional)</span>
            </label>
            <input
              type="date"
              value={dataFaxina}
              onChange={e => setDataFaxina(e.target.value)}
              className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Comentário */}
          <div>
            <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">
              Deixe um comentário <span className="font-normal text-lightText">(opcional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="O que você achou? Tem alguma sugestão?"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-4 py-3 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
              <AlertCircle size={14} /> {erro}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={enviando}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-98 transition-all disabled:opacity-60 text-base"
          >
            {enviando ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>

        <p className="text-center text-xs text-lightText dark:text-darkTextSecondary pb-4">
          Negócios de Limpeza · <em>Amor · Compromisso · Confiança</em>
        </p>
      </div>
    </div>
  );
};
