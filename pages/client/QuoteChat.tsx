import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Loader, CheckCircle, Phone, Sparkles } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { sendMessage, GeminiMessage, extractQuoteData, cleanAIResponse } from '../../lib/gemini';

const INITIAL_AI_MESSAGE = `Olá! 👋 Bem-vindo à **Negócios de Limpeza**!

Sou a assistente virtual da empresa e estou aqui para te ajudar a gerar um **orçamento gratuito e personalizado** para o seu imóvel. 🏠✨

Para começar, pode me informar:
• **Nome completo**
• **E-mail**
• **WhatsApp** (com DDD)
• **CEP**`;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const formatText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
};

export const QuoteChat: React.FC = () => {
  const navigate = useNavigate();
  const { addQuote } = useData();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: INITIAL_AI_MESSAGE, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isComplete) return;

    const userMessage: ChatMessage = { role: 'user', text: trimmed, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setApiError(null);

    try {
      // Build Gemini history (skip the hardcoded initial message — it's in system prompt)
      const geminiHistory: GeminiMessage[] = updatedMessages
        .slice(1) // skip hardcoded initial greeting
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      // Ensure valid alternating structure (Gemini requires user/model alternation)
      const validHistory = geminiHistory.length > 0 ? geminiHistory : [{ role: 'user' as const, parts: [{ text: trimmed }] }];

      const rawResponse = await sendMessage(validHistory);

      const quoteData = extractQuoteData(rawResponse);
      const cleanedText = cleanAIResponse(rawResponse);

      const aiMessage: ChatMessage = {
        role: 'model',
        text: cleanedText || rawResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      if (quoteData && quoteData.name) {
        // Build chat summary
        const summary = updatedMessages
          .slice(1)
          .map(m => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.text}`)
          .join('\n\n');

        const saved = await addQuote({
          name: quoteData.name || '',
          email: quoteData.email || '',
          whatsapp: quoteData.whatsapp || '',
          cep: quoteData.cep || '',
          propertyType: quoteData.propertyType || '',
          rooms: quoteData.rooms || '',
          priorities: quoteData.priorities || '',
          internalCleaning: quoteData.internalCleaning || '',
          renovation: quoteData.renovation || '',
          serviceOption: quoteData.serviceOption || '',
          chatSummary: summary,
        });
        setQuoteId(saved.id);
        setIsComplete(true);
      }
    } catch (err: any) {
      setApiError(err.message || 'Erro ao conectar com a assistente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#a163ff] to-[#6b21a8] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Orçamento enviado!</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Recebemos suas informações. Nossa equipe vai analisar e entrar em contato pelo <strong>WhatsApp em até 24 horas</strong> com seu orçamento personalizado. 🎉
          </p>
          <div className="bg-purple-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#a163ff] rounded-full flex items-center justify-center flex-shrink-0">
              <Phone size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">Fale conosco agora</p>
              <p className="font-bold text-gray-800">(27) 99980-8013</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.open('https://wa.me/5527999808013', '_blank')}
              className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
            >
              Falar no WhatsApp agora
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#a163ff] shadow-lg sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">Assistente NDL</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/70 text-xs">Online agora</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <Sparkles size={14} className="text-yellow-300" />
            <span className="text-white text-xs font-bold">Orçamento Grátis</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 bg-[#a163ff] rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm leading-relaxed text-sm ${
                msg.role === 'user'
                  ? 'bg-[#a163ff] text-white rounded-tr-none'
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}
            >
              {msg.role === 'model' ? (
                <span>{formatText(msg.text)}</span>
              ) : (
                <span>{msg.text}</span>
              )}
              <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-[#a163ff] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <strong>Ops!</strong> {apiError}
            {apiError.includes('GEMINI') && (
              <p className="mt-1 text-xs text-red-500">
                Configure a variável VITE_GEMINI_API_KEY com uma chave válida do Google AI Studio.
              </p>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua resposta..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 focus:border-[#a163ff] focus:ring-1 focus:ring-[#a163ff] outline-none transition-all bg-gray-50 max-h-32 overflow-y-auto"
            style={{ minHeight: '48px' }}
            disabled={isLoading || isComplete}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isComplete}
            className="w-12 h-12 bg-[#a163ff] hover:bg-[#8f4ee0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow-md shadow-purple-200"
          >
            {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 pb-3">
          Pressione Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};
