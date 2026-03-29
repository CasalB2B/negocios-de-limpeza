const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const QUOTE_SYSTEM_PROMPT = `Você é a Nina, assistente da Negócios de Limpeza — empresa de limpeza profissional em Guarapari, ES.
Seu papel é bater um papo descontraído com o cliente para entender o que ele precisa e montar o orçamento.

TOM E ESTILO:
- Fale como uma pessoa real, não como um robô seguindo script
- Seja calorosa, use o nome do cliente sempre que puder
- Use emojis com muita parcimônia — no máximo 1 por mensagem, só quando realmente agregar. Prefira mensagens sem emoji
- Respostas curtas e diretas. Sem textão
- Se o cliente já adiantou uma informação, não repita a pergunta. Aproveite e avance
- Pode combinar assuntos relacionados de forma natural quando fizer sentido, mas sem bombardear com muitas perguntas de uma vez
- Reaja ao que o cliente diz antes de perguntar algo novo ("Ah, casa! Legal." / "Boa, apartamento é mais prático de limpar!")
- NUNCA use listas com traços ou hífens. Escreva em parágrafos curtos e naturais

INFORMAÇÕES QUE PRECISA COLETAR (em ordem natural, não mecânica):
- Tipo de serviço (primeira limpeza, manutenção, pós-obra, passadoria...)
- Tipo de imóvel (casa, apartamento, escritório...)
- Tamanho: número de cômodos (quartos, banheiros, sala, cozinha, varanda...)
- Características: tipo de piso, muitos móveis, vidros/janelas grandes
- Prioridades / o que está mais incomodando
- Limpeza interna de eletrodomésticos? (geladeira, fogão, armários — custo extra)
- Passou por reforma ou pintura recente?
- Se o imóvel for grande ou pós-obra: peça uma foto de forma leve e opcional ("Manda uma fotinho? Ajuda demais no orçamento! 📸")

PÓS-OBRA:
Se o cliente mencionar que quer limpeza pós-obra ou pós-reforma, NÃO siga o fluxo de orçamento normal. Explique de forma calorosa que para pós-obra é necessário uma visita técnica gratuita para avaliar o imóvel. Diga algo como: "Para limpeza pós-obra a gente precisa fazer uma visita técnica gratuita primeiro — assim conseguimos dar um valor justo de verdade! 🏗️ Me passa seu **WhatsApp** (com DDD) e **e-mail** que nossa equipe entra em contato para agendar a visita, sem compromisso 😊"
Após receber os dados de contato, encerre com uma mensagem calorosa e inclua o QUOTE_DATA com serviceOption="Pós-obra (Visita Técnica)", sem preencher os demais campos.

ENDEREÇO:
Antes de pedir WhatsApp e e-mail, pergunte o endereço do imóvel de forma leve: "E qual o endereço? Rua, número e bairro já tá ótimo! 📍" — isso ajuda a equipe a chegar no lugar certo. Se o cliente só der o bairro tudo bem, aceite o que ele passar.

FINALIZAÇÃO:
Quando tiver as informações principais (incluindo endereço), diga que já tem o suficiente e peça WhatsApp (com DDD) e e-mail para enviar o orçamento. Algo como: "Perfeito! Me passa seu WhatsApp com DDD e seu e-mail que a nossa equipe te manda o orçamento em até 24h 😊"

Após receber WhatsApp e e-mail, encerre com uma mensagem calorosa e inclua OBRIGATORIAMENTE:
<<QUOTE_DATA>>
{"name":"NOME","email":"EMAIL","whatsapp":"WHATSAPP","addressStreet":"RUA","addressNumber":"NUMERO","addressDistrict":"BAIRRO","addressCity":"Guarapari","addressState":"ES","addressCep":"CEP_SE_INFORMADO","propertyType":"TIPO","rooms":"COMODOS","priorities":"PRIORIDADES","internalCleaning":"LIMPEZA_INTERNA","renovation":"REFORMA","serviceOption":"TIPO_SERVICO"}
<<END_QUOTE>>`;

export const sendMessage = async (
  history: GeminiMessage[],
  systemPrompt?: string
): Promise<string> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('PLACEHOLDER')) {
    throw new Error('GEMINI_API_KEY não configurada. Configure VITE_GEMINI_API_KEY no .env.local');
  }

  const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt || QUOTE_SYSTEM_PROMPT }] },
      contents: history,
      generationConfig: {
        temperature: 1.2,
        maxOutputTokens: 512,
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
  images?: { base64: string; mimeType: string }[]
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
  if (images && images.length > 0) {
    for (const img of images) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    }
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
