import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Loader, CheckCircle, Phone, Sparkles, Camera, X, Home, Calendar, FileText, User, Copy, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { UserRole } from '../../types';
import { sendMessage, GeminiMessage, extractQuoteData, cleanAIResponse } from '../../lib/gemini';
import { sendMessage as sendWhatsApp, buildMessage } from '../../lib/evolution';
import { supabase } from '../../lib/supabase';

// ── UTM helpers ──────────────────────────────────────────────────────────────
interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

function readUtmsFromUrl(): UtmParams {
  // HashRouter: URL looks like /#/client/quote-chat?utm_source=instagram
  const hashSearch = window.location.hash.includes('?')
    ? window.location.hash.split('?')[1]
    : window.location.search;
  const params = new URLSearchParams(hashSearch);
  const utms: UtmParams = {};
  if (params.get('utm_source'))   utms.utm_source   = params.get('utm_source')!;
  if (params.get('utm_medium'))   utms.utm_medium   = params.get('utm_medium')!;
  if (params.get('utm_campaign')) utms.utm_campaign = params.get('utm_campaign')!;
  if (params.get('utm_content'))  utms.utm_content  = params.get('utm_content')!;
  if (params.get('utm_term'))     utms.utm_term     = params.get('utm_term')!;
  return utms;
}

function saveUtmsToSession(sessionId: string, utms: UtmParams) {
  if (Object.keys(utms).length > 0) {
    sessionStorage.setItem(`utm_${sessionId}`, JSON.stringify(utms));
  }
}

function getUtmsFromSession(sessionId: string): UtmParams {
  try {
    const stored = sessionStorage.getItem(`utm_${sessionId}`);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

// ── Analytics helpers ────────────────────────────────────────────────────────
function trackEvent(eventType: string, sessionId: string, extraUtms?: UtmParams) {
  const utms = extraUtms || getUtmsFromSession(sessionId);
  supabase.from('page_analytics').insert({
    event_type: eventType,
    source: 'web_chat',
    session_id: sessionId,
    utm_source:   utms.utm_source   || null,
    utm_medium:   utms.utm_medium   || null,
    utm_campaign: utms.utm_campaign || null,
    utm_content:  utms.utm_content  || null,
    utm_term:     utms.utm_term     || null,
  }).then(); // fire and forget
}

const INITIAL_AI_MESSAGE = `Olá! 👋 Bem-vindo à **Negócios de Limpeza**!

Vou te ajudar a gerar um **orçamento gratuito** rapidinho. 🏠✨

Para começar... qual é o seu **nome**? 😊`;

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  photos?: string[];
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
  const { addQuote, registerClient, loginClient, addClientAddress, currentUser } = useData();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Stable session ID for analytics (generated once per page load)
  const analyticsSessionId = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ws_${Date.now()}`
  );

  // Demo mode: ?demo=true skips the chat and shows the onboarding screen with fake data
  // HashRouter puts params in the hash: /#/client/quote-chat?demo=true
  const hashSearch = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
  const isDemo = new URLSearchParams(hashSearch).get('demo') === 'true';

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: INITIAL_AI_MESSAGE, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(isDemo);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [chatPhotos, setChatPhotos] = useState<string[]>([]);
  const [savedName, setSavedName] = useState(isDemo ? 'Maria' : '');
  const [credentials, setCredentials] = useState<{ login: string; password: string } | null>(
    isDemo ? { login: 'maria@email.com', password: '8888' } : null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'login' | 'password' | null>(null);

  // Se já está logado, vai direto pro dashboard
  useEffect(() => {
    if (currentUser) navigate('/client/dashboard');
  }, [currentUser, navigate]);

  // Capture UTMs from URL on mount and track page view
  useEffect(() => {
    if (isDemo) return;
    const utms = readUtmsFromUrl();
    saveUtmsToSession(analyticsSessionId.current, utms);
    trackEvent('page_view', analyticsSessionId.current, utms);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && chatPhotos.length === 0) || isLoading || isComplete) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
      photos: chatPhotos.length > 0 ? [...chatPhotos] : undefined,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setChatPhotos([]);
    setIsLoading(true);
    setApiError(null);

    // Primeira mensagem: dispara evento de analytics
    if (messages.length === 1 && !isDemo) {
      trackEvent('chat_started', analyticsSessionId.current);
    }

    try {
      // Build Gemini history (skip the hardcoded initial message — it's in system prompt)
      const geminiHistory: GeminiMessage[] = updatedMessages
        .slice(1) // skip hardcoded initial greeting
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text + (m.photos && m.photos.length > 0 ? ` [${m.photos.length} foto(s) enviada(s)]` : '') }],
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
          addressStreet: quoteData.addressStreet || '',
          addressNumber: quoteData.addressNumber || '',
          addressDistrict: quoteData.addressDistrict || '',
          addressCity: quoteData.addressCity || '',
          chatSummary: summary,
          clientPhotos: chatPhotos,
          source: 'web_chat',
        });
        setQuoteId(saved.id);

        // Generate credentials and register client account automatically
        const phoneDigits = (quoteData.whatsapp || '').replace(/\D/g, '');
        const loginEmail = quoteData.email?.trim()
          ? quoteData.email.trim()
          : `${phoneDigits}@cliente.ndl`;
        const loginPassword = phoneDigits.slice(-4) || '0000';

        let realClientId: string | null = null;
        try {
          const registeredClient = await registerClient({
            id: `user_${Date.now()}`,
            name: quoteData.name || '',
            email: loginEmail,
            phone: quoteData.whatsapp || '',
            password: loginPassword,
            addresses: [],
            address: '',
            type: 'AVULSO',
            createdAt: Date.now(),
          });
          realClientId = registeredClient.id;
        } catch {
          // Account may already exist — try login to get real ID
          const loggedIn = await loginClient(loginEmail, loginPassword);
          realClientId = loggedIn?.id || null;
        }

        // Save address using real DB client ID (save even with just CEP)
        if (realClientId && (quoteData.addressStreet || quoteData.addressDistrict || quoteData.cep)) {
          try {
            await addClientAddress(realClientId, {
              id: `addr_${Date.now()}`,
              alias: 'Principal',
              street: quoteData.addressStreet || quoteData.cep || '',
              number: quoteData.addressNumber || 's/n',
              district: quoteData.addressDistrict || '',
              city: quoteData.addressCity || '',
              state: quoteData.addressState || 'ES',
              cep: quoteData.addressCep || quoteData.cep || '',
              type: quoteData.propertyType?.toLowerCase().includes('apart') ? 'APARTMENT' : 'HOUSE',
              isMain: true,
            });
          } catch {
            // silent fail
          }
        }

        setSavedName((quoteData.name || '').split(' ')[0]);
        setCredentials({ login: loginEmail, password: loginPassword });
        setIsComplete(true);
        if (!isDemo) trackEvent('chat_completed', analyticsSessionId.current);

        // Envio automático de boas-vindas via WhatsApp
        if (quoteData.whatsapp) {
          try {
            let tpls: any = null;
            try { const st = localStorage.getItem('ndl_whatsapp_templates'); if (st) tpls = JSON.parse(st); } catch { /* use default */ }
            const welcomeTemplate = tpls?.welcome || `Olá, [Nome]! 👋 Aqui é a *Negócios de Limpeza*.\n\nRecebemos seu pedido de orçamento para *[Servico]* e já estamos analisando tudo! 🧹✨\n\nEm breve nossa equipe entra em contato com sua proposta personalizada.`;
            const msg = buildMessage(welcomeTemplate, {
              Nome: (quoteData.name || '').split(' ')[0],
              Servico: quoteData.serviceOption || 'limpeza',
            });
            await sendWhatsApp(quoteData.whatsapp, msg);
          } catch {
            // Falha silenciosa — não bloqueia o fluxo do cliente
          }
        }
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

  const handleCopy = (text: string, field: 'login' | 'password') => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#a163ff] to-[#6b21a8] flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-5 animate-in fade-in slide-in-from-bottom-4">

          {/* Ícone de sucesso */}
          <div className="text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {savedName ? `Obrigada, ${savedName}!` : 'Obrigada!'}
            </h1>
            <p className="text-white/80 mt-2 text-base leading-relaxed">
              Seu orçamento foi recebido com sucesso.
            </p>
          </div>

          {/* Card principal */}
          <div className="bg-white rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Phone size={22} className="text-green-600" />
            </div>
            <p className="font-bold text-gray-800 text-lg">Nossa equipe entra em contato!</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Em breve você receberá uma mensagem no WhatsApp com seu orçamento personalizado. Fique de olho! 😊
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-[#a163ff] hover:bg-[#8f4ee0] text-white font-bold rounded-xl transition-colors text-sm mt-2"
            >
              Voltar ao início
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col font-sans overflow-hidden">
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
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
              <img src="/img/logo-icon.png" alt="Logo" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:20px">🧹</span>'; }} />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">Nina — Negócios de Limpeza</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/70 text-xs">Disponível agora</span>
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
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-3 md:px-4 py-4 space-y-4 pb-4">
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
                <>
                  {msg.photos && msg.photos.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {msg.photos.map((photo, pi) => (
                        <img key={pi} src={photo} alt="" className="w-20 h-20 object-cover rounded-xl border border-white/30" />
                      ))}
                    </div>
                  )}
                  {msg.text && <span>{msg.text}</span>}
                </>
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
      <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg pb-safe">
        {/* Photo thumbnails preview */}
        {chatPhotos.length > 0 && (
          <div className="max-w-2xl mx-auto px-3 pt-2 flex gap-2 flex-wrap">
            {chatPhotos.map((photo, i) => (
              <div key={i} className="relative">
                <img src={photo} alt={`Foto ${i+1}`} className="w-14 h-14 object-cover rounded-xl border border-purple-200" />
                <button
                  onClick={() => setChatPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                ><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-end gap-2">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              if (!e.target.files) return;
              Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  setChatPhotos(prev => [...prev, dataUrl]);
                };
                reader.readAsDataURL(file);
              });
              e.target.value = '';
            }}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua resposta..."
            rows={1}
            className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-3 text-[16px] md:text-sm text-gray-800 focus:border-[#a163ff] focus:ring-2 focus:ring-[#a163ff]/20 outline-none transition-all bg-gray-50"
            style={{ minHeight: '48px', maxHeight: '120px', fontSize: '16px' }}
            disabled={isLoading || isComplete}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && chatPhotos.length === 0) || isLoading || isComplete}
            className="w-12 h-12 min-w-[48px] bg-[#a163ff] hover:bg-[#8f4ee0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow-md shadow-purple-200 active:scale-95"
          >
            {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={isComplete}
            className="w-12 h-12 min-w-[48px] border border-gray-200 bg-gray-50 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-30 text-gray-500 hover:text-purple-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            title="Enviar foto"
          >
            <Camera size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 pb-2 hidden md:block">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};
