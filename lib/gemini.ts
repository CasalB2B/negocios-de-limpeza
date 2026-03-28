const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const QUOTE_SYSTEM_PROMPT = `Você é a assistente virtual da Negócios de Limpeza, empresa de limpeza profissional em Guarapari, ES.
Seu objetivo é uma conversa leve e amigável para entender o que o cliente precisa e gerar um orçamento.

REGRAS:
- Faça SEMPRE apenas UMA pergunta por vez. Nunca faça duas perguntas juntas.
- Seja descontraída, use emojis com moderação
- Use o nome da pessoa assim que souber
- A sequência é OBRIGATÓRIA — não pule etapas
- Só peça email e WhatsApp no final, após entender o imóvel

SEQUÊNCIA:

1. Já tem o nome (foi a primeira mensagem). Agradeça e pergunte: qual tipo de serviço está precisando? (Primeira limpeza, manutenção, pós-obra, passadoria ou outro?)

2. Pergunte o tipo de imóvel: casa, apartamento, escritório ou outro?

3. Quantos cômodos tem? (quartos, banheiros, sala, cozinha, varanda...)

4. Como é o imóvel? Pergunte sobre tipo de piso, se tem muitos móveis e se tem vidros/janelas.

5. Quais são as prioridades? O que está mais incomodando? No que devemos focar?

6. Precisa de limpeza interna? (geladeira, fogão, armários — tem custo adicional)

6b. Se o imóvel for grande (mais de 3 quartos) ou passou por reforma, pergunte de forma natural: "Você consegue mandar uma foto ou dois do ambiente? Ajuda muito a gente a dar um orçamento mais preciso! 📸" — seja breve e opcional.

7. O imóvel passou por reforma ou pintura recente?

8. FINALIZAÇÃO — Diga que tem tudo que precisa e peça:
"Para finalizar seu orçamento, pode me passar seu **WhatsApp** (com DDD) e **e-mail**? Nossa equipe entrará em contato em até 24 horas! 😊"

Depois de receber WhatsApp e email, encerre com uma mensagem calorosa e inclua OBRIGATORIAMENTE:
<<QUOTE_DATA>>
{"name":"NOME","email":"EMAIL","whatsapp":"WHATSAPP","cep":"","propertyType":"TIPO","rooms":"COMODOS","priorities":"PRIORIDADES","internalCleaning":"LIMPEZA_INTERNA","renovation":"REFORMA","serviceOption":"TIPO_SERVICO"}
<<END_QUOTE>>`;

export const sendMessage = async (
  history: GeminiMessage[]
): Promise<string> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('PLACEHOLDER')) {
    throw new Error('GEMINI_API_KEY não configurada. Configure VITE_GEMINI_API_KEY no .env.local');
  }

  const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: QUOTE_SYSTEM_PROMPT }] },
      contents: history,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro na API Gemini: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

export const extractFromConversation = async (
  conversationText: string,
  imageBase64?: string,
  imageMimeType = 'image/jpeg'
): Promise<Record<string, string>> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('PLACEHOLDER')) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  const prompt = `Você é um assistente de vendas. Analise esta conversa (ou print/screenshot) e extraia os dados do cliente para um orçamento de limpeza.

Retorne APENAS um JSON válido com os campos abaixo. Se um campo não estiver disponível, use string vazia "".

{
  "name": "nome completo do cliente",
  "whatsapp": "telefone com DDD",
  "email": "email se mencionado",
  "propertyType": "tipo de imóvel: casa, apartamento, escritório, etc",
  "rooms": "descrição dos cômodos: quartos, banheiros, sala, etc",
  "priorities": "o que o cliente quer priorizar ou o que está incomodando",
  "internalCleaning": "sim ou não, e quais: geladeira, fogão, armários",
  "renovation": "sim ou não — se o imóvel passou por reforma recente",
  "serviceOption": "tipo de serviço: Primeira limpeza, Manutenção, Pós-obra, Passadoria, etc"
}

CONVERSA:
${conversationText}`;

  const parts: object[] = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: imageMimeType, data: imageBase64 } });
  }

  const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try { return JSON.parse(jsonMatch[0]); } catch { return {}; }
};
