import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, Loader, CheckCircle, Phone, Sparkles, Camera, X, Home, Calendar, FileText, User, Copy, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { UserRole } from '../../types';
import { sendMessage, GeminiMessage, extractQuoteData, cleanAIResponse } from '../../lib/gemini';

const INITIAL_AI_MESSAGE = `Olá! 👋 Bem-vindo à **Negócios de Limpeza**!

Sou a assistente virtual e vou te ajudar a gerar um **orçamento gratuito** rapidinho. 🏠✨

Para começar... qual é o seu **nome**? 😊`;

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
  const { addQuote, registerClient } = useData();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
  const [credentials, setCredentials] = useState<{ login: string; password: string; phone: string } | null>(
    isDemo ? { login: '27999998888@cliente.ndl', password: '888', phone: '(27) 99999-8888' } : null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'login' | 'password' | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && chatPhotos.length === 0) || isLoading || isComplete) return;

    const photoNote = chatPhotos.length > 0 ? `\n[${chatPhotos.length} foto(s) enviada(s)]` : '';
    const userMessage: ChatMessage = { role: 'user', text: trimmed + photoNote, timestamp: new Date() };
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
          clientPhotos: chatPhotos,
        });
        setQuoteId(saved.id);

        // Generate credentials and register client account automatically
        const phoneDigits = (quoteData.whatsapp || '').replace(/\D/g, '');
        const loginEmail = quoteData.email?.trim()
          ? quoteData.email.trim()
          : `${phoneDigits}@cliente.ndl`;
        const loginPassword = phoneDigits.slice(-3) || '000';

        try {
          await registerClient({
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
        } catch {
          // Account may already exist — still show success
        }

        setSavedName((quoteData.name || '').split(' ')[0]);
        setCredentials({ login: loginEmail, password: loginPassword, phone: quoteData.whatsapp || '' });
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

  const handleCopy = (text: string, field: 'login' | 'password') => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#a163ff] to-[#6b21a8] overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-10 space-y-4 animate-in fade-in slide-in-from-bottom-4">

          {/* Welcome header */}
          <div className="text-center pb-2">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Bem-vindo(a){savedName ? `, ${savedName}` : ''}!</h1>
            <p className="text-white/80 mt-1 text-sm">Seu orçamento foi enviado com sucesso ✨</p>
          </div>

          {/* Orçamento card */}
          <div className="bg-white rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#a163ff] rounded-full flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Orçamento em andamento</p>
                <p className="text-xs text-gray-500">Nossa equipe entra em contato em até 24h pelo WhatsApp</p>
              </div>
            </div>
            <button
              onClick={() => window.open('https://wa.me/5527999808013', '_blank')}
              className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Falar no WhatsApp agora
            </button>
          </div>

          {/* Credentials card */}
          {credentials && (
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-[#a163ff]" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Sua conta foi criada!</p>
                  <p className="text-xs text-gray-500">Guarde seu login e senha para acessar o app</p>
                </div>
              </div>

              <div className="space-y-2">
                {/* Login = phone number */}
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Login — seu número de celular</p>
                    <p className="font-bold text-gray-800 text-sm">{credentials.phone || credentials.login}</p>
                  </div>
                  <button onClick={() => handleCopy(credentials.phone || credentials.login, 'login')}
                    className="ml-2 p-2 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0">
                    {copied === 'login' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                  </button>
                </div>

                {/* Password = last 3 digits */}
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Senha — últimos 3 dígitos do celular</p>
                    <p className="font-bold text-gray-800 text-sm tracking-widest">{showPassword ? credentials.password : '•••'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => setShowPassword(p => !p)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                      {showPassword ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                    </button>
                    <button onClick={() => handleCopy(credentials.password, 'password')}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                      {copied === 'password' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mini tutorial */}
          <div className="bg-white rounded-2xl p-5">
            <p className="font-bold text-gray-800 mb-3 text-sm">O que você encontra no app:</p>
            <div className="space-y-3">
              {[
                { icon: <Home size={18} className="text-[#a163ff]" />, title: 'Início', desc: 'Veja sua próxima limpeza agendada e avisos importantes' },
                { icon: <Calendar size={18} className="text-[#a163ff]" />, title: 'Agendamentos', desc: 'Histórico completo dos seus serviços com data e horário' },
                { icon: <FileText size={18} className="text-[#a163ff]" />, title: 'Pagamentos', desc: 'Acompanhe faturas e formas de pagamento disponíveis' },
                { icon: <User size={18} className="text-[#a163ff]" />, title: 'Perfil', desc: 'Atualize seus dados, foto e endereços. Clique na foto para trocar!' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/client/dashboard')}
            className="w-full py-4 bg-white text-[#a163ff] font-bold rounded-2xl text-lg shadow-xl hover:bg-purple-50 transition-colors"
          >
            Entrar na minha área →
          </button>

          <p className="text-center text-white/60 text-xs pb-4">
            Você pode acessar novamente em app.negociosdelimpeza.com.br
          </p>
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
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={isComplete}
            className="w-12 h-12 min-w-[48px] border border-gray-200 bg-gray-50 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-30 text-gray-500 hover:text-purple-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            title="Enviar foto"
          >
            <Camera size={18} />
          </button>
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
        </div>
        <p className="text-center text-xs text-gray-400 pb-2 hidden md:block">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};
