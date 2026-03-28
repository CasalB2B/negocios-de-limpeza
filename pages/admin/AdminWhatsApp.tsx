import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { MessageCircle, Wifi, WifiOff, Send, Save, RefreshCw, CheckCircle, XCircle, Smartphone, Bell, FileText, ThumbsUp } from 'lucide-react';
import { getStatus, getQrCode, sendMessage, buildMessage, DEFAULT_TEMPLATES, EvolutionStatus } from '../../lib/evolution';

const STORAGE_KEY = 'ndl_whatsapp_templates';

function loadTemplates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { ...DEFAULT_TEMPLATES };
  } catch {
    return { ...DEFAULT_TEMPLATES };
  }
}

const TABS = [
  { id: 'status', label: 'Conexão', icon: <Wifi size={16} /> },
  { id: 'welcome', label: 'Boas-vindas', icon: <Bell size={16} /> },
  { id: 'proposal', label: 'Proposta', icon: <FileText size={16} /> },
  { id: 'confirmation', label: 'Confirmação', icon: <ThumbsUp size={16} /> },
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
  const [tab, setTab] = useState('status');
  const [status, setStatus] = useState<EvolutionStatus>({ connected: false, profileName: null, profilePic: null });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);
  const [templates, setTemplates] = useState(loadTemplates());
  const [saved, setSaved] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<'ok' | 'err' | null>(null);
  const [sending, setSending] = useState(false);

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
    const msg = buildMessage(templates[tab === 'status' ? 'welcome' : tab], {
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-green-600 text-white shadow'
                  : 'bg-white dark:bg-darkSurface text-lightText dark:text-darkTextSecondary border border-gray-200 dark:border-darkBorder hover:border-green-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Conexão */}
        {tab === 'status' && (
          <div className="space-y-4">
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
                <button onClick={fetchStatus} className="p-2 rounded-xl hover:bg-white/50 transition-colors" title="Atualizar">
                  <RefreshCw size={18} className={`text-gray-500 ${loadingStatus ? 'animate-spin' : ''}`} />
                </button>
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
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="27 99999-0000"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary"
                  />
                  <button
                    onClick={handleTest}
                    disabled={sending || !testPhone}
                    className="px-5 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
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
