import React, { useMemo, useState } from 'react';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { LOJA_ANDROID, LOJA_IPHONE, ENTRAR_NAVEGADOR } from '../lib/lojas';

// Ready-made message with the login and the download links. It opens the company's own WhatsApp
// (wa.me) or copies the text: nothing is sent automatically, so no WhatsApp credits are used.
export const EnviarAcesso: React.FC<{ nome: string; telefone?: string; email: string; senha?: string }> = ({ nome, telefone, email, senha }) => {
  const [copiado, setCopiado] = useState(false);
  const mensagem = useMemo(() => {
    const primeiro = (nome || '').trim().split(' ')[0];
    return [
      `Olá, ${primeiro}! 💜 Seu acesso ao app da Negócios de Limpeza está pronto.`,
      '',
      `📧 E-mail: ${email}`,
      `🔑 Senha: ${senha || '(a senha que combinamos)'}`,
      '',
      `📲 Android: ${LOJA_ANDROID}`,
      LOJA_IPHONE ? `🍎 iPhone: ${LOJA_IPHONE}` : `🍎 iPhone: entre pelo navegador em ${ENTRAR_NAVEGADOR}`,
      '',
      'No app você vê sua agenda, o endereço de cada serviço, faz o check-in e envia as fotos. Qualquer dúvida, me chama!',
    ].join('\n');
  }, [nome, email, senha]);

  const fone = (telefone || '').replace(/\D/g, '');
  const linkZap = fone ? `https://wa.me/${fone.startsWith('55') ? fone : '55' + fone}?text=${encodeURIComponent(mensagem)}` : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  const copiar = async () => {
    try { await navigator.clipboard.writeText(mensagem); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-100 dark:border-darkBorder p-3 space-y-2">
      <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary">Enviar o acesso para {nome.split(' ')[0]}</p>
      <pre className="text-[11px] whitespace-pre-wrap break-words bg-gray-50 dark:bg-darkBg rounded-lg p-2.5 text-lightText dark:text-darkTextSecondary font-sans max-h-40 overflow-y-auto">{mensagem}</pre>
      <div className="grid grid-cols-2 gap-2">
        <a href={linkZap} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5">
          <MessageCircle size={14} /> Enviar pelo WhatsApp
        </a>
        <button type="button" onClick={copiar} className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-darkBorder text-xs font-bold py-2.5 text-darkText dark:text-darkTextPrimary">
          {copiado ? <><Check size={14} className="text-green-600" /> Copiado</> : <><Copy size={14} /> Copiar mensagem</>}
        </button>
      </div>
    </div>
  );
};
