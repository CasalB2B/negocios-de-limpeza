import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { useData, Quote, ClientUser } from '../../components/DataContext';
import {
  MessageSquare, Phone, Mail, ChevronDown, ChevronUp,
  CheckCircle, Clock, TrendingUp, X, Plus, FileText, UserPlus,
  Wand2, Loader2,
} from 'lucide-react';
import { extractFromConversation } from '../../lib/gemini';

// --- STATUS ---
const STATUS_LABELS: Record<Quote['status'], { label: string; color: string; bg: string }> = {
  NEW: { label: 'Novo', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  CONTACTED: { label: 'Contatado', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  CONVERTED: { label: 'Convertido', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  LOST: { label: 'Perdido', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

// --- PDF GENERATION ---
function generateProposalWindow(
  quote: Quote,
  price: string,
  professionals: string,
  hours: string,
  neighborhood: string,
  serviceType: string,
) {
  const win = window.open('', '_blank');
  if (!win) { alert('Permita popups para abrir a proposta.'); return; }
  const e = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>Proposta — ${e(quote.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;background:#fff}
@page{size:A4;margin:0}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}.pb{page-break-before:always}}
.page{width:210mm;min-height:297mm;position:relative;padding-bottom:56px;overflow:hidden}
.hdr{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);padding:36px 48px 28px;color:#fff}
.badge{display:inline-block;background:rgba(255,255,255,.25);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:14px}
.hdr h1{font-size:42px;font-weight:900;margin-bottom:6px}
.hdr .sub{font-size:13px;opacity:.85;margin-bottom:28px}
.cbar{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.3);padding-top:20px;gap:12px}
.cf label{font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:.7;display:block;margin-bottom:3px}
.cf span{font-size:15px;font-weight:800}
.sec{padding:22px 48px}
.stitle{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a163ff;margin-bottom:12px}
.abox{border-left:4px solid #a163ff;padding:14px 18px;background:#f9f5ff;border-radius:0 8px 8px 0;font-size:13px;line-height:1.6;color:#4a4a6a}
.abox strong{color:#1a1a2e}
.sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.sc{border:1px solid #e8e0f5;border-radius:10px;padding:14px}
.sct{display:flex;align-items:center;gap:7px;font-weight:700;font-size:12px;margin-bottom:7px}
.dot{width:7px;height:7px;border-radius:50%;background:#a163ff;flex-shrink:0}
.sc p{font-size:10px;line-height:1.5;color:#6b6b8a}
.inv{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);margin:0 48px;border-radius:14px;padding:28px;color:#fff}
.ilbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.8;margin-bottom:3px}
.idesc{font-size:16px;font-weight:600;margin-bottom:14px;opacity:.9}
.price{font-size:48px;font-weight:900;margin-bottom:20px}
.pmethods{display:flex;gap:8px;flex-wrap:wrap}
.pchip{background:rgba(255,255,255,.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600}
.ftr{background:#1a1a2e;color:#fff;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;font-size:10px;position:absolute;bottom:0;left:0;right:0}
.hdr2{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);padding:36px 48px;color:#fff}
.hdr2 h1{font-size:32px;font-weight:900;margin-bottom:6px}
.dgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.dc{border:1px solid #e8e0f5;border-radius:14px;padding:22px;text-align:center}
.dnum{width:38px;height:38px;background:linear-gradient(135deg,#a163ff,#ff3ca0);border-radius:50%;color:#fff;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
.dc strong{font-size:13px;display:block;margin-bottom:6px}
.dc p{font-size:11px;color:#6b6b8a;line-height:1.5}
.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cbox{border:1px solid #e8e0f5;border-radius:12px;padding:18px}
.cbox h4{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a163ff;margin-bottom:10px}
.crow{display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:12px}
.cico{width:30px;height:30px;background:#f9f5ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.csub{font-size:10px;color:#888;display:block}
.cta{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);margin:0 48px 28px;border-radius:14px;padding:26px;text-align:center;color:#fff}
.cta h3{font-size:20px;font-weight:800;margin-bottom:6px}
.cta p{opacity:.9;font-size:13px}
.pbtn{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#a163ff,#ff3ca0);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(161,99,255,.4);z-index:100}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="badge">Proposta Comercial</div>
    <h1>${e(serviceType || 'Faxina Residencial')}</h1>
    <div class="sub">Neg&oacute;cios de Limpeza &middot; Cuidado, capricho e dedica&ccedil;&atilde;o em cada detalhe</div>
    <div class="cbar">
      <div class="cf"><label>Cliente</label><span>${e(quote.name)}</span></div>
      <div class="cf"><label>Bairro</label><span>${e(neighborhood || 'Guarapari')}</span></div>
      <div class="cf"><label>Contato</label><span>${e(quote.whatsapp)}</span></div>
      <div class="cf"><label>Validade</label><span>7 dias</span></div>
    </div>
  </div>
  <div class="sec">
    <div class="stitle">Sobre o Servi&ccedil;o</div>
    <div class="abox">Cada lar tem suas necessidades &uacute;nicas, e nosso foco &eacute; atender as suas prioridades!
    Durante o atendimento, ouvimos suas demandas e garantimos que elas sejam realizadas com
    <strong>cuidado, capricho e dedica&ccedil;&atilde;o.</strong>${quote.priorities ? `<br><br><strong>Prioridades:</strong> ${e(quote.priorities)}` : ''}</div>
  </div>
  <div class="sec" style="padding-top:0">
    <div class="stitle">O que est&aacute; incluso</div>
    <div class="sgrid">
      <div class="sc"><div class="sct"><div class="dot"></div>Cozinha</div><p>Limpeza interna de arm&aacute;rios, fog&atilde;o e de geladeira, limpeza dos pisos e revestimento de paredes, limpeza de portas.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Banheiros</div><p>Limpeza da pia, dos pisos e revestimento de paredes, dos vasos sanit&aacute;rios e banheira, do boxe, espelho e vidros, portas, basculantes.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Sala</div><p>Limpeza dos pisos, poltronas e tapetes, limpeza da superf&iacute;cie externa dos m&oacute;veis, limpeza de portas, janelas e vidros.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Quartos</div><p>Limpeza externa dos m&oacute;veis, limpeza do ch&atilde;o, das janelas, de espelhos, portas, vidros e arruma&ccedil;&atilde;o da cama.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>&Aacute;rea de Servi&ccedil;o</div><p>Superf&iacute;cie e parte externa dos m&oacute;veis, lavagem e esfrega&ccedil;&atilde;o do ch&atilde;o e limpeza de vidros.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Varanda / Gourmet</div><p>Limpeza dos vidros, trilhos e canaletas, limpeza externa de arm&aacute;rios, e limpeza do ch&atilde;o.</p></div>
    </div>
  </div>
  <div style="padding:0 48px 28px">
    <div class="inv">
      <div class="ilbl">Investimento</div>
      <div class="idesc">${e(professionals)} profissionais &middot; ${e(hours)} horas de servi&ccedil;o</div>
      <div class="price">R$ ${e(price)}</div>
      <div class="pmethods"><span class="pchip">Pix</span><span class="pchip">Cart&atilde;o (consultar taxa)</span><span class="pchip">Transfer&ecirc;ncia</span></div>
    </div>
  </div>
  <div class="ftr"><span>Neg&oacute;cios de Limpeza</span><span>Proposta Comercial &middot; P&aacute;gina 1 de 2</span><span>Validade: 7 dias</span></div>
</div>
<div class="pb"></div>
<div class="page">
  <div class="hdr2">
    <div class="badge">Por que nos escolher</div>
    <h1>Sua casa limpa, do jeito que voc&ecirc; merece!</h1>
    <div class="sub">Cuidado, capricho e dedica&ccedil;&atilde;o em cada detalhe</div>
  </div>
  <div class="sec">
    <div class="stitle">Nossos Diferenciais</div>
    <div class="dgrid">
      <div class="dc"><div class="dnum">1</div><strong>Atendimento Personalizado</strong><p>Ouvimos suas prioridades e adaptamos o servi&ccedil;o &agrave;s suas necessidades.</p></div>
      <div class="dc"><div class="dnum">2</div><strong>Profissionais Treinados</strong><p>Equipe capacitada, uniformizada e comprometida com a excel&ecirc;ncia.</p></div>
      <div class="dc"><div class="dnum">3</div><strong>Resultado Garantido</strong><p>Capricho em cada canto, do ch&atilde;o ao teto, com aten&ccedil;&atilde;o aos detalhes.</p></div>
    </div>
  </div>
  <div class="sec" style="padding-top:0">
    <div class="stitle">Fale Conosco</div>
    <div class="cgrid">
      <div class="cbox"><h4>Mais Informa&ccedil;&otilde;es</h4>
        <div class="crow"><div class="cico">📞</div><div><strong>WhatsApp</strong><span class="csub">27 99980 8013</span></div></div>
        <div class="crow"><div class="cico">📷</div><div><strong>Instagram</strong><span class="csub">@negociosdelimpeza</span></div></div>
        <div class="crow"><div class="cico">🌐</div><div><strong>Site</strong><span class="csub">negociosdelimpeza.com.br</span></div></div>
      </div>
      <div class="cbox"><h4>Formas de Pagamento</h4>
        <div class="crow"><div class="cico">💳</div><div><strong>Cart&atilde;o de Cr&eacute;dito</strong><span class="csub">Consultar taxa</span></div></div>
        <div class="crow"><div class="cico">💸</div><div><strong>Pix</strong><span class="csub">Pagamento &agrave; vista</span></div></div>
        <div class="crow"><div class="cico">🏦</div><div><strong>Transfer&ecirc;ncia Banc&aacute;ria</strong><span class="csub">TED / DOC dispon&iacute;vel</span></div></div>
      </div>
    </div>
  </div>
  <div class="cta"><h3>Transforme seu lar com a Neg&oacute;cios de Limpeza!</h3><p>Entre em contato e agende sua faxina com quem cuida de verdade.</p></div>
  <div class="ftr"><span>Neg&oacute;cios de Limpeza</span><span>Proposta Comercial &middot; P&aacute;gina 2 de 2</span><span>Validade: 7 dias</span></div>
</div>
<button class="pbtn no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
</body></html>`);
  win.document.close();
}

// --- WhatsApp MANUAL ENTRY MODAL ---
interface WhatsAppModalProps {
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ onClose, onSave }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await extractFromConversation(text);
      setExtracted(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Entrada Manual via WhatsApp</h3>
            <p className="text-xs text-gray-500 mt-0.5">Cole o texto da conversa — a IA vai extrair os dados automaticamente</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {!extracted ? (
            <>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Cole aqui a conversa do WhatsApp com o cliente..."
                className="w-full h-52 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button
                onClick={handleExtract}
                disabled={loading || !text.trim()}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {loading ? 'Processando com IA...' : 'Extrair dados com IA'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                Dados extraídos! Revise e corrija se necessário antes de salvar.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'name', label: 'Nome' },
                  { key: 'whatsapp', label: 'WhatsApp' },
                  { key: 'email', label: 'E-mail' },
                  { key: 'propertyType', label: 'Tipo de Imóvel' },
                  { key: 'serviceOption', label: 'Tipo de Serviço' },
                  { key: 'cep', label: 'CEP / Bairro' },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
                    <input
                      value={extracted[key] || ''}
                      onChange={e => setExtracted(prev => ({ ...prev!, [key]: e.target.value }))}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                ))}
              </div>
              {([
                { key: 'rooms', label: 'Cômodos' },
                { key: 'priorities', label: 'Prioridades' },
                { key: 'internalCleaning', label: 'Limpeza Interna' },
                { key: 'renovation', label: 'Reforma / Pós-obra' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label>
                  <textarea
                    value={extracted[key] || ''}
                    onChange={e => setExtracted(prev => ({ ...prev!, [key]: e.target.value }))}
                    rows={2}
                    className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setExtracted(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                  Voltar
                </button>
                <button
                  onClick={() => { onSave(extracted); onClose(); }}
                  disabled={!extracted.name && !extracted.whatsapp}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40"
                >
                  Salvar Lead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PDF MODAL ---
interface PDFModalProps {
  quote: Quote;
  onClose: () => void;
}

const PDFModal: React.FC<PDFModalProps> = ({ quote, onClose }) => {
  const [price, setPrice] = useState('');
  const [professionals, setProfessionals] = useState('2');
  const [hours, setHours] = useState('8');
  const [neighborhood, setNeighborhood] = useState('');
  const [serviceType, setServiceType] = useState(quote.serviceOption || 'Faxina Residencial');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Gerar Proposta — {quote.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Preencha os detalhes do orçamento</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tipo de Serviço</label>
              <input value={serviceType} onChange={e => setServiceType(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Bairro</label>
              <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Guarapari"
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Valor (R$) *</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="ex: 500,00"
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Profissionais</label>
              <select value={professionals} onChange={e => setProfessionals(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="1">1 profissional</option>
                <option value="2">2 profissionais</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Horas</label>
              <select value={hours} onChange={e => setHours(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="4">4 horas</option>
                <option value="6">6 horas</option>
                <option value="8">8 horas</option>
              </select>
            </div>
          </div>

          {quote.rooms && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
              <span className="font-bold text-gray-500 uppercase text-[9px]">Cômodos do cliente: </span>
              {quote.rooms}
            </div>
          )}

          <button
            onClick={() => generateProposalWindow(quote, price || '—', professionals, hours, neighborhood, serviceType)}
            disabled={!price.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <FileText size={16} /> Abrir Proposta (PDF)
          </button>
          <p className="text-[10px] text-gray-400 text-center">Uma nova aba abrirá com a proposta. Use Ctrl+P para salvar como PDF.</p>
        </div>
      </div>
    </div>
  );
};

// --- CREATE ACCOUNT MODAL ---
interface CreateAccountModalProps {
  quote: Quote;
  onClose: () => void;
  onConfirm: (client: ClientUser) => void;
  alreadyExists: boolean;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({ quote, onClose, onConfirm, alreadyExists }) => {
  const phone = quote.whatsapp.replace(/\D/g, '');
  const loginEmail = quote.email || `${phone}@cliente.ndl`;
  const password = phone;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${alreadyExists ? 'bg-yellow-100' : 'bg-purple-100'}`}>
          <UserPlus size={22} className={alreadyExists ? 'text-yellow-600' : 'text-purple-600'} />
        </div>

        {alreadyExists ? (
          <>
            <h3 className="font-bold text-gray-900 mb-2">Conta já existe</h3>
            <p className="text-sm text-gray-500 mb-4">Já existe uma conta com este e-mail ou telefone cadastrado.</p>
            <button onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50">Fechar</button>
          </>
        ) : (
          <>
            <h3 className="font-bold text-gray-900 mb-1">Criar conta para {quote.name}?</h3>
            <p className="text-xs text-gray-500 mb-4">O cliente poderá acessar a plataforma com estas credenciais:</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
              <div>
                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Login (e-mail)</span>
                <p className="text-sm font-bold text-gray-800">{loginEmail}</p>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Senha</span>
                <p className="text-sm font-bold text-gray-800">{password}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => onConfirm({
                  id: Date.now().toString(),
                  name: quote.name,
                  email: loginEmail,
                  phone: quote.whatsapp,
                  address: '',
                  addresses: [],
                  type: 'AVULSO',
                  password,
                  createdAt: Date.now(),
                })}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700"
              >
                Criar Conta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- QUOTE CARD ---
interface QuoteCardProps {
  quote: Quote;
  onStatusChange: (id: string, s: Quote['status']) => void;
  onCreateAccount: (quote: Quote) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onStatusChange, onCreateAccount }) => {
  const [expanded, setExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const status = STATUS_LABELS[quote.status];
  const date = new Date(quote.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
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

          {/* Contatos */}
          <div className="flex flex-wrap gap-2 mb-4">
            {quote.whatsapp && (
              <a
                href={`https://wa.me/55${quote.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${quote.name}! Recebemos seu orçamento. Podemos conversar?`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Phone size={12} /> {quote.whatsapp}
              </a>
            )}
            {quote.email && (
              <a href={`mailto:${quote.email}`}
                className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Mail size={12} /> {quote.email}
              </a>
            )}
          </div>

          {/* Resumo do imóvel — sempre visível */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quote.propertyType && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Tipo de Imóvel</p>
                <p className="text-xs font-bold text-gray-800">{quote.propertyType}</p>
              </div>
            )}
            {quote.serviceOption && (
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Serviço</p>
                <p className="text-xs font-bold text-purple-800">{quote.serviceOption}</p>
              </div>
            )}
            {quote.rooms && (
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Cômodos</p>
                <p className="text-xs text-gray-700">{quote.rooms}</p>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPDF(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <FileText size={12} /> Gerar Proposta PDF
            </button>
            <button
              onClick={() => onCreateAccount(quote)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <UserPlus size={12} /> Criar Conta
            </button>
          </div>
        </div>

        {/* Expandir detalhes adicionais */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Ver detalhes completos
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="px-5 pb-4 pt-3 space-y-3 border-t border-gray-100">
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
              <button onClick={() => setShowChat(true)} className="text-xs font-bold text-[#a163ff] hover:underline">
                Ver histórico completo do chat →
              </button>
            )}
          </div>
        )}

        {/* Status */}
        <div className="px-5 pb-4 flex flex-wrap gap-2">
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

        {/* Chat modal */}
        {showChat && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowChat(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="font-bold">Histórico — {quote.name}</h3>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </div>
              <div className="overflow-y-auto p-5">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{quote.chatSummary}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPDF && <PDFModal quote={quote} onClose={() => setShowPDF(false)} />}
    </>
  );
};

// --- MAIN PAGE ---
export const AdminQuotes: React.FC = () => {
  const { quotes, addQuote, updateQuoteStatus, clients, registerClient } = useData();
  const [filter, setFilter] = useState<Quote['status'] | 'ALL'>('ALL');
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [createAccountTarget, setCreateAccountTarget] = useState<Quote | null>(null);

  const filtered = filter === 'ALL' ? quotes : quotes.filter(q => q.status === filter);
  const counts = {
    ALL: quotes.length,
    NEW: quotes.filter(q => q.status === 'NEW').length,
    CONTACTED: quotes.filter(q => q.status === 'CONTACTED').length,
    CONVERTED: quotes.filter(q => q.status === 'CONVERTED').length,
    LOST: quotes.filter(q => q.status === 'LOST').length,
  };

  const handleSaveManual = (data: Record<string, string>) => {
    addQuote({
      name: data.name || '',
      email: data.email || '',
      whatsapp: data.whatsapp || '',
      cep: data.cep || '',
      propertyType: data.propertyType || '',
      rooms: data.rooms || '',
      priorities: data.priorities || '',
      internalCleaning: data.internalCleaning || '',
      renovation: data.renovation || '',
      serviceOption: data.serviceOption || '',
    });
  };

  const accountExists = (quote: Quote) => {
    const phone = quote.whatsapp.replace(/\D/g, '');
    return clients.some(c => c.email === quote.email || c.phone.replace(/\D/g, '') === phone);
  };

  const handleCreateAccount = async (client: ClientUser) => {
    await registerClient(client);
    setCreateAccountTarget(null);
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Orçamentos</h1>
            <p className="text-sm text-gray-500 mt-1">Leads do chat + entradas manuais via WhatsApp</p>
          </div>
          <button
            onClick={() => setShowWhatsApp(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
          >
            <Plus size={16} /> Entrada Manual (WhatsApp)
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1"><MessageSquare size={16} className="text-blue-500" /><span className="text-xs font-bold text-blue-600">Novos</span></div>
            <p className="text-2xl font-bold text-blue-700">{counts.NEW}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1"><Clock size={16} className="text-yellow-500" /><span className="text-xs font-bold text-yellow-600">Contatados</span></div>
            <p className="text-2xl font-bold text-yellow-700">{counts.CONTACTED}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1"><CheckCircle size={16} className="text-green-500" /><span className="text-xs font-bold text-green-600">Convertidos</span></div>
            <p className="text-2xl font-bold text-green-700">{counts.CONVERTED}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-purple-500" /><span className="text-xs font-bold text-purple-600">Taxa de conversão</span></div>
            <p className="text-2xl font-bold text-purple-700">
              {counts.ALL > 0 ? Math.round((counts.CONVERTED / counts.ALL) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
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
              {filter === 'ALL' ? 'Use o botão "Entrada Manual" ou aguarde leads do chat' : 'Tente outro filtro'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(q => (
              <QuoteCard
                key={q.id}
                quote={q}
                onStatusChange={updateQuoteStatus}
                onCreateAccount={q => setCreateAccountTarget(q)}
              />
            ))}
          </div>
        )}
      </div>

      {showWhatsApp && (
        <WhatsAppModal onClose={() => setShowWhatsApp(false)} onSave={handleSaveManual} />
      )}
      {createAccountTarget && (
        <CreateAccountModal
          quote={createAccountTarget}
          onClose={() => setCreateAccountTarget(null)}
          onConfirm={handleCreateAccount}
          alreadyExists={accountExists(createAccountTarget)}
        />
      )}
    </Layout>
  );
};
