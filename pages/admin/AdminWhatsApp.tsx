import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import {
  MessageCircle, Wifi, Send, Save, RefreshCw, CheckCircle, XCircle, Bell, Bot, Trash2, Loader2, Settings,
  Plus, Clock, Zap, List, FileText, Users, AlertTriangle, ChevronDown, ChevronUp, Link2,
} from 'lucide-react';
import { buildMessage, DEFAULT_TEMPLATES, waAdmin } from '../../lib/whatsapp';
import { supabase } from '../../lib/supabase';
import { useData } from '../../components/DataContext';
import { BotConfig, BotMode, MenuItem, TONES, DEFAULT_SCRIPT, buildBotPrompt } from '../../supabase/functions/_shared/botPrompt';
import { WA_TEMPLATES, fillTemplate } from '../../supabase/functions/_shared/waTemplates';

declare global {
  interface Window { FB?: any; fbAsyncInit?: () => void }
}

const HUMAN_HOUR_OPTIONS = [12, 24, 48, 72, 96, 168];
const CHAT_HOUR_OPTIONS = [1, 2, 4, 6, 12, 24, 26, 48, 72];

const MODES: { id: BotMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'reminders', label: 'Só lembretes', desc: 'Envia lembretes, confirmações e pós-serviço. Não responde sozinho.', icon: <Bell size={18} /> },
  { id: 'menu', label: 'Menu', desc: 'Responde com uma lista de opções (botões do WhatsApp).', icon: <List size={18} /> },
  { id: 'ai', label: 'IA', desc: 'A assistente conversa, tira dúvidas e monta o orçamento.', icon: <Bot size={18} /> },
];

const TABS = [
  { id: 'conexao', label: 'Conexão', icon: <Wifi size={16} /> },
  { id: 'geral', label: 'Geral', icon: <Settings size={16} /> },
  { id: 'ia', label: 'Assistente IA', icon: <Bot size={16} /> },
  { id: 'menu', label: 'Menu', icon: <List size={16} /> },
  { id: 'modelos', label: 'Modelos', icon: <FileText size={16} /> },
  { id: 'mensagens', label: 'Mensagens', icon: <MessageCircle size={16} /> },
  { id: 'testar', label: 'Testar', icon: <Send size={16} /> },
];

const PLACEHOLDERS: Record<string, { key: string; desc: string }[]> = {
  welcome: [{ key: '[Nome]', desc: 'Nome do cliente' }, { key: '[Servico]', desc: 'Tipo de serviço' }],
  proposal: [
    { key: '[Nome]', desc: 'Nome do cliente' }, { key: '[Servico]', desc: 'Tipo de serviço' },
    { key: '[Endereco]', desc: 'Endereço' }, { key: '[Valor]', desc: 'Valor da proposta' }, { key: '[Data]', desc: 'Data disponível' },
  ],
  confirmation: [{ key: '[Nome]', desc: 'Nome do cliente' }],
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Aprovado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  PENDING: { label: 'Em análise', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  IN_APPEAL: { label: 'Em recurso', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  REJECTED: { label: 'Rejeitado', cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  PAUSED: { label: 'Pausado', cls: 'bg-gray-200 text-gray-600' },
  DISABLED: { label: 'Desativado', cls: 'bg-gray-200 text-gray-600' },
};

const card = 'bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder p-4 md:p-5';
const input = 'w-full p-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-green-300';
const labelCls = 'text-[11px] font-bold text-gray-500 dark:text-darkTextSecondary uppercase block mb-1';

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label?: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 overflow-hidden ${on ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
  </button>
);

const ToggleRow: React.FC<{ title: string; desc?: string; on: boolean; onChange: (v: boolean) => void }> = ({ title, desc, on, onChange }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{title}</p>
      {desc && <p className="text-xs text-gray-500 dark:text-darkTextSecondary mt-0.5">{desc}</p>}
    </div>
    <Toggle on={on} onChange={onChange} label={title} />
  </div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; max?: number; hint?: string }> =
  ({ label, value, onChange, placeholder, rows, max, hint }) => (
    <div>
      <label className={labelCls}>{label}{max ? <span className="font-normal normal-case text-gray-400"> · {value.length}/{max}</span> : null}</label>
      {rows
        ? <textarea rows={rows} value={value} maxLength={max} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${input} resize-y`} />
        : <input value={value} maxLength={max} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={input} />}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );

interface ConnectionInfo {
  status: string;
  display_phone?: string;
  verified_name?: string;
  coexistence?: boolean;
  connected_at?: string;
  last_error?: string | null;
  contacts_sync_requested_at?: string | null;
  history_sync_requested_at?: string | null;
}

type ChatMsg = { role: 'user' | 'model'; text: string };

function loadFacebookSdk(appId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const init = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v26.0' });
      resolve(window.FB);
    };
    if (window.FB) { init(); return; }
    window.fbAsyncInit = init;
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/pt_BR/sdk.js';
    s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
    s.onerror = () => reject(new Error('Não foi possível carregar o login do Facebook.'));
    document.body.appendChild(s);
  });
}

export const AdminWhatsApp: React.FC = () => {
  const { platformSettings, updatePlatformSettings } = useData();
  const [tab, setTab] = useState('conexao');
  const [cfg, setCfg] = useState<BotConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  // Conexão
  const [conn, setConn] = useState<ConnectionInfo>({ status: 'disconnected' });
  const [server, setServer] = useState({ appId: false, appSecret: false, verifyToken: false });
  const [metaIds, setMetaIds] = useState({ appId: '', configId: '' });
  const [loadingConn, setLoadingConn] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connMsg, setConnMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ waba_id: '', phone_number_id: '', token: '', coexistence: true });
  const [manualBusy, setManualBusy] = useState(false);
  const signupInfo = useRef<{ event?: string; waba_id?: string; phone_number_id?: string; business_id?: string }>({});

  // Modelos
  const [tplStatus, setTplStatus] = useState<Record<string, { status: string; rejected_reason?: string | null }>>({});
  const [tplBusy, setTplBusy] = useState(false);
  const [tplMsg, setTplMsg] = useState('');

  // Mensagens (textos livres usados no painel)
  const [templates, setTemplates] = useState({ ...DEFAULT_TEMPLATES });
  const [msgSaved, setMsgSaved] = useState(false);

  // Follow-up
  const [fuChat1, setFuChat1] = useState(2);
  const [fuChat2, setFuChat2] = useState(26);
  const [fuHuman, setFuHuman] = useState<number[]>([24, 48]);

  // Teste
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [sim, setSim] = useState<ChatMsg[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showScript, setShowScript] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const connected = conn.status === 'connected';

  // ── Carregamento ──
  const fetchStatus = async () => {
    setLoadingConn(true);
    const r = await waAdmin('status');
    if (r?.ok) { setConn(r.connection); setServer(r.server); }
    setLoadingConn(false);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('whatsapp_templates').select('name, status, rejected_reason').eq('company_id', 1);
    const map: Record<string, { status: string; rejected_reason?: string | null }> = {};
    for (const t of data ?? []) map[t.name] = { status: t.status, rejected_reason: t.rejected_reason };
    setTplStatus(map);
  };

  useEffect(() => {
    fetchStatus();
    fetchTemplates();
    supabase.from('whatsapp_bot_config').select('*').eq('company_id', 1).maybeSingle().then(({ data }) => {
      if (data) setCfg({ ...data, menu_items: Array.isArray(data.menu_items) ? data.menu_items : [] } as BotConfig);
    });
    supabase.from('platform_settings').select('meta_app_id, meta_es_config_id').eq('id', 1).single().then(({ data }) => {
      setMetaIds({ appId: data?.meta_app_id || '', configId: data?.meta_es_config_id || '' });
    });
  }, []);

  useEffect(() => {
    setTemplates({
      welcome: platformSettings.templateWelcome ?? DEFAULT_TEMPLATES.welcome,
      proposal: platformSettings.templateProposal ?? DEFAULT_TEMPLATES.proposal,
      confirmation: platformSettings.templateConfirmation ?? DEFAULT_TEMPLATES.confirmation,
    });
    setFuChat1(platformSettings.followUpChatHours ?? 2);
    setFuChat2(platformSettings.followUpChatHours2 ?? 26);
    setFuHuman(platformSettings.followUpHumanDelays ?? [24, 48]);
  }, [platformSettings.templateWelcome, platformSettings.templateProposal, platformSettings.templateConfirmation,
      platformSettings.followUpChatHours, platformSettings.followUpChatHours2, platformSettings.followUpHumanDelays]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sim, simLoading]);

  // Recebe os IDs do número escolhido no Cadastro incorporado (janela da Meta).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (String(data.event).startsWith('FINISH')) signupInfo.current = { event: data.event, ...data.data };
        else if (data.event === 'CANCEL') setConnMsg({ ok: false, text: `Conexão cancelada na etapa "${data.data?.current_step || '?'}".` });
        else if (data.event === 'ERROR') setConnMsg({ ok: false, text: `A Meta retornou um erro: ${data.data?.error_message || 'desconhecido'}` });
      } catch { /* mensagens que não são do cadastro */ }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // ── Configuração do bot ──
  const patch = (p: Partial<BotConfig>) => { setCfg(c => (c ? { ...c, ...p } : c)); setDirty(true); };

  const saveConfig = async (override?: Partial<BotConfig>) => {
    if (!cfg) return;
    setSaving(true);
    const { company_id, ...rest } = { ...cfg, ...override } as any;
    await supabase.from('whatsapp_bot_config').update({ ...rest, updated_at: new Date().toISOString() }).eq('company_id', company_id ?? 1);
    if (tab === 'ia') {
      await updatePlatformSettings({ ...platformSettings, followUpChatHours: fuChat1, followUpChatHours2: fuChat2, followUpHumanDelays: fuHuman });
    }
    setSaving(false);
    setDirty(false);
    setSavedAt(Date.now());
  };

  const setMode = (mode: BotMode) => {
    if (!cfg) return;
    setCfg({ ...cfg, mode });
    saveConfig({ mode });
  };

  const promptPreview = useMemo(() => (cfg ? buildBotPrompt(cfg, cfg.script, '+55 27 99999-0000') : ''), [cfg]);

  // ── Conectar WhatsApp (Cadastro incorporado) ──
  const handleConnect = async () => {
    setConnMsg(null);
    if (!metaIds.appId || !metaIds.configId) {
      setConnMsg({ ok: false, text: 'Falta o ID do app e o ID da configuração em Configurações → Integrações.' });
      return;
    }
    setConnecting(true);
    signupInfo.current = {};
    try {
      const FB = await loadFacebookSdk(metaIds.appId);
      FB.login((response: any) => {
        const code = response?.authResponse?.code;
        if (!code) { setConnecting(false); return; }
        // A janela da Meta manda os IDs por mensagem; espera até 5s por eles (o código vale 30s).
        const started = Date.now();
        const finish = async () => {
          const info = signupInfo.current;
          if (!info.phone_number_id && Date.now() - started < 5000) { setTimeout(finish, 300); return; }
          const r = await waAdmin('exchange_code', {
            code, waba_id: info.waba_id, phone_number_id: info.phone_number_id, business_id: info.business_id,
            coexistence: info.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
          });
          setConnMsg(r?.ok
            ? { ok: true, text: `WhatsApp conectado: ${r.display_phone || ''} ${r.verified_name ? `(${r.verified_name})` : ''}${r.registerError ? ` — atenção: ${r.registerError}` : ''}` }
            : { ok: false, text: r?.error || 'Não foi possível concluir a conexão.' });
          setConnecting(false);
          fetchStatus();
          fetchTemplates();
        };
        finish();
      }, {
        config_id: metaIds.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3', version: 'v4' },
      });
    } catch (e: any) {
      setConnMsg({ ok: false, text: e?.message || 'Erro ao abrir o login do Facebook.' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Desconectar o WhatsApp da plataforma? Os lembretes e o bot param até você conectar de novo. O WhatsApp do celular continua funcionando.')) return;
    await waAdmin('disconnect');
    fetchStatus();
  };

  // O token vai direto para o servidor e o campo é limpo em seguida; nada fica guardado no navegador.
  const handleManualConnect = async () => {
    setManualBusy(true);
    setConnMsg(null);
    const r = await waAdmin('manual_connect', manual);
    setManual(m => ({ ...m, token: '' }));
    setConnMsg(r?.ok
      ? { ok: true, text: `WhatsApp conectado: ${r.display_phone || ''} ${r.verified_name ? `(${r.verified_name})` : ''}` }
      : { ok: false, text: r?.error || 'Não foi possível conectar.' });
    setManualBusy(false);
    if (r?.ok) { setShowManual(false); fetchStatus(); fetchTemplates(); }
  };

  const handleSync = async () => {
    const r = await waAdmin('sync');
    setConnMsg(r?.ok ? { ok: true, text: 'Sincronização pedida. Deixe o WhatsApp Business aberto no celular por alguns minutos.' } : { ok: false, text: r?.error || 'Falhou' });
    fetchStatus();
  };

  const handleTest = async () => {
    if (!testPhone) return;
    setSendingTest(true);
    setTestResult(null);
    const r = await waAdmin('send_test', { phone: testPhone, text: testText.trim() || undefined });
    setTestResult(r?.ok
      ? { ok: true, text: r.viaTemplate ? 'Enviado pelo modelo "aviso_equipe" (esse número não falou com você nas últimas 24h).' : 'Mensagem enviada!' }
      : { ok: false, text: r?.error || 'Falha ao enviar.' });
    setSendingTest(false);
  };

  // ── Modelos ──
  const handleCreateTemplates = async () => {
    setTplBusy(true); setTplMsg('');
    const r = await waAdmin('templates_create');
    if (r?.ok) {
      const errors = Object.entries(r.results || {}).filter(([, v]) => !['já existe', 'PENDING', 'APPROVED'].includes(String(v)));
      setTplMsg(errors.length ? `Alguns modelos deram erro: ${errors.map(([k, v]) => `${k}: ${v}`).join(' · ')}` : 'Modelos enviados. A Meta costuma responder em minutos ou até 24h.');
    } else setTplMsg(r?.error || 'Não foi possível enviar.');
    await fetchTemplates();
    setTplBusy(false);
  };

  const handleSyncTemplates = async () => {
    setTplBusy(true);
    await waAdmin('templates_sync');
    await fetchTemplates();
    setTplBusy(false);
  };

  // ── Simulador ──
  const handleSimSend = async () => {
    if (!simInput.trim() || simLoading || !cfg) return;
    const next: ChatMsg[] = [...sim, { role: 'user', text: simInput.trim() }];
    setSim(next); setSimInput(''); setSimLoading(true);
    const r = await waAdmin('simulate', { history: next, config: cfg });
    setSim([...next, { role: 'model', text: r?.ok ? r.reply : `⚠️ ${r?.error || 'Erro ao falar com a assistente.'}` }]);
    setSimLoading(false);
  };

  const handleSaveMessages = async () => {
    await updatePlatformSettings({ ...platformSettings, templateWelcome: templates.welcome, templateProposal: templates.proposal, templateConfirmation: templates.confirmation });
    setMsgSaved(true);
    setTimeout(() => setMsgSaved(false), 2500);
  };

  // ── Menu ──
  const setItem = (i: number, p: Partial<MenuItem>) => {
    if (!cfg) return;
    const items = cfg.menu_items.map((it, idx) => (idx === i ? { ...it, ...p } : it));
    patch({ menu_items: items });
  };

  const showSaveBar = ['geral', 'ia', 'menu'].includes(tab);

  if (!cfg) {
    return (
      <Layout role={UserRole.ADMIN}>
        <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout role={UserRole.ADMIN}>
      <div className={`p-4 md:p-6 max-w-5xl mx-auto ${showSaveBar ? 'pb-28 md:pb-28' : ''}`}>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center shrink-0">
              <MessageCircle size={22} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Automação WhatsApp</h1>
              <p className="text-xs text-lightText dark:text-darkTextSecondary truncate">API oficial da Meta · seu WhatsApp Business continua no celular</p>
            </div>
          </div>
          <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}>
            {loadingConn ? '...' : connected ? '● Conectado' : '● Desconectado'}
          </span>
        </div>

        {/* Seletor de modo */}
        <div className="mb-5">
          <p className={labelCls}>Como o WhatsApp responde</p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`text-left p-3 rounded-2xl border-2 transition-all ${cfg.mode === m.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface hover:border-green-300'}`}
              >
                <div className={`flex items-center gap-1.5 font-bold text-sm ${cfg.mode === m.id ? 'text-green-700 dark:text-green-400' : 'text-darkText dark:text-darkTextPrimary'}`}>
                  {m.icon}<span>{m.label}</span>
                </div>
                <p className="hidden sm:block text-[11px] text-gray-500 dark:text-darkTextSecondary mt-1 leading-snug">{m.desc}</p>
              </button>
            ))}
          </div>
          <p className="sm:hidden text-[11px] text-gray-500 mt-1.5">{MODES.find(m => m.id === cfg.mode)?.desc}</p>
        </div>

        {/* Abas */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-4 px-4 md:mx-0 md:px-0" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t.id
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-darkSurface text-gray-600 dark:text-darkTextSecondary border border-gray-200 dark:border-darkBorder hover:text-green-600'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Conexão ── */}
        {tab === 'conexao' && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-4 md:p-5 border-2 ${connected ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {connected ? <CheckCircle size={26} className="text-green-600 shrink-0" /> : <XCircle size={26} className="text-red-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-bold text-darkText dark:text-darkTextPrimary">{connected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}</p>
                    {connected ? (
                      <div className="text-sm text-gray-600 dark:text-darkTextSecondary space-y-0.5 mt-0.5">
                        <p className="break-words">{conn.display_phone}{conn.verified_name ? ` · ${conn.verified_name}` : ''}</p>
                        <p className="text-xs">{conn.coexistence ? 'Coexistência: o app WhatsApp Business do celular continua funcionando.' : 'Número só na API (sem app no celular).'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-darkTextSecondary mt-0.5">Conecte o número do WhatsApp Business da empresa para enviar lembretes e ligar o atendimento automático.</p>
                    )}
                    {conn.last_error && <p className="text-xs text-red-600 mt-1 flex items-start gap-1"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{conn.last_error}</p>}
                  </div>
                </div>
                <button onClick={fetchStatus} className="p-2 rounded-xl hover:bg-white/60 dark:hover:bg-darkBg shrink-0" title="Atualizar" aria-label="Atualizar status">
                  <RefreshCw size={18} className={`text-gray-500 ${loadingConn ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1877F2] text-white text-sm font-bold hover:opacity-90 disabled:opacity-60"
                >
                  {connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                  {connected ? 'Conectar outro número' : 'Conectar WhatsApp'}
                </button>
                {connected && conn.coexistence && (!conn.contacts_sync_requested_at || !conn.history_sync_requested_at) && (
                  <button onClick={handleSync} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-300 dark:border-darkBorder bg-white dark:bg-darkSurface text-darkText dark:text-darkTextPrimary">
                    Sincronizar contatos e conversas
                  </button>
                )}
                {connected && (
                  <button onClick={handleDisconnect} className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-white dark:bg-darkSurface border border-red-200 hover:bg-red-50">
                    Desconectar
                  </button>
                )}
              </div>
              {connMsg && <p className={`text-sm font-bold mt-3 ${connMsg.ok ? 'text-green-700' : 'text-red-600'}`}>{connMsg.ok ? '✅ ' : '❌ '}{connMsg.text}</p>}
            </div>

            {!connected && (
              <div className={card}>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-2">Como funciona a conexão</p>
                <ol className="text-sm text-gray-600 dark:text-darkTextSecondary space-y-1.5 list-decimal pl-5">
                  <li>Clique em <strong>Conectar WhatsApp</strong> e entre com o Facebook de quem administra a empresa.</li>
                  <li>Escolha a opção de <strong>conectar o app WhatsApp Business que você já usa</strong>.</li>
                  <li>No celular, abra o WhatsApp Business e leia o QR Code que aparece na tela.</li>
                  <li>Aceite compartilhar as conversas. Deixe o app aberto por alguns minutos enquanto sincroniza.</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">Precisa ser o app <strong>WhatsApp Business</strong> (não o pessoal), versão 2.24.17 ou mais nova. Depois de conectar, listas de transmissão e mensagens temporárias ficam desligadas e grupos não passam pela plataforma. Abra o app no celular pelo menos a cada 14 dias para a conexão não cair.</p>
              </div>
            )}

            {!connected && (
              <div className={card}>
                <button onClick={() => setShowManual(s => !s)} className="w-full flex items-center justify-between text-left">
                  <div>
                    <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Conectei pela página da Meta</p>
                    <p className="text-xs text-gray-500 dark:text-darkTextSecondary">Alternativa ao botão: cole os IDs do número e o token permanente do usuário do sistema.</p>
                  </div>
                  {showManual ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                </button>
                {showManual && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="ID da conta do WhatsApp (WABA)" value={manual.waba_id} onChange={v => setManual({ ...manual, waba_id: v.replace(/\D/g, '') })} />
                      <Field label="ID do número de telefone" value={manual.phone_number_id} onChange={v => setManual({ ...manual, phone_number_id: v.replace(/\D/g, '') })} />
                    </div>
                    <div>
                      <label className={labelCls}>Token permanente (usuário do sistema)</label>
                      <input type="password" autoComplete="off" value={manual.token} onChange={e => setManual({ ...manual, token: e.target.value })} className={input} placeholder="Cole aqui" />
                      <p className="text-[11px] text-gray-400 mt-1">Vai direto para o servidor e não fica salvo no navegador.</p>
                    </div>
                    <ToggleRow title="O número continua no app WhatsApp Business do celular" desc="Deixe ligado se você conectou com coexistência."
                      on={manual.coexistence} onChange={v => setManual({ ...manual, coexistence: v })} />
                    <button onClick={handleManualConnect} disabled={manualBusy || !manual.waba_id || !manual.phone_number_id || !manual.token}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {manualBusy && <Loader2 size={15} className="animate-spin" />} Conectar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className={card}>
              <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-3">Checklist da configuração</p>
              <ul className="space-y-2 text-sm">
                {[
                  { ok: !!metaIds.appId, label: 'ID do app da Meta (Configurações → Integrações)' },
                  { ok: !!metaIds.configId, label: 'ID da configuração do Cadastro incorporado (Configurações → Integrações)' },
                  { ok: server.appSecret, label: 'Segredo do app nos Secrets do Supabase (META_APP_SECRET)' },
                  { ok: server.verifyToken, label: 'Token do webhook nos Secrets do Supabase (WA_WEBHOOK_VERIFY_TOKEN)' },
                  { ok: connected, label: 'Número conectado' },
                  { ok: tplStatus.lembrete_servico?.status === 'APPROVED', label: 'Modelo de lembrete aprovado pela Meta (aba Modelos)' },
                ].map(i => (
                  <li key={i.label} className="flex items-start gap-2">
                    {i.ok ? <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-gray-300 shrink-0 mt-0.5" />}
                    <span className={i.ok ? 'text-darkText dark:text-darkTextPrimary' : 'text-gray-500'}>{i.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {connected && (
              <div className={card}>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-3 flex items-center gap-2"><Send size={15} className="text-green-600" /> Enviar mensagem de teste</p>
                <div className="space-y-2">
                  <input type="tel" placeholder="27 99999-0000" value={testPhone} onChange={e => setTestPhone(e.target.value)} className={input} />
                  <textarea rows={2} placeholder="Mensagem (opcional)" value={testText} onChange={e => setTestText(e.target.value)} className={`${input} resize-none`} />
                  <button onClick={handleTest} disabled={sendingTest || !testPhone} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50">
                    {sendingTest ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Pela regra da Meta, texto livre só chega a quem te mandou mensagem nas últimas 24h. Para os outros números vai o modelo "aviso_equipe".</p>
                {testResult && <p className={`text-xs font-bold mt-2 ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>{testResult.ok ? '✅ ' : '❌ '}{testResult.text}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Geral ── */}
        {tab === 'geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <div className={card}>
                <ToggleRow
                  title={cfg.enabled ? 'Atendimento automático ligado' : 'Atendimento automático pausado'}
                  desc={cfg.enabled ? 'O WhatsApp responde sozinho conforme o modo escolhido.' : 'Ninguém recebe resposta automática; lembretes continuam saindo.'}
                  on={cfg.enabled} onChange={v => patch({ enabled: v })}
                />
              </div>

              <div className={card}>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-1 flex items-center gap-2"><Bell size={15} className="text-green-600" /> Lembretes e avisos ao cliente</p>
                <p className="text-xs text-gray-500 dark:text-darkTextSecondary mb-4">Escolha quais mensagens saem sozinhas. Cada uma liga e desliga separado.</p>
                <div className="space-y-4">
                  <ToggleRow
                    title="Confirmação de agendamento"
                    desc="Quando um serviço é agendado no painel."
                    on={cfg.send_booking_confirmation !== false} onChange={v => patch({ send_booking_confirmation: v })}
                  />
                  <ToggleRow
                    title="Lembrete 1 dia antes"
                    desc="Todo dia às 9h, para os serviços do dia seguinte, com os botões Confirmo / Preciso reagendar."
                    on={cfg.send_reminder_d1 !== false} onChange={v => patch({ send_reminder_d1: v })}
                  />
                  <ToggleRow
                    title="Pós-serviço e avaliação"
                    desc="Quando o serviço é marcado como concluído, pede uma nota de 1 a 5."
                    on={cfg.send_post_service !== false} onChange={v => patch({ send_post_service: v })}
                  />
                  <div className="pt-4 border-t border-gray-100 dark:border-darkBorder space-y-3">
                    <ToggleRow
                      title="Cobrar sinal pelo WhatsApp"
                      desc="Depois que o serviço é agendado, envia ao cliente o link de pagamento do sinal (InfinitePay, Pix ou cartão). Quando o cliente paga, a OS fica como “Sinal pago” sozinha."
                      on={!!cfg.send_signal_link}
                      onChange={v => patch(v
                        ? { send_signal_link: true, signal_enabled_at: new Date().toISOString() }
                        : { send_signal_link: false })}
                    />
                    {cfg.send_signal_link && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                        <label className="block">
                          <span className="block text-xs font-bold text-gray-600 dark:text-darkTextSecondary mb-1">Valor do sinal</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={1} max={100} inputMode="numeric"
                              value={cfg.signal_percent ?? 50}
                              onChange={e => patch({ signal_percent: Math.min(100, Math.max(1, Number(e.target.value) || 50)) })}
                              className="w-20 p-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary"
                            />
                            <span className="text-sm text-gray-500 dark:text-darkTextSecondary">% do valor do serviço</span>
                          </div>
                        </label>
                        <label className="block">
                          <span className="block text-xs font-bold text-gray-600 dark:text-darkTextSecondary mb-1">Enviar o link</span>
                          <select
                            value={cfg.signal_delay_minutes ?? 10}
                            onChange={e => patch({ signal_delay_minutes: Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary"
                          >
                            {[0, 5, 10, 15, 30, 60].map(m => (
                              <option key={m} value={m}>{m === 0 ? 'Assim que agendar' : `${m} minutos depois de agendar`}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="block text-xs font-bold text-gray-600 dark:text-darkTextSecondary mb-1">Mensagem “agendamento confirmado”</span>
                          <select
                            value={cfg.booking_confirmation_when ?? 'agendar'}
                            onChange={e => patch({ booking_confirmation_when: e.target.value as 'agendar' | 'sinal' })}
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkBg text-sm text-darkText dark:text-darkTextPrimary"
                          >
                            <option value="agendar">Enviar logo ao agendar</option>
                            <option value="sinal">Enviar só quando o sinal for pago</option>
                          </select>
                        </label>
                        <p className="text-[11px] text-gray-500 dark:text-darkTextSecondary sm:col-span-2">
                          Vale só para agendamentos criados depois de ligar esta opção. Precisa da InfinitePay conectada (Configurações → Integrações) e do modelo “Cobrança do sinal” aprovado pela Meta.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={card}>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-3">Dados do negócio</p>
                <p className="text-xs text-gray-500 -mt-2 mb-3">A assistente usa estas informações quando o cliente pergunta.</p>
                <div className="space-y-3">
                  <Field label="Nome do negócio" value={cfg.business_name || ''} onChange={v => patch({ business_name: v })} />
                  <Field label="Endereço" value={cfg.business_address || ''} onChange={v => patch({ business_address: v })} placeholder="Rua, número, bairro, cidade" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Site" value={cfg.business_website || ''} onChange={v => patch({ business_website: v })} placeholder="negociosdelimpeza.com.br" />
                    <Field label="Instagram" value={cfg.business_instagram || ''} onChange={v => patch({ business_instagram: v })} placeholder="@negociosdelimpeza" />
                    <Field label="Telefone" value={cfg.business_phone || ''} onChange={v => patch({ business_phone: v })} />
                    <Field label="E-mail" value={cfg.business_email || ''} onChange={v => patch({ business_email: v })} />
                  </div>
                  <Field label="Formas de pagamento" value={cfg.payment_methods || ''} onChange={v => patch({ payment_methods: v })} placeholder="Pix, cartão..." />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={card}>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-1 flex items-center gap-2"><Users size={15} className="text-blue-500" /> Atendimento humano</p>
                <p className="text-xs text-gray-500 mb-3">Quando alguém da equipe responde pelo celular, o automático fica em silêncio nessa conversa.</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Reativar o automático após</label>
                    <select value={cfg.human_reactivate_hours} onChange={e => patch({ human_reactivate_hours: Number(e.target.value) })} className={input}>
                      {[2, 4, 6, 8, 12, 24, 48, 72].map(h => <option key={h} value={h}>{h < 24 ? `${h} horas` : `${h / 24} dia${h > 24 ? 's' : ''}`} sem mensagens</option>)}
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Para reativar na hora, mande <strong>#ia</strong> na conversa pelo celular.</p>
                  </div>
                  <ToggleRow title="Avisar quando entrar na fila humana" desc="Manda um WhatsApp de aviso quando um cliente pede atendente ou chega orçamento novo."
                    on={cfg.notify_human_queue} onChange={v => patch({ notify_human_queue: v })} />
                  {cfg.notify_human_queue && (
                    <Field label="Celular que recebe os avisos" value={cfg.notify_phone || ''} onChange={v => patch({ notify_phone: v })}
                      placeholder="27 99999-0000" hint="Use um número diferente do WhatsApp conectado. Em branco: telefone de contato da empresa." />
                  )}
                </div>
              </div>

              <div className={card}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2">
                    <Clock size={15} className="text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Horário de atendimento</p>
                      <p className="text-xs text-gray-500">Fora do horário, manda a mensagem de ausência (1 vez por dia).</p>
                    </div>
                  </div>
                  <Toggle on={!!platformSettings.workingHoursEnabled} label="Horário de atendimento"
                    onChange={v => updatePlatformSettings({ ...platformSettings, workingHoursEnabled: v })} />
                </div>
                {platformSettings.workingHoursEnabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Abertura</label>
                        <input type="time" value={platformSettings.workingHoursStart || '08:00'} className={input}
                          onChange={e => updatePlatformSettings({ ...platformSettings, workingHoursStart: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Fechamento</label>
                        <input type="time" value={platformSettings.workingHoursEnd || '18:00'} className={input}
                          onChange={e => updatePlatformSettings({ ...platformSettings, workingHoursEnd: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Mensagem fora do horário</label>
                      <textarea rows={2} value={platformSettings.awayMessage || ''} className={`${input} resize-none`}
                        onChange={e => updatePlatformSettings({ ...platformSettings, awayMessage: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Assistente IA ── */}
        {tab === 'ia' && (
          <div className="space-y-4">
            {cfg.mode !== 'ai' && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                O modo atual é <strong>{MODES.find(m => m.id === cfg.mode)?.label}</strong>. Estas opções valem quando o modo <strong>IA</strong> estiver ligado
                {cfg.mode === 'menu' ? ' (ou quando o cliente escolher no menu uma opção que chama a IA)' : ''}.
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div className="space-y-4">
                <div className={card}>
                  <div className="space-y-3">
                    <Field label="Nome da assistente" value={cfg.assistant_name || ''} onChange={v => patch({ assistant_name: v })} max={30} />
                    <div>
                      <label className={labelCls}>Linguagem / tom</label>
                      <div className="grid grid-cols-3 gap-2">
                        {TONES.map(t => (
                          <button key={t.value} onClick={() => patch({ tone: t.value })}
                            className={`p-2.5 rounded-xl border-2 text-left ${cfg.tone === t.value ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-darkBorder'}`}>
                            <p className="font-bold text-xs text-darkText dark:text-darkTextPrimary">{t.label}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <ToggleRow title="Respostas por áudio" desc="Quando o cliente manda áudio, a assistente responde com áudio também."
                      on={cfg.audio_replies} onChange={v => patch({ audio_replies: v })} />
                  </div>
                </div>

                <div className={card}>
                  <div className="space-y-3">
                    <Field label="Informações adicionais" rows={4} value={cfg.extra_info || ''} onChange={v => patch({ extra_info: v })}
                      placeholder="Ex.: atendemos Guarapari, Vila Velha e Vitória. Trazemos todos os produtos. Diária de 8h." />
                    <Field label="Regras personalizadas" rows={4} value={cfg.custom_rules || ''} onChange={v => patch({ custom_rules: v })}
                      placeholder="Ex.: nunca passar preço fechado sem visita; não atendemos aos domingos." />
                  </div>
                </div>

                <div className={card}>
                  <button onClick={() => setShowScript(s => !s)} className="w-full flex items-center justify-between text-left">
                    <div>
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Roteiro de atendimento (avançado)</p>
                      <p className="text-xs text-gray-500">O que perguntar para montar o orçamento.</p>
                    </div>
                    {showScript ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>
                  {showScript && (
                    <div className="mt-3 space-y-2">
                      <textarea rows={16} value={cfg.script ?? DEFAULT_SCRIPT} onChange={e => patch({ script: e.target.value })} className={`${input} font-mono text-xs resize-y`} />
                      <button onClick={() => patch({ script: null })} className="text-xs font-bold text-red-500 hover:underline">Voltar ao roteiro padrão</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className={card}>
                  <div className="space-y-3">
                    <Field label="Mensagem após agendamento" rows={2} value={cfg.after_booking_message || ''} onChange={v => patch({ after_booking_message: v })}
                      hint="Enviada quando a assistente termina de coletar os dados do orçamento." />
                    <Field label="Mensagem de transferência para humano" rows={2} value={cfg.handoff_message || ''} onChange={v => patch({ handoff_message: v })} />
                    <Field label="Mensagem de feedback (pós-serviço)" rows={2} value={cfg.feedback_message || ''} onChange={v => patch({ feedback_message: v })}
                      hint="Use [Nome] para o primeiro nome. Se passou de 24h desde a última conversa, vai o modelo aprovado." />
                    <ToggleRow title="Pedir indicações" desc="Se a nota for 4 ou 5, pede indicação de amigos." on={cfg.ask_referrals} onChange={v => patch({ ask_referrals: v })} />
                    {cfg.ask_referrals && <Field label="Mensagem de indicação" rows={2} value={cfg.referral_message || ''} onChange={v => patch({ referral_message: v })} />}
                  </div>
                </div>

                <div className={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Zap size={15} className="text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Follow-up inteligente</p>
                        <p className="text-xs text-gray-500">A assistente retoma conversas paradas lendo o histórico.</p>
                      </div>
                    </div>
                    <Toggle on={!!platformSettings.followUpEnabled} label="Follow-up inteligente"
                      onChange={v => updatePlatformSettings({ ...platformSettings, followUpEnabled: v })} />
                  </div>
                  {platformSettings.followUpEnabled && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Parou no meio da conversa</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ v: fuChat1, s: setFuChat1, l: '1ª tentativa' }, { v: fuChat2, s: setFuChat2, l: '2ª tentativa' }].map(o => (
                            <div key={o.l}>
                              <label className={labelCls}>{o.l}</label>
                              <select value={o.v} onChange={e => { o.s(Number(e.target.value)); setDirty(true); }} className={input}>
                                {CHAT_HOUR_OPTIONS.map(h => <option key={h} value={h}>{h < 24 ? `${h}h` : `${h}h (${Math.round(h / 24)}d)`}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Recebeu orçamento e sumiu</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[0, 1].map(i => (
                            <div key={i}>
                              <label className={labelCls}>{i + 1}ª tentativa</label>
                              <select value={fuHuman[i] ?? (i ? 48 : 24)} className={input}
                                onChange={e => { const n = [...fuHuman]; n[i] = Number(e.target.value); setFuHuman(n); setDirty(true); }}>
                                {HUMAN_HOUR_OPTIONS.map(h => <option key={h} value={h}>{h < 24 ? `${h}h` : `${h / 24} dia${h > 24 ? 's' : ''}`}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400">Depois de 24h sem resposta do cliente, a Meta só deixa enviar o modelo "Retomar conversa" (marketing, ≈ R$ 0,32 cada).</p>
                    </div>
                  )}
                </div>

                <div className={card}>
                  <button onClick={() => setShowPrompt(s => !s)} className="w-full flex items-center justify-between text-left">
                    <div>
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Preview do prompt</p>
                      <p className="text-xs text-gray-500">O texto completo que a IA recebe (atualiza enquanto você edita).</p>
                    </div>
                    {showPrompt ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>
                  {showPrompt && (
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed bg-gray-50 dark:bg-darkBg rounded-xl p-3 text-gray-700 dark:text-darkTextSecondary">{promptPreview}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Menu ── */}
        {tab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
            <div className="space-y-4">
              {cfg.mode !== 'menu' && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                  O menu só é enviado com o modo <strong>Menu</strong> ligado.
                </div>
              )}
              <div className={card}>
                <div className="space-y-3">
                  <Field label="Mensagem de boas-vindas" rows={2} value={cfg.menu_greeting || ''} onChange={v => patch({ menu_greeting: v })} max={1024} />
                  <Field label="Texto do botão que abre a lista" value={cfg.menu_button_label || ''} onChange={v => patch({ menu_button_label: v })} max={20} />
                </div>
              </div>
              {cfg.menu_items.map((it, i) => (
                <div key={i} className={card}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Opção {i + 1}</p>
                    <button onClick={() => patch({ menu_items: cfg.menu_items.filter((_, idx) => idx !== i) })} className="p-1.5 text-red-400 hover:text-red-600" aria-label={`Remover opção ${i + 1}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <Field label="Título" value={it.title} onChange={v => setItem(i, { title: v })} max={24} />
                      <div>
                        <label className={labelCls}>Ao escolher</label>
                        <select value={it.action} onChange={e => setItem(i, { action: e.target.value as MenuItem['action'] })} className={input}>
                          <option value="reply">Responder com um texto</option>
                          <option value="human">Passar para a equipe</option>
                          <option value="ai">Continuar com a IA</option>
                        </select>
                      </div>
                    </div>
                    <Field label="Descrição" value={it.description || ''} onChange={v => setItem(i, { description: v })} max={72} />
                    {it.action === 'reply' && <Field label="Resposta" rows={3} value={it.response || ''} onChange={v => setItem(i, { response: v })} max={1024} />}
                  </div>
                </div>
              ))}
              {cfg.menu_items.length < 10 && (
                <button
                  onClick={() => patch({ menu_items: [...cfg.menu_items, { id: `op${Date.now().toString(36)}`, title: 'Nova opção', description: '', action: 'reply', response: '' }] })}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-darkBorder text-sm font-bold text-gray-500 hover:text-green-600 hover:border-green-400 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Adicionar opção ({cfg.menu_items.length}/10)
                </button>
              )}
            </div>

            {/* Prévia no celular */}
            <div className="lg:sticky lg:top-4">
              <p className={labelCls}>Prévia</p>
              <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl p-3 space-y-2">
                <div className="bg-white dark:bg-[#202c33] rounded-xl rounded-tl-sm p-3 shadow-sm max-w-[90%]">
                  <p className="text-sm text-gray-800 dark:text-[#e9edef] whitespace-pre-wrap">{cfg.menu_greeting}</p>
                  <div className="border-t border-gray-100 dark:border-[#2a3942] mt-2 pt-2 text-center text-sm font-bold text-[#00a884] flex items-center justify-center gap-1">
                    <List size={14} /> {cfg.menu_button_label || 'Ver opções'}
                  </div>
                </div>
                <div className="bg-white dark:bg-[#202c33] rounded-xl p-2 shadow-sm">
                  {cfg.menu_items.map((it, i) => (
                    <div key={i} className="px-2 py-1.5 border-b last:border-0 border-gray-100 dark:border-[#2a3942]">
                      <p className="text-sm text-gray-800 dark:text-[#e9edef]">{it.title || '—'}</p>
                      {it.description && <p className="text-[11px] text-gray-500 dark:text-[#8696a0]">{it.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modelos (aprovados pela Meta) ── */}
        {tab === 'modelos' && (
          <div className="space-y-4">
            <div className={card}>
              <p className="text-sm text-gray-600 dark:text-darkTextSecondary">
                Para falar com um cliente que <strong>não</strong> mandou mensagem nas últimas 24h, a Meta exige um <strong>modelo aprovado</strong>.
                Envie os modelos abaixo uma vez; a aprovação costuma sair em minutos (até 24h).
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={handleCreateTemplates} disabled={!connected || tplBusy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                  {tplBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar modelos para aprovação
                </button>
                <button onClick={handleSyncTemplates} disabled={!connected || tplBusy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-darkBorder text-sm font-bold text-darkText dark:text-darkTextPrimary disabled:opacity-50">
                  <RefreshCw size={15} /> Atualizar status
                </button>
              </div>
              {!connected && <p className="text-xs text-red-500 mt-2">Conecte o WhatsApp primeiro.</p>}
              {tplMsg && <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mt-2">{tplMsg}</p>}
            </div>
            {WA_TEMPLATES.map(t => {
              const st = tplStatus[t.name];
              const badge = st ? STATUS_BADGE[st.status] ?? { label: st.status, cls: 'bg-gray-200 text-gray-600' } : { label: 'Não enviado', cls: 'bg-gray-100 text-gray-500 dark:bg-darkBg' };
              return (
                <div key={t.name} className={card}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{t.label}</p>
                      <p className="text-[11px] text-gray-400 font-mono break-all">{t.name} · {t.category === 'UTILITY' ? 'utilidade (≈ R$ 0,035)' : 'marketing (≈ R$ 0,32)'}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="bg-[#e7ffd8] dark:bg-[#005c4b] rounded-xl rounded-tr-sm p-3 text-sm text-gray-800 dark:text-white whitespace-pre-wrap">
                    {fillTemplate(t.body, t.example)}
                    {t.buttons && (
                      <div className="flex gap-2 mt-2">
                        {t.buttons.map(b => <span key={b} className="flex-1 text-center text-xs font-bold text-[#00a884] dark:text-white bg-white/70 dark:bg-white/10 rounded-lg py-1.5">{b}</span>)}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">{t.usedFor}</p>
                  {st?.rejected_reason && <p className="text-[11px] text-red-500 mt-1">Motivo da rejeição: {st.rejected_reason}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Mensagens do painel ── */}
        {tab === 'mensagens' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
              Textos enviados pelo painel (orçamento recebido, proposta, confirmação). Só chegam se o cliente falou com você nas últimas 24h; fora disso use os modelos aprovados.
            </div>
            {(['welcome', 'proposal', 'confirmation'] as const).map(key => (
              <div key={key} className={card}>
                <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary mb-2">
                  {key === 'welcome' ? 'Boas-vindas (orçamento recebido)' : key === 'proposal' ? 'Envio da proposta' : 'Confirmação'}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PLACEHOLDERS[key].map(p => (
                    <span key={p.key} className="text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg font-mono">{p.key}</span>
                  ))}
                </div>
                <textarea rows={6} value={templates[key]} onChange={e => setTemplates({ ...templates, [key]: e.target.value })} className={`${input} font-mono resize-y`} />
                <div className="bg-[#e7ffd8] rounded-xl rounded-tr-sm p-3 mt-2 max-w-sm ml-auto">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {buildMessage(templates[key], { Nome: 'Ana', Servico: 'Limpeza Residencial', Endereco: 'Rua das Flores, 50', Valor: '280,00', Data: 'Segunda às 09h' })}
                  </p>
                </div>
              </div>
            ))}
            <button onClick={handleSaveMessages} className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 ${msgSaved ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {msgSaved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar mensagens</>}
            </button>
          </div>
        )}

        {/* ── Testar a assistente ── */}
        {tab === 'testar' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Converse como se fosse um cliente. Usa as configurações da aba Assistente IA, inclusive as que ainda não foram salvas.</p>
            <div className="bg-[#0b141a] rounded-2xl overflow-hidden border border-gray-800">
              <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">{(cfg.assistant_name || 'N')[0]}</div>
                  <div>
                    <p className="text-white text-sm font-bold">{cfg.assistant_name || 'Nina'} — teste</p>
                    <p className="text-[#8696a0] text-xs">online</p>
                  </div>
                </div>
                <button onClick={() => setSim([])} className="text-[#8696a0] hover:text-white p-1" aria-label="Limpar conversa"><Trash2 size={16} /></button>
              </div>
              <div className="h-[55vh] min-h-[320px] overflow-y-auto p-3 space-y-2 flex flex-col">
                {sim.length === 0 && <p className="text-center text-[#8696a0] text-sm mt-8">Mande uma mensagem para começar</p>}
                {sim.map((m, i) => {
                  const quote = m.text.match(/<<QUOTE_DATA>>([\s\S]*?)<<END_QUOTE>>/);
                  const clean = m.text.replace(/<<QUOTE_DATA>>[\s\S]*?<<END_QUOTE>>/, '').replace(/<<HUMAN_HANDOFF>>/g, '').trim();
                  return (
                    <React.Fragment key={i}>
                      {clean && (
                        <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#005c4b] text-white' : 'bg-[#202c33] text-[#e9edef]'}`}>{clean}</div>
                        </div>
                      )}
                      {m.text.includes('<<HUMAN_HANDOFF>>') && <p className="text-center text-[11px] text-amber-400">→ conversa passada para a equipe</p>}
                      {quote && (
                        <div className="bg-[#1a3a2a] border border-green-700 rounded-xl px-3 py-2 text-xs text-[#c9d1d9]">
                          <p className="text-green-400 font-semibold mb-1 flex items-center gap-1"><CheckCircle size={13} /> Orçamento coletado</p>
                          <p className="break-words font-mono text-[10px]">{quote[1].trim()}</p>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                {simLoading && <div className="bg-[#202c33] rounded-xl px-3 py-2 w-fit flex items-center gap-2"><Loader2 size={13} className="animate-spin text-[#8696a0]" /><span className="text-[#8696a0] text-xs">digitando...</span></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
                <input value={simInput} onChange={e => setSimInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSimSend()}
                  placeholder="Digite uma mensagem..." className="flex-1 min-w-0 bg-[#2a3942] text-white placeholder-[#8696a0] rounded-xl px-4 py-2 text-sm outline-none" />
                <button onClick={handleSimSend} disabled={simLoading || !simInput.trim()} aria-label="Enviar"
                  className="w-9 h-9 bg-[#00a884] rounded-full flex items-center justify-center disabled:opacity-40 shrink-0">
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de salvar */}
      {showSaveBar && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0 inset-x-0 z-30 md:left-64 bg-white/95 dark:bg-darkSurface/95 backdrop-blur border-t border-gray-200 dark:border-darkBorder px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-darkTextSecondary">
              {dirty ? 'Você tem alterações não salvas.' : savedAt ? '✅ Tudo salvo.' : 'Nenhuma alteração.'}
            </p>
            <button onClick={() => saveConfig()} disabled={!dirty || saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};
