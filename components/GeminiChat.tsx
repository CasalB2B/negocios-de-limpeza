import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'ndl_gemini_chat';

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(msgs: Message[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
}

export const GeminiChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    saveMessages(newMessages);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('gemini-chat', {
        body: { messages: newMessages },
      });

      if (fnError || !data) throw new Error(fnError?.message || 'Sem resposta');
      if (data.error) throw new Error(data.error);

      const reply: Message = { role: 'assistant', content: data.reply };
      const updated = [...newMessages, reply];
      setMessages(updated);
      saveMessages(updated);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('configurado') || msg.includes('503')) {
        setError('Configure a chave Gemini em Configurações → Integrações → Gemini AI');
      } else {
        setError('Erro ao contatar o assistente. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-300/50 flex items-center justify-center transition-all active:scale-95"
        title="Assistente NDL"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Chat drawer */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white shrink-0">
            <Sparkles size={16} />
            <div className="flex-1">
              <p className="font-semibold text-sm">Assistente NDL</p>
              <p className="text-purple-200 text-xs">Powered by Gemini</p>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-purple-300 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/20 transition-colors">
                Limpar
              </button>
            )}
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <Bot size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium text-gray-600">Olá! Sou o Assistente NDL.</p>
                <p className="text-xs mt-1">Pergunte sobre como usar a plataforma.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Pergunte algo..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-9 h-9 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
