import { supabase } from './supabase';

// The quote chat goes through the orcamento-ia Edge Function: the Gemini key stays on the server.

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const sendMessage = async (history: GeminiMessage[]): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('orcamento-ia', { body: { contents: history } });
  if (error || !data || data.error) throw new Error(data?.error || error?.message || 'Erro na IA');
  return data.text || '';
};

export const extractQuoteData = (text: string): Record<string, string> | null => {
  const match = text.match(/<<QUOTE_DATA>>([\s\S]*?)<<END_QUOTE>>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
};

export const cleanAIResponse = (text: string): string => {
  return text.replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '').trim();
};
