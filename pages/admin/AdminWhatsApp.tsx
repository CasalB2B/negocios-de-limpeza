import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { MessageCircle, Wifi, Send, Save, RefreshCw, CheckCircle, XCircle, Smartphone, Bell, FileText, ThumbsUp, Bot, Trash2, Loader2, Settings } from 'lucide-react';
import { getStatus, getQrCode, sendMessage, buildMessage, DEFAULT_TEMPLATES, EvolutionStatus, disconnectInstance } from '../../lib/evolution';
import { sendMessage as askNina, GeminiMessage, QUOTE_SYSTEM_PROMPT } from '../../lib/gemini';
import { useData } from '../../components/DataContext';

const STORAGE_KEY = 'ndl_whatsapp_templates';
const PROMPT_STORAGE_KEY = 'ndl_nina_prompt';

function loadTemplates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { ...DEFAULT_TEMPLATES };
  } catch {
    return { ...DEFAULT_TEMPLATES };
  }
}

const TABS = [
  { id: 'status',       label: 'Conexão',     icon: <Wifi size={18} />,      color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
  { id: 'nina',         label: 'Treinar Nina', icon: <Bot size={18} />,       color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'config',       label: 'Personalizar', icon: <Settings size={18} />,  color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'welcome',      label: 'Boas-vindas',  icon: <Bell size={18} />,      color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'proposal',     label: 'Proposta',     icon: <FileText size={18} />,  color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'confirmation', label: 'Confirmação',  icon: <ThumbsUp size={18} />,  color: 'text-pink-600',   bg: 'bg-pink-100 dark:bg-pink-900/30' },
];

const PLACEHOLDERS: Record<string, { key: string; desc: string }[]> = {
  welcome: [
    { key: '[Nome]', desc: 'Nome do cliente' },
    { key: '[Servico]', desc: 'Tipo de serviço' },
  ],
  proposal: [
    { key: '[Nome]', desc: 'Nome do cliente' },
    { key: '[Servico]', desc: 'Tipo de serviço' },
    { key: '[Endereco]', desc: 'Endereço' },
    { key: '[Valor]', desc: 'Valor da proposta' },
    { key: '[Data]', desc: 'Data disponível' },
  ],
  confirmation: [
    { key: '[Nome]', desc: 'Nome do cliente' },
  ],
};

export const AdminWhatsApp: React.FC = () => {
  const { platformSettings, updatePlatformSettings } = useData();
  const [tab, setTab] = useState('status');
  const [status, setStatus] = useState<EvolutionStatus>({ connected: false, profileName: null, profilePic: null });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);
  const [templates, setTemplates] = useState(loadTemplates());
  const [saved, setSaved] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessageText, setTestMessageText] = useState('');
  const [testResult, setTestResult] = useState<'ok' | 'err' | null>(null);
  const [sending, setSending] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Nina trainer
  const [ninaHistory, setNinaHistory] = useState<GeminiMessage[]>([]);
  const [ninaInput, setNinaInput] = useState('');
  const [ninaLoading, setNinaLoading] = useState(false);
  const [ninaPrompt, setNinaPrompt] = useState<string>(QUOTE_SYSTEM_PROMPT);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync prompt from Supabase when settings load
  useEffect(() => {
    if (platformSettings.botPrompt) setNinaPrompt(platformSettings.botPrompt);
  }, [platformSettings.botPrompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ninaHistory, ninaLoading]);

  const handleSavePrompt = async () => {
    await updatePlatformSettings({ ...platformSettings, botPrompt: ninaPrompt });
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2500);
  };

  const handleResetPrompt = async () => {
    setNinaPrompt(QUOTE_SYSTEM_PROMPT);
    await updatePlatformSettings({ ...platformSettings, botPrompt: QUOTE_SYSTEM_PROMPT });
  };

  const handleNinaSend = async () => {
    if (!ninaInput.trim() || ninaLoading) return;
    const userMsg: GeminiMessage = { role: 'user', parts: [{ text: ninaInput.trim() }] };
    const newHistory = [...ninaHistory, userMsg];
    setNinaHistory(newHistory);
    setNinaInput('');
    setNinaLoading(true);
    try {
      const reply = await askNina(newHistory, ninaPrompt);
      const finalHistory: GeminiMessage[] = [...newHistory, { role: 'model' as const, parts: [{ text: reply }] }];
      // Check if quote was finalized
      const quoteMatch = reply.match(/<<QUOTE_DATA>>([\s\S]*?)<<END_QUOTE>>/);
      if (quoteMatch) {
        // Add a system confirmation card into the chat
        const confirmCard = `__QUOTE_FINALIZED__${quoteMatch[1].trim()}`;
        setNinaHistory([...finalHistory, { role: 'system' as any, parts: [{ text: confirmCard }] }]);
      } else {
        setNinaHistory(finalHistory);
      }
    } catch {
      setNinaHistory([...newHistory, { role: 'model', parts: [{ text: '⚠️ Erro ao conectar com a Nina. Verifique a chave do Gemini.' }] }]);
    } finally {
      setNinaLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Desconectar o WhatsApp? Será necessário escanear um novo QR Code para reconectar.')) return;
    setDisconnecting(true);
    await disconnectInstance();
    setDisconnecting(false);
    setQrCode(null);
    await fetchStatus();
  };

  const fetchStatus = async () => {
    setLoadingStatus(true);
    const s = await getStatus();
    setStatus(s);
    setLoadingStatus(false);
  };

  const fetchQr = async () => {
    setLoadingQr(true);
    setQrCode(null);
    const qr = await getQrCode();
    setQrCode(qr);
    setLoadingQr(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!status.connected) {
      const interval = setInterval(fetchStatus, 8000);
      return () => clearInterval(interval);
    }
  }, [status.connected]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async () => {
    if (!testPhone) return;
    setSending(true);
    setTestResult(null);
    const msg = testMessageText.trim()
      ? testMessageText.trim()
      : buildMessage(templates[tab === 'status' ? 'welcome' : tab], {
          Nome: 'Cliente Teste',
          Servico: 'Limpeza Residencial',
          Endereco: 'Rua Exemplo, 123',
          Valor: '280,00',
          Data: 'Segunda-feira às 09h',
        });
    const ok = await sendMessage(testPhone, msg);
    setTestResult(ok ? 'ok' : 'err');
    setSending(false);
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
            <MessageCircle size={24} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Automação WhatsApp</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Configure as mensagens automáticas para clientes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl font-bold transition-all ${
                tab === t.id
                  ? 'bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/40 scale-[1.03]'
                  : 'bg-white dark:bg-darkSurface text-gray-500 dark:text-darkTextSecondary border border-gray-200 dark:border-darkBorder hover:border-green-300 hover:text-green-600'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                tab === t.id ? 'bg-white/20' : t.bg + ' ' + t.color
              }`}>
                {t.icon}
              </div>
              <span className="text-[11px] leading-tight text-center">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Conexão */}
        {tab === 'status' && (
          <div className="space-y-4">
            {/* Nina Toggle */}
            <div className={`rounded-2xl border-2 p-4 flex items-center justify-between ${platformSettings.ninaEnabled !== false ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 bg-gray-50 dark:bg-darkBorder'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platformSettings.ninaEnabled !== false ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">
                    Nina {platformSettings.ninaEnabled !== false ? 'Ativa' : 'Pausada'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {platformSettings.ninaEnabled !== false ? 'Respondendo automaticamente' : 'Bot desativado — atendimento manual'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updatePlatformSettings({ ...platformSettings, ninaEnabled: platformSettings.ninaEnabled === false })}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${platformSettings.ninaEnabled !== false ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${platformSettings.ninaEnabled !== false ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl p-5 border-2 ${status.connected ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-red-50 border-red-200 dark:bg-red-900/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status.connected
                    ? <CheckCircle size={28} className="text-green-600" />
                    : <XCircle size={28} className="text-red-500" />}
                  <div>
                    <p className="font-bold text-darkText dark:text-darkTextPrimary">
                      {status.connected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                    </p>
                    <p className="text-sm text-lightText dark:text-darkTextSecondary">
                      {status.connected
                        ? (status.profileName ? `Conectado como: ${status.profileName}` : 'Sessão ativa')
                        : 'Escaneie o QR Code para conectar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status.connected && (
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors"
                      title="Desconectar WhatsApp"
                    >
                      {disconnecting
                        ? <RefreshCw size={13} className="animate-spin" />
                        : <XCircle size={13} />}
                      {disconnecting ? 'Desconectando...' : 'Desconectar'}
                    </button>
                  )}
                  <button onClick={fetchStatus} className="p-2 rounded-xl hover:bg-white/50 transition-colors" title="Atualizar">
                    <RefreshCw size={18} className={`text-gray-500 ${loadingStatus ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {!status.connected && (
              <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Smartphone size={18} className="text-gray-500" />
                    <p className="font-bold text-darkText dark:text-darkTextPrimary">Conectar via QR Code</p>
                  </div>
                  <button
                    onClick={fetchQr}
                    disabled={loadingQr}
                    className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loadingQr ? 'animate-spin' : ''} />
                    {qrCode ? 'Atualizar' : 'Gerar QR Code'}
                  </button>
                </div>

                {qrCode ? (
                  <div className="flex flex-col items-center gap-3">
                    <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 rounded-xl border border-gray-200" />
                    <p className="text-xs text-center text-lightText dark:text-darkTextSecondary">
                      Abra o WhatsApp → 3 pontinhos → <strong>Dispositivos conectados</strong> → Escaneie
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
                    <Smartphone size={40} />
                    <p className="text-sm">Clique em "Gerar QR Code" para conectar</p>
                  </div>
                )}
              </div>
            )}

            {/* Envio de teste */}
            {status.connected && (
              <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
                <p className="font-bold text-darkText dark:text-darkTextPrimary mb-3 flex items-center gap-2">
                  <Send size={16} className="text-green-600" /> Enviar mensagem de teste
                </p>
                <div className="space-y-2">
                  <input
                    type="tel"
                    placeholder="27 99999-0000"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary"
                  />
                  <textarea
                    rows={3}
                    placeholder="Digite a mensagem de teste... (deixe em branco para usar o template de boas-vindas)"
                    value={testMessageText}
                    onChange={e => setTestMessageText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary resize-none"
                  />
                  <button
                    onClick={handleTest}
                    disabled={sending || !testPhone}
                    className="w-full px-5 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {sending ? '...' : 'Enviar'}
                  </button>
                </div>
                {testResult === 'ok' && <p className="text-xs text-green-600 mt-2 font-bold">✅ Mensagem enviada com sucesso!</p>}
                {testResult === 'err' && <p className="text-xs text-red-500 mt-2 font-bold">❌ Falha ao enviar. Verifique a conexão.</p>}
              </div>
            )}
          </div>
        )}

        {/* Tab: Treinar Nina */}
        {tab === 'nina' && (
          <div className="space-y-4">
            {/* Prompt editor toggle */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-700 dark:text-darkTextPrimary">Prompt da Nina</p>
                <button onClick={() => setEditingPrompt(e => !e)} className="text-xs text-primary font-bold hover:underline">
                  {editingPrompt ? 'Fechar' : 'Editar prompt'}
                </button>
              </div>
              {editingPrompt && (
                <>
                  <textarea
                    rows={12}
                    value={ninaPrompt}
                    onChange={e => setNinaPrompt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSavePrompt}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${promptSaved ? 'bg-green-100 text-green-700' : 'bg-primary text-white hover:opacity-90'}`}
                    >
                      {promptSaved ? '✅ Prompt salvo!' : '💾 Salvar prompt'}
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(ninaPrompt)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={handleResetPrompt}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50"
                      title="Restaurar prompt original"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">
                    ✅ Salvar aqui atualiza o simulador <strong>e o bot do WhatsApp</strong> automaticamente — o bot lê o prompt do banco em tempo real.
                  </p>
                </>
              )}
            </div>

            {/* Chat simulador */}
            <div className="bg-[#0b141a] rounded-2xl overflow-hidden border border-gray-800" style={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')", backgroundSize: '400px' }}>
              {/* Header */}
              <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">N</div>
                  <div>
                    <p className="text-white text-sm font-bold">Nina — Simulador</p>
                    <p className="text-[#8696a0] text-xs">online</p>
                  </div>
                </div>
                <button onClick={() => setNinaHistory([])} className="text-[#8696a0] hover:text-white p-1" title="Limpar conversa">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 space-y-2 flex flex-col">
                {ninaHistory.length === 0 && (
                  <p className="text-center text-[#8696a0] text-sm mt-8">Mande uma mensagem para simular a conversa com a Nina</p>
                )}
                {ninaHistory.map((msg, i) => {
                  // System card: quote finalized
                  if ((msg.role as string) === 'system' && msg.parts[0].text.startsWith('__QUOTE_FINALIZED__')) {
                    let q: Record<string, string> = {};
                    try { q = JSON.parse(msg.parts[0].text.replace('__QUOTE_FINALIZED__', '')); } catch { /* ignore */ }
                    return (
                      <div key={i} className="flex justify-center my-2">
                        <div className="bg-[#1a3a2a] border border-green-700 rounded-xl px-4 py-3 text-sm w-full max-w-[90%]">
                          <p className="text-green-400 font-semibold mb-2 flex items-center gap-1"><CheckCircle size={14} /> Orçamento finalizado!</p>
                          <div className="text-[#c9d1d9] space-y-0.5 text-xs">
                            {q.name && <p><span className="text-[#8696a0]">Nome:</span> {q.name}</p>}
                            {q.email && <p><span className="text-[#8696a0]">Email:</span> {q.email}</p>}
                            {q.whatsapp && <p><span className="text-[#8696a0]">WhatsApp:</span> {q.whatsapp}</p>}
                            {q.propertyType && <p><span className="text-[#8696a0]">Imóvel:</span> {q.propertyType}</p>}
                            {q.serviceOption && <p><span className="text-[#8696a0]">Serviço:</span> {q.serviceOption}</p>}
                            {q.rooms && <p><span className="text-[#8696a0]">Cômodos:</span> {q.rooms}</p>}
                            {q.priorities && <p><span className="text-[#8696a0]">Prioridades:</span> {q.priorities}</p>}
                            {(q.addressStreet || q.addressDistrict) && <p><span className="text-[#8696a0]">Endereço:</span> {[q.addressStreet, q.addressNumber, q.addressDistrict].filter(Boolean).join(', ')}</p>}
                          </div>
                          <p className="text-[#8696a0] text-xs mt-2">Orçamento salvo — equipe humana assume a partir daqui.</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap shadow ${msg.role === 'user' ? 'bg-[#005c4b] text-white rounded-br-sm' : 'bg-[#202c33] text-[#e9edef] rounded-bl-sm'}`}>
                        {msg.parts[0].text.replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '').trim()}
                      </div>
                    </div>
                  );
                })}
                {ninaLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] rounded-xl px-4 py-2 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-[#8696a0]" />
                      <span className="text-[#8696a0] text-xs">digitando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                <input
                  value={ninaInput}
                  onChange={e => setNinaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNinaSend()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 bg-[#2a3942] text-white placeholder-[#8696a0] rounded-xl px-4 py-2 text-sm outline-none"
                />
                <button
                  onClick={handleNinaSend}
                  disabled={ninaLoading || !ninaInput.trim()}
                  className="w-9 h-9 bg-[#00a884] rounded-full flex items-center justify-center hover:bg-[#00c49a] transition-colors disabled:opacity-40"
                >
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Personalizar */}
        {tab === 'config' && (
          <div className="space-y-5">

            {/* Horário de Atendimento */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Horário de Atendimento</p>
                  <p className="text-xs text-gray-500 mt-0.5">Nina só responde dentro deste horário</p>
                </div>
                <button
                  onClick={() => updatePlatformSettings({ ...platformSettings, workingHoursEnabled: !platformSettings.workingHoursEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${platformSettings.workingHoursEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${platformSettings.workingHoursEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {platformSettings.workingHoursEnabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Abertura</label>
                      <input type="time" value={platformSettings.workingHoursStart || '08:00'}
                        onChange={e => updatePlatformSettings({ ...platformSettings, workingHoursStart: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-green-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Fechamento</label>
                      <input type="time" value={platformSettings.workingHoursEnd || '18:00'}
                        onChange={e => updatePlatformSettings({ ...platformSettings, workingHoursEnd: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-green-300" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Mensagem fora do horário</label>
                    <textarea value={platformSettings.awayMessage || ''}
                      onChange={e => updatePlatformSettings({ ...platformSettings, awayMessage: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-green-300 resize-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up Automático */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Follow-up Automático</p>
                  <p className="text-xs text-gray-500 mt-0.5">Lembrete para clientes que pararam de responder</p>
                </div>
                <button
                  onClick={() => updatePlatformSettings({ ...platformSettings, followUpEnabled: !platformSettings.followUpEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${platformSettings.followUpEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${platformSettings.followUpEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {platformSettings.followUpEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Enviar após (horas)</label>
                    <select value={platformSettings.followUpHours || 24}
                      onChange={e => updatePlatformSettings({ ...platformSettings, followUpHours: Number(e.target.value) })}
                      className="w-full p-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-green-300">
                      <option value={2}>2 horas</option>
                      <option value={6}>6 horas</option>
                      <option value={12}>12 horas</option>
                      <option value={24}>24 horas</option>
                      <option value={48}>48 horas</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Mensagem de follow-up</label>
                    <p className="text-[10px] text-gray-400 mb-1">Use <span className="font-mono">[Nome]</span> e <span className="font-mono">[Servico]</span> como variáveis</p>
                    <textarea
                      rows={4}
                      value={platformSettings.followUpMessage || ''}
                      onChange={e => updatePlatformSettings({ ...platformSettings, followUpMessage: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-green-300 resize-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tom de Voz */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-1">Tom de Voz da Nina</p>
              <p className="text-xs text-gray-500 mb-3">Ajusta automaticamente o estilo de conversa</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'casual', label: 'Casual', desc: 'Próxima e amigável' },
                  { value: 'formal', label: 'Formal', desc: 'Profissional e direta' },
                  { value: 'commercial', label: 'Comercial', desc: 'Foco em conversão' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => updatePlatformSettings({ ...platformSettings, ninaTone: opt.value })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${platformSettings.ninaTone === opt.value || (!platformSettings.ninaTone && opt.value === 'casual') ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-darkBorder hover:border-gray-300'}`}>
                    <p className="font-bold text-xs text-darkText dark:text-darkTextPrimary">{opt.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tabs de Mensagens */}
        {(['welcome', 'proposal', 'confirmation'] as const).map(key => (
          tab === key && (
            <div key={key} className="space-y-4">
              {/* Placeholders */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {PLACEHOLDERS[key]?.map(p => (
                    <span key={p.key} className="text-xs bg-white dark:bg-darkSurface border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg font-mono">
                      {p.key} <span className="text-gray-400 font-sans">→ {p.desc}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
                <p className="font-bold text-darkText dark:text-darkTextPrimary mb-3">
                  {key === 'welcome' && 'Mensagem de Boas-vindas'}
                  {key === 'proposal' && 'Mensagem de Envio da Proposta'}
                  {key === 'confirmation' && 'Mensagem de Confirmação'}
                </p>
                <textarea
                  rows={10}
                  value={templates[key]}
                  onChange={e => setTemplates({ ...templates, [key]: e.target.value })}
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Preview */}
              <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Preview (com dados de exemplo)</p>
                <div className="bg-[#e7ffd8] rounded-2xl rounded-br-sm p-4 max-w-xs ml-auto shadow-sm">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {buildMessage(templates[key], {
                      Nome: 'Ana Silva',
                      Servico: 'Limpeza Residencial',
                      Endereco: 'Rua das Flores, 50',
                      Valor: '280,00',
                      Data: 'Segunda-feira às 09h',
                    })}
                  </p>
                  <p className="text-[10px] text-gray-400 text-right mt-1">14:32 ✓✓</p>
                </div>
              </div>

              {/* Botão Salvar */}
              <button
                onClick={handleSave}
                className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  saved
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar Mensagem</>}
              </button>

              {/* Teste rápido */}
              {status.connected && (
                <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">Testar esta mensagem:</p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="27 99999-0000"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary"
                    />
                    <button
                      onClick={handleTest}
                      disabled={sending || !testPhone}
                      className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {sending ? '...' : <Send size={16} />}
                    </button>
                  </div>
                  {testResult === 'ok' && <p className="text-xs text-green-600 mt-2">✅ Enviado!</p>}
                  {testResult === 'err' && <p className="text-xs text-red-500 mt-2">❌ Falha. Verifique a conexão.</p>}
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </Layout>
  );
};
