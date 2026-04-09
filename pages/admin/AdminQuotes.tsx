import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { useData, Quote, ClientUser } from '../../components/DataContext';
import {
  MessageSquare, Phone, Mail, ChevronDown,
  CheckCircle, Clock, TrendingUp, X, FileText, UserPlus,
  Loader2, Send, Trash2,
} from 'lucide-react';
import { sendMessage as sendWhatsApp, sendDocument, buildMessage, DEFAULT_TEMPLATES } from '../../lib/evolution';
import jsPDF from 'jspdf';

// --- STATUS ---
const STATUS_LABELS: Record<Quote['status'], { label: string; color: string; bg: string }> = {
  NEW:         { label: 'Novo',             color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  CONTACTED:   { label: 'Contatado',        color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  PROPOSAL:    { label: 'Proposta Enviada', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  NEGOTIATING: { label: 'Negociando',       color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  CONVERTED:   { label: 'Convertido',       color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  LOST:        { label: 'Perdido',          color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
};

// --- PDF GENERATION ---
function generateProposalWindow(
  quote: Quote,
  price: string,
  professionals: string,
  hours: string,
  neighborhood: string,
  serviceType: string,
  validityDays = '7',
  paymentMethod = 'Pix, Cartão de Crédito',
  includedServices = '',
  observations = '',
  dateScheduled = '',
) {
  const origin = window.location.origin;
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
.page{width:210mm;height:297mm;display:flex;flex-direction:column;overflow:hidden}
.img-fill{flex:1;min-height:100px;overflow:hidden}
.hdr{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);padding:28px 48px 22px;color:#fff}
.badge{display:inline-block;background:rgba(255,255,255,.25);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:14px}
.hdr h1{font-size:42px;font-weight:900;margin-bottom:6px}
.hdr .sub{font-size:13px;opacity:.85;margin-bottom:28px}
.cbar{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.3);padding-top:20px;gap:12px}
.cf label{font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:.7;display:block;margin-bottom:3px}
.cf span{font-size:15px;font-weight:800}
.sec{padding:16px 48px}
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
.ftr{background:#1a1a2e;color:#fff;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;font-size:10px;flex-shrink:0}
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
  <div style="padding:0 48px 20px">
    <div class="inv">
      <div class="ilbl">Investimento</div>
      <div class="idesc">${e(professionals)} profissionais &middot; ${e(hours)} horas de servi&ccedil;o</div>
      <div class="price">R$ ${e(price)}</div>
      <div class="pmethods"><span class="pchip">Pix</span><span class="pchip">Cart&atilde;o (consultar taxa)</span><span class="pchip">Transfer&ecirc;ncia</span></div>
    </div>
  </div>
  <div class="img-fill">
    <img src="${origin}/img/foto-pdf-p1.jpg"
      style="width:100%;height:100%;object-fit:cover;object-position:center 8%" alt="Negócios de Limpeza" />
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
  <div class="img-fill">
    <img src="${origin}/img/foto-pdf-p2.jpg"
      style="width:100%;height:100%;object-fit:cover;object-position:center 25%" alt="Negócios de Limpeza" />
  </div>
  <div class="ftr"><span>Neg&oacute;cios de Limpeza</span><span>Proposta Comercial &middot; P&aacute;gina 2 de 2</span><span>Validade: 7 dias</span></div>
</div>
<button class="pbtn no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
</body></html>`);
  win.document.close();
}

// --- AUTO-PRICE CALCULATION ---
function calcAutoPrice(quote: Quote): { price: string; professionals: string; hours: string; breakdown: string[] } {
  const rooms = (quote.rooms || '').toLowerCase();
  const internal = (quote.internalCleaning || '').toLowerCase();
  const serviceOpt = (quote.serviceOption || '').toLowerCase();

  // Count quartos and banheiros
  const quartosMatch = rooms.match(/(\d+)\s*quarto/);
  const banheirosMatch = rooms.match(/(\d+)\s*banheiro/);
  const quartos = quartosMatch ? parseInt(quartosMatch[1]) : 0;
  const banheiros = banheirosMatch ? parseInt(banheirosMatch[1]) : 0;

  const hasInternalCleaning = internal && internal !== 'não' && internal !== 'nao' && internal.length > 2;
  const needsTwo = quartos >= 3 || banheiros >= 3 || hasInternalCleaning;

  let base = needsTwo ? 520 : 320;
  const profs = needsTwo ? '2' : '1';
  const breakdown: string[] = [];

  breakdown.push(`Base (${profs} profissional${profs === '2' ? 'is' : ''}, 8h): R$ ${base},00`);

  // Extras from internalCleaning
  if (hasInternalCleaning) {
    if (internal.includes('geladeira')) { base += 50; breakdown.push('Limpeza de Geladeira: +R$ 50,00'); }
    if (internal.includes('forno') || internal.includes('fogão')) { base += 40; breakdown.push('Limpeza de Forno/Fogão: +R$ 40,00'); }
    if (internal.includes('armário') || internal.includes('armario')) { base += 60; breakdown.push('Limpeza de Armários: +R$ 60,00'); }
  }

  // Post-obra or primeira limpeza context adjustments
  if (serviceOpt.includes('pós-obra') || serviceOpt.includes('pos-obra')) {
    base += 100;
    breakdown.push('Adicional Pós-obra: +R$ 100,00');
  }

  return { price: base.toString().replace('.', ','), professionals: profs, hours: '8', breakdown };
}

// --- PDF GENERATION (html2canvas → jsPDF, matches HTML preview exactly) ---
async function generatePDFBase64(
  quote: Quote,
  price: string,
  professionals: string,
  hours: string,
  neighborhood: string,
  serviceType: string,
  validityDays = '7',
  paymentMethod = 'Pix, Cartão de Crédito',
  includedServices = '',
  observations = '',
  dateScheduled = '',
): Promise<string> {
  const { default: html2canvas } = await import('html2canvas');
  const origin = window.location.origin;
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Pre-fetch images as base64 to avoid CORS issues in html2canvas
  async function imgToDataUrl(src: string): Promise<string> {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(src);
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }
  const [img1, img2] = await Promise.all([
    imgToDataUrl(`${origin}/img/foto-pdf-p1.jpg`),
    imgToDataUrl(`${origin}/img/foto-pdf-p2.jpg`),
  ]);

  const wrapper = document.createElement('div');
  wrapper.className = 'ndl-pdf-root';
  wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;overflow:visible;font-family:Arial,Helvetica,sans-serif';
  wrapper.innerHTML = `<style>
.ndl-pdf-root,.ndl-pdf-root *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
.ndl-pdf-root .page{width:794px;height:1123px;display:flex;flex-direction:column;overflow:hidden;background:#fff;color:#1a1a2e}
.ndl-pdf-root .img-fill{flex:1;min-height:100px;overflow:hidden;background-size:cover;background-repeat:no-repeat}
.ndl-pdf-root .hdr{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);padding:28px 48px 22px;color:#fff}
.ndl-pdf-root .badge{display:inline-block;background:rgba(255,255,255,.25);font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:4px 12px;border-radius:20px;margin-bottom:14px;color:#fff}
.ndl-pdf-root .hdr h1{font-size:42px;font-weight:900;margin-bottom:6px;color:#fff}
.ndl-pdf-root .hdr .sub{font-size:13px;opacity:.85;margin-bottom:28px;color:#fff}
.ndl-pdf-root .cbar{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.3);padding-top:20px;gap:12px}
.ndl-pdf-root .cf label{font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:.7;display:block;margin-bottom:3px;color:#fff}
.ndl-pdf-root .cf span{font-size:15px;font-weight:800;color:#fff}
.ndl-pdf-root .sec{padding:16px 48px}
.ndl-pdf-root .stitle{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a163ff;margin-bottom:12px}
.ndl-pdf-root .abox{border-left:4px solid #a163ff;padding:14px 18px;background:#f9f5ff;border-radius:0 8px 8px 0;font-size:13px;line-height:1.6;color:#4a4a6a}
.ndl-pdf-root .sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ndl-pdf-root .sc{border:1px solid #e8e0f5;border-radius:10px;padding:14px}
.ndl-pdf-root .sct{display:flex;align-items:center;gap:7px;font-weight:700;font-size:12px;margin-bottom:7px}
.ndl-pdf-root .dot{width:7px;height:7px;border-radius:50%;background:#a163ff;flex-shrink:0;display:inline-block}
.ndl-pdf-root .sc p{font-size:10px;line-height:1.5;color:#6b6b8a}
.ndl-pdf-root .inv{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);margin:0 48px;border-radius:14px;padding:28px;color:#fff}
.ndl-pdf-root .ilbl{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.8;margin-bottom:3px;color:#fff}
.ndl-pdf-root .idesc{font-size:16px;font-weight:600;margin-bottom:14px;opacity:.9;color:#fff}
.ndl-pdf-root .price{font-size:48px;font-weight:900;margin-bottom:20px;color:#fff}
.ndl-pdf-root .pmethods{display:flex;gap:8px;flex-wrap:wrap}
.ndl-pdf-root .pchip{background:rgba(255,255,255,.2);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;color:#fff}
.ndl-pdf-root .ftr{background:#1a1a2e;color:#fff;padding:14px 48px;display:flex;justify-content:space-between;align-items:center;font-size:10px;flex-shrink:0}
.ndl-pdf-root .hdr2{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);padding:36px 48px;color:#fff}
.ndl-pdf-root .hdr2 h1{font-size:32px;font-weight:900;margin-bottom:6px;color:#fff}
.ndl-pdf-root .hdr2 .sub{font-size:13px;opacity:.85;color:#fff}
.ndl-pdf-root .dgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ndl-pdf-root .dc{border:1px solid #e8e0f5;border-radius:14px;padding:22px;text-align:center}
.ndl-pdf-root .dnum{width:38px;height:38px;background:linear-gradient(135deg,#a163ff,#ff3ca0);border-radius:50%;color:#fff;font-weight:900;font-size:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
.ndl-pdf-root .dc strong{font-size:13px;display:block;margin-bottom:6px;color:#1a1a2e}
.ndl-pdf-root .dc p{font-size:11px;color:#6b6b8a;line-height:1.5}
.ndl-pdf-root .cgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ndl-pdf-root .cbox{border:1px solid #e8e0f5;border-radius:12px;padding:18px}
.ndl-pdf-root .cbox h4{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a163ff;margin-bottom:10px}
.ndl-pdf-root .crow{display:flex;align-items:center;gap:9px;margin-bottom:8px;font-size:12px;color:#1a1a2e}
.ndl-pdf-root .cico{width:30px;height:30px;background:#f9f5ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.ndl-pdf-root .csub{font-size:10px;color:#888;display:block}
.ndl-pdf-root .cta{background:linear-gradient(135deg,#a163ff 0%,#ff3ca0 100%);margin:0 48px 28px;border-radius:14px;padding:26px;text-align:center;color:#fff}
.ndl-pdf-root .cta h3{font-size:20px;font-weight:800;margin-bottom:6px;color:#fff}
.ndl-pdf-root .cta p{opacity:.9;font-size:13px;color:#fff}
</style>
<div class="page">
  <div class="hdr">
    <div class="badge">Proposta Comercial</div>
    <h1>${e(serviceType || 'Faxina Residencial')}</h1>
    <div class="sub">Negócios de Limpeza · Cuidado, capricho e dedicação em cada detalhe</div>
    <div class="cbar">
      <div class="cf"><label>Cliente</label><span>${e(quote.name)}</span></div>
      <div class="cf"><label>Bairro</label><span>${e(neighborhood || 'Guarapari')}</span></div>
      <div class="cf"><label>Contato</label><span>${e(quote.whatsapp)}</span></div>
      <div class="cf"><label>Validade</label><span>7 dias</span></div>
    </div>
  </div>
  <div class="sec">
    <div class="stitle">Sobre o Serviço</div>
    <div class="abox">Cada lar tem suas necessidades únicas, e nosso foco é atender as suas prioridades!
    Durante o atendimento, ouvimos suas demandas e garantimos que elas sejam realizadas com
    <strong>cuidado, capricho e dedicação.</strong>${quote.priorities ? `<br><br><strong>Prioridades:</strong> ${e(quote.priorities)}` : ''}</div>
  </div>
  <div class="sec" style="padding-top:0">
    <div class="stitle">O que está incluso</div>
    <div class="sgrid">
      <div class="sc"><div class="sct"><div class="dot"></div>Cozinha</div><p>Limpeza interna de armários, fogão e de geladeira, limpeza dos pisos e revestimento de paredes, limpeza de portas.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Banheiros</div><p>Limpeza da pia, dos pisos e revestimento de paredes, dos vasos sanitários e banheira, do boxe, espelho e vidros, portas, basculantes.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Sala</div><p>Limpeza dos pisos, poltronas e tapetes, limpeza da superfície externa dos móveis, limpeza de portas, janelas e vidros.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Quartos</div><p>Limpeza externa dos móveis, limpeza do chão, das janelas, de espelhos, portas, vidros e arrumação da cama.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Área de Serviço</div><p>Superfície e parte externa dos móveis, lavagem e esfregação do chão e limpeza de vidros.</p></div>
      <div class="sc"><div class="sct"><div class="dot"></div>Varanda / Gourmet</div><p>Limpeza dos vidros, trilhos e canaletas, limpeza externa de armários, e limpeza do chão.</p></div>
    </div>
  </div>
  <div style="padding:0 48px 20px">
    <div class="inv">
      <div class="ilbl">Investimento</div>
      <div class="idesc">${e(professionals)} profissionais · ${e(hours)} horas de serviço</div>
      <div class="price">R$ ${e(price)}</div>
      <div class="pmethods"><span class="pchip">Pix</span><span class="pchip">Cartão (consultar taxa)</span><span class="pchip">Transferência</span></div>
    </div>
  </div>
  <div class="img-fill" style="background-image:url('${img1}');background-position:center 8%"></div>
  <div class="ftr"><span>Negócios de Limpeza</span><span>Proposta Comercial · Página 1 de 2</span><span>Validade: 7 dias</span></div>
</div>
<div class="page">
  <div class="hdr2">
    <div class="badge">Por que nos escolher</div>
    <h1>Sua casa limpa, do jeito que você merece!</h1>
    <div class="sub">Cuidado, capricho e dedicação em cada detalhe</div>
  </div>
  <div class="sec">
    <div class="stitle">Nossos Diferenciais</div>
    <div class="dgrid">
      <div class="dc"><div class="dnum">1</div><strong>Atendimento Personalizado</strong><p>Ouvimos suas prioridades e adaptamos o serviço às suas necessidades.</p></div>
      <div class="dc"><div class="dnum">2</div><strong>Profissionais Treinados</strong><p>Equipe capacitada, uniformizada e comprometida com a excelência.</p></div>
      <div class="dc"><div class="dnum">3</div><strong>Resultado Garantido</strong><p>Capricho em cada canto, do chão ao teto, com atenção aos detalhes.</p></div>
    </div>
  </div>
  <div class="sec" style="padding-top:0">
    <div class="stitle">Fale Conosco</div>
    <div class="cgrid">
      <div class="cbox"><h4>Mais Informações</h4>
        <div class="crow"><div class="cico">📞</div><div><strong>WhatsApp</strong><span class="csub">27 99980 8013</span></div></div>
        <div class="crow"><div class="cico">📷</div><div><strong>Instagram</strong><span class="csub">@negociosdelimpeza</span></div></div>
        <div class="crow"><div class="cico">🌐</div><div><strong>Site</strong><span class="csub">negociosdelimpeza.com.br</span></div></div>
      </div>
      <div class="cbox"><h4>Formas de Pagamento</h4>
        <div class="crow"><div class="cico">💳</div><div><strong>Cartão de Crédito</strong><span class="csub">Consultar taxa</span></div></div>
        <div class="crow"><div class="cico">💸</div><div><strong>Pix</strong><span class="csub">Pagamento à vista</span></div></div>
        <div class="crow"><div class="cico">🏦</div><div><strong>Transferência Bancária</strong><span class="csub">TED / DOC disponível</span></div></div>
      </div>
    </div>
  </div>
  <div class="cta"><h3>Transforme seu lar com a Negócios de Limpeza!</h3><p>Entre em contato e agende sua faxina com quem cuida de verdade.</p></div>
  <div class="img-fill" style="background-image:url('${img2}');background-position:center 25%"></div>
  <div class="ftr"><span>Negócios de Limpeza</span><span>Proposta Comercial · Página 2 de 2</span><span>Validade: 7 dias</span></div>
</div>`;

  document.body.appendChild(wrapper);
  try {
    // Wait for all images to finish loading
    await Promise.all(
      Array.from(wrapper.querySelectorAll<HTMLImageElement>('img')).map(
        img => img.complete
          ? Promise.resolve()
          : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); }),
      ),
    );

    const pages = wrapper.querySelectorAll<HTMLElement>('.ndl-pdf-root .page');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage();
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.82);
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }

    return doc.output('datauristring').split(',')[1];
  } finally {
    document.body.removeChild(wrapper);
  }
}

// --- DELETE MARKER START ---
/*

  // ── HEADER gradient strip ──
  doc.setFillColor(161, 99, 255);
  doc.rect(0, 0, W, 52, 'F');
  doc.setFillColor(255, 60, 160);
  doc.rect(W / 2, 0, W / 2, 52, 'F');
  // blend with diagonal triangle
  doc.setFillColor(200, 80, 215);
  doc.triangle(W * 0.3, 0, W * 0.7, 0, W * 0.5, 52, 'F');

  // Badge pill
  doc.setFillColor(255, 255, 255, 0.25);
  doc.roundedRect(m, 7, 44, 6, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL', m + 4, 11.5);

  // Title
  doc.setFontSize(20);
  doc.text(serviceType || 'Faxina Residencial', m, 26);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Negócios de Limpeza  ·  Guarapari, ES  ·  Cuidado e dedicação em cada detalhe', m, 34);

  // Info bar inside header
  const infoCols = [
    { label: 'CLIENTE', value: quote.name },
    { label: 'BAIRRO', value: neighborhood || 'Guarapari' },
    { label: 'CONTATO', value: quote.whatsapp },
    { label: 'VALIDADE', value: '7 dias' },
  ];
  const colW = (W - m * 2) / infoCols.length;
  infoCols.forEach((col, i) => {
    const x = m + i * colW;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255, 0.75);
    doc.text(col.label, x, 43);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const val = doc.splitTextToSize(col.value || '—', colW - 4);
    doc.text(val[0], x, 49);
  });

  y = 62;

  // ── ABOUT SERVICE ──
  doc.setTextColor(161, 99, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SOBRE O SERVIÇO', m, y);
  // decorative line
  doc.setDrawColor(161, 99, 255);
  doc.setLineWidth(0.5);
  doc.line(m, y + 1.5, m + 40, y + 1.5);
  y += 6;

  doc.setFillColor(249, 245, 255);
  const aboutText = quote.priorities
    ? `Cada lar tem suas necessidades únicas. Nossas prioridades para este atendimento: ${quote.priorities}`
    : 'Cada lar tem suas necessidades únicas. Nossa equipe cuida das suas prioridades com capricho e dedicação.';
  const aboutLines = doc.splitTextToSize(aboutText, W - m * 2 - 8);
  const boxH = aboutLines.length * 5 + 10;
  doc.roundedRect(m, y, W - m * 2, boxH, 3, 3, 'F');
  doc.setDrawColor(220, 200, 255);
  doc.setLineWidth(0.3);
  doc.rect(m, y, 3, boxH, 'F');
  doc.setFillColor(161, 99, 255);
  doc.rect(m, y, 3, boxH, 'F');
  doc.setTextColor(60, 60, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(aboutLines, m + 7, y + 6);
  y += boxH + 7;

  // ── INCLUDED ITEMS (2 columns) ──
  doc.setTextColor(161, 99, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('O QUE ESTÁ INCLUÍDO', m, y);
  doc.setDrawColor(161, 99, 255);
  doc.setLineWidth(0.5);
  doc.line(m, y + 1.5, m + 46, y + 1.5);
  y += 6;

  const scopeItems = [
    ['Cozinha', 'Armários, fogão, geladeira, pisos e paredes'],
    ['Banheiros', 'Vasos, boxe, espelhos, pisos e revestimentos'],
    ['Quartos', 'Móveis, janelas, espelhos e arrumação da cama'],
    ['Sala', 'Pisos, poltronas, janelas e superfícies'],
    ['Área de serviço', 'Pisos, superfícies e vidros'],
    ['Varanda', 'Vidros, trilhos e limpeza do chão'],
  ];
  if (quote.rooms) {
    doc.setTextColor(100, 60, 180);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cômodos contemplados: ${quote.rooms}`, m, y);
    y += 6;
  }

  const colW2 = (W - m * 2 - 6) / 2;
  scopeItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = m + col * (colW2 + 6);
    const cy = y + row * 18;
    doc.setFillColor(249, 245, 255);
    doc.roundedRect(cx, cy, colW2, 15, 2, 2, 'F');
    doc.setFillColor(161, 99, 255);
    doc.circle(cx + 5, cy + 5, 2, 'F');
    doc.setTextColor(26, 26, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(item[0], cx + 10, cy + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 130);
    doc.setFontSize(7.5);
    const descLines = doc.splitTextToSize(item[1], colW2 - 12);
    doc.text(descLines[0], cx + 10, cy + 11);
  });
  y += Math.ceil(scopeItems.length / 2) * 18 + 6;

  // ── INVESTMENT BOX ──
  doc.setFillColor(161, 99, 255);
  doc.roundedRect(m, y, W - m * 2, 42, 4, 4, 'F');
  // right half pink tint
  doc.setFillColor(255, 60, 160);
  doc.roundedRect(W / 2, y, W / 2 - m, 42, 4, 4, 'F');
  // fix left corners overlap
  doc.setFillColor(161, 99, 255);
  doc.rect(W / 2, y, 8, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text('INVESTIMENTO', m + 5, y + 10);
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text(`R$ ${price}`, m + 5, y + 26);
  doc.setFontSize(9);
  doc.text(`${professionals} profissional${professionals === '2' ? 'is' : ''}  ·  ${hours} horas`, m + 5, y + 36);

  // Payment methods on right
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255, 0.85);
  doc.text('Formas de pagamento:', W / 2 + 8, y + 10);
  ['✓ Pix (à vista)', '✓ Cartão de crédito', '✓ Transferência bancária'].forEach((pm, i) => {
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(pm, W / 2 + 8, y + 18 + i * 8);
  });
  y += 50;

  // ── CONTACT ROW ──
  doc.setFillColor(26, 26, 46);
  doc.rect(0, H - 22, W, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Negócios de Limpeza', m, H - 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 180, 255);
  doc.text('📞 27 99980-8013   📷 @negociosdelimpeza   🌐 negociosdelimpeza.com.br', m, H - 7);
*/
// --- PDF MODAL ---
interface PDFModalProps {
  quote: Quote;
  onClose: () => void;
}

const PDFModal: React.FC<PDFModalProps> = ({ quote, onClose }) => {
  const auto = calcAutoPrice(quote);
  const [price, setPrice] = useState(auto.price);
  const [professionals, setProfessionals] = useState(auto.professionals);
  const [hours, setHours] = useState(auto.hours);
  const [neighborhood, setNeighborhood] = useState('');
  const [serviceType, setServiceType] = useState(quote.serviceOption || 'Faxina Residencial');
  const [validityDays, setValidityDays] = useState('7');
  const [paymentMethod, setPaymentMethod] = useState('Pix, Cartão de Crédito');
  const [includedServices, setIncludedServices] = useState(quote.rooms || '');
  const [observations, setObservations] = useState('');
  const [dateScheduled, setDateScheduled] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  const handleOpenAndSend = async () => {
    if (!price.trim()) return;
    // Open HTML preview in new window
    generateProposalWindow(quote, price, professionals, hours, neighborhood, serviceType, validityDays, paymentMethod, includedServices, observations, dateScheduled);

    if (quote.whatsapp) {
      setWaSending(true);
      try {
        // 1. Send PDF as document
        const pdfBase64 = await generatePDFBase64(quote, price, professionals, hours, neighborhood, serviceType, validityDays, paymentMethod, includedServices, observations, dateScheduled);
        console.log('[PDF] base64 size (chars):', pdfBase64.length);
        const docOk = await sendDocument(
          quote.whatsapp,
          pdfBase64,
          `Proposta_${quote.name.replace(/\s+/g, '_')}.pdf`,
          `Proposta de serviço — ${serviceType}`,
        );
        console.log('[PDF] sendDocument result:', docOk);

        // 2. Send text message
        let templates: any = null;
        try { const st = localStorage.getItem('ndl_whatsapp_templates'); if (st) templates = JSON.parse(st); } catch { /* use default */ }
        const template = templates?.proposal || DEFAULT_TEMPLATES.proposal;
        const msg = buildMessage(template, {
          Nome: (quote.name || '').split(' ')[0],
          Servico: serviceType,
          Endereco: neighborhood || quote.propertyType || 'Guarapari',
          Valor: price,
          Data: dateScheduled ? new Date(dateScheduled + 'T12:00').toLocaleDateString('pt-BR') : 'a combinar',
        });
        const ok = await sendWhatsApp(quote.whatsapp, msg);
        setWaStatus(ok ? 'sent' : 'error');
      } catch {
        setWaStatus('error');
      } finally {
        setWaSending(false);
      }
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Profissionais</label>
              <select value={professionals} onChange={e => setProfessionals(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                {['1','2','3','4','5','6'].map(n => (
                  <option key={n} value={n}>{n} profissional{Number(n) > 1 ? 'is' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Horas</label>
              <select value={hours} onChange={e => setHours(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                {['2','3','4','5','6','7','8','9','10','12'].map(h => (
                  <option key={h} value={h}>{h} horas</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Data prevista</label>
            <input type="date" value={dateScheduled} onChange={e => setDateScheduled(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Serviços incluídos</label>
            <textarea value={includedServices} onChange={e => setIncludedServices(e.target.value)} rows={2}
              placeholder="Ex: Cozinha, banheiro, quartos..."
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Validade (dias)</label>
              <select value={validityDays} onChange={e => setValidityDays(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                <option value="3">3 dias</option>
                <option value="5">5 dias</option>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pagamento</label>
              <input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Observações</label>
            <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2}
              placeholder="Informações adicionais para o cliente..."
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
          </div>

          {/* Auto-calculation breakdown */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Cálculo automático — revise antes de enviar</p>
            {auto.breakdown.map((line, i) => (
              <p key={i} className="text-xs text-gray-700">{line}</p>
            ))}
            {quote.rooms && (
              <p className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-purple-100">Cômodos: {quote.rooms}</p>
            )}
          </div>

          <button
            onClick={handleOpenAndSend}
            disabled={!price.trim() || waSending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {waSending
              ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              : waStatus === 'sent'
              ? <><CheckCircle size={16} /> Proposta aberta + WhatsApp enviado!</>
              : <><FileText size={16} /> Abrir PDF + Enviar WhatsApp</>}
          </button>

          {waStatus === 'error' && (
            <p className="text-[11px] text-red-500 text-center">PDF aberto, mas falha ao enviar WhatsApp. Verifique a conexão.</p>
          )}
          {waStatus === 'idle' && (
            <p className="text-[10px] text-gray-400 text-center">Abre o PDF em nova aba e envia os detalhes ao cliente via WhatsApp.</p>
          )}
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
  const password = phone.slice(-4) || '0000';

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
                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Login — e-mail</span>
                <p className="text-sm font-bold text-gray-800">{loginEmail}</p>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Senha — últimos 4 dígitos do celular</span>
                <p className="text-sm font-bold text-gray-800 tracking-widest">{password}</p>
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
  onDelete: (id: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onStatusChange, onCreateAccount, onDelete }) => {
  const [showChat, setShowChat] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [sendingWpp, setSendingWpp] = useState(false);
  const [wppResult, setWppResult] = useState<'ok' | 'err' | null>(null);

  const handleSendProposal = async () => {
    if (!quote.whatsapp) return;
    setSendingWpp(true);
    setWppResult(null);
    try {
      let templates2: any = null;
      try { const st = localStorage.getItem('ndl_whatsapp_templates'); if (st) templates2 = JSON.parse(st); } catch { /* use default */ }
      const proposalTemplate = templates2?.proposal || `Olá, [Nome]! Sua proposta está pronta! 🎉\n\n🏠 *Serviço:* [Servico]\n\nEntre em contato para confirmar o agendamento! 😊`;
      const msg = buildMessage(proposalTemplate, {
        Nome: quote.name.split(' ')[0],
        Servico: quote.serviceOption || 'Limpeza',
        Endereco: quote.cep || '',
        Valor: '',
        Data: '',
      });
      const ok = await sendWhatsApp(quote.whatsapp, msg);
      setWppResult(ok ? 'ok' : 'err');
      if (ok) onStatusChange(quote.id, 'CONTACTED');
    } catch {
      setWppResult('err');
    }
    setSendingWpp(false);
  };
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
                href={(() => { const d = quote.whatsapp.replace(/\D/g, ''); return `https://wa.me/${d.startsWith('55') ? d : '55' + d}?text=${encodeURIComponent(`Olá ${quote.name}! Recebemos seu orçamento. Podemos conversar?`)}`; })()}
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
          <div className="grid grid-cols-2 gap-2 mb-3">
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

          {/* Detalhes da conversa — sempre visíveis */}
          {(quote.priorities || quote.internalCleaning || quote.renovation || quote.chatSummary) && (
            <div className="border border-purple-100 bg-purple-50/40 rounded-xl p-4 mb-3 space-y-2.5">
              <p className="text-[9px] text-purple-500 uppercase font-bold tracking-wider">Resumo da conversa</p>
              {quote.priorities && (
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Prioridades: </span>
                  <span className="text-xs text-gray-700">{quote.priorities}</span>
                </div>
              )}
              {quote.internalCleaning && (
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Limpeza interna: </span>
                  <span className="text-xs text-gray-700">{quote.internalCleaning}</span>
                </div>
              )}
              {quote.renovation && (
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Reforma/Pós-obra: </span>
                  <span className="text-xs text-gray-700">{quote.renovation}</span>
                </div>
              )}
              {quote.chatSummary && (
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Chat: </span>
                  <span className="text-xs text-gray-600 italic">
                    {quote.chatSummary.length > 180
                      ? quote.chatSummary.slice(0, 180) + '…'
                      : quote.chatSummary}
                  </span>
                  {quote.chatSummary.length > 180 && (
                    <button
                      onClick={() => setShowChat(true)}
                      className="text-[10px] text-purple-600 font-bold hover:underline ml-1"
                    >
                      ver tudo
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fotos do cliente */}
          {quote.clientPhotos && quote.clientPhotos.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-gray-400 uppercase font-bold mb-2">Fotos enviadas pelo cliente</p>
              <div className="flex gap-2 flex-wrap">
                {quote.clientPhotos.map((photo, i) => (
                  <a key={i} href={photo} target="_blank" rel="noopener noreferrer">
                    <img src={photo} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity cursor-zoom-in" />
                  </a>
                ))}
              </div>
            </div>
          )}

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
          {wppResult === 'ok' && (
            <p className="text-[10px] text-green-600 mt-1">✅ Mensagem enviada e status atualizado para "Contatado"</p>
          )}

          {/* Apagar orçamento */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (window.confirm(`Tem certeza que deseja apagar o orçamento de ${quote.name}? Esta ação não pode ser desfeita.`)) {
                  onDelete(quote.id);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 size={12} /> Apagar orçamento
            </button>
          </div>
        </div>

        {/* Ver histórico completo */}
        {quote.chatSummary && quote.chatSummary.length > 180 && (
          <button
            onClick={() => setShowChat(true)}
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs font-bold text-purple-600 hover:bg-purple-50 transition-colors"
          >
            Ver histórico completo do chat →
            <ChevronDown size={14} />
          </button>
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
  const { quotes, updateQuoteStatus, deleteQuote, clients, registerClient } = useData();
  const [filter, setFilter] = useState<Quote['status'] | 'ALL'>('ALL');
  const [createAccountTarget, setCreateAccountTarget] = useState<Quote | null>(null);

  const filtered = filter === 'ALL' ? quotes : quotes.filter(q => q.status === filter);
  const counts = {
    ALL: quotes.length,
    NEW: quotes.filter(q => q.status === 'NEW').length,
    CONTACTED: quotes.filter(q => q.status === 'CONTACTED').length,
    CONVERTED: quotes.filter(q => q.status === 'CONVERTED').length,
    LOST: quotes.filter(q => q.status === 'LOST').length,
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
            <p className="text-sm text-gray-500 mt-1">Leads capturados pelo chat da Nina</p>
          </div>
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
              {filter === 'ALL' ? 'Aguarde leads chegarem pelo chat da Nina' : 'Tente outro filtro'}
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
                onDelete={deleteQuote}
              />
            ))}
          </div>
        )}
      </div>

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
