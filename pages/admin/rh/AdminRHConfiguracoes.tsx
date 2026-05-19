import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  Settings, DollarSign, Award, History, AlertTriangle, CheckCircle,
  Calculator, Target, Star, Save, Info, TrendingUp, X,
  RefreshCw, Link2, Zap, Eye, EyeOff, Copy,
} from 'lucide-react';

const TAB_KEYS = ['remuneracao', 'bonus', 'criterios', 'integracoes'] as const;
type Tab = typeof TAB_KEYS[number];
const TAB_LABELS: Record<Tab, string> = {
  remuneracao:  'Remuneração',
  bonus:        'Bônus / Líder',
  criterios:    'Critérios de Promoção',
  integracoes:  '🔗 Integrações',
};

// ── Gendo helpers ─────────────────────────────────────────────────────────────
const LS_GENDO_USER  = 'gendo_username';
const LS_GENDO_TOKEN = 'gendo_token';

function getSupabaseRef(): string {
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    // https://abcdefgh.supabase.co → abcdefgh
    return url.replace('https://', '').split('.')[0] || '';
  } catch { return ''; }
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export const AdminRHConfiguracoes: React.FC = () => {
  const {
    colaboradoras,
    configBonusLider, historicoConfigBonus,
    configRemuneracao, configCriterios,
    updateConfigBonusLider, updateConfigRemuneracao, updateConfigCriterios,
    calcularBonus, addBonusMensal, getMediaAvaliacoesMes, avaliacoes, bonusMensal,
  } = useRH();

  const [tab, setTab]               = useState<Tab>('remuneracao');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);
  const [alteradoPor, setAlteradoPor] = useState('');
  const [saved, setSaved]           = useState(false);

  // ── Remuneração ─────────────────────────────────────────────────────────────
  const remJunior = configRemuneracao.find(r => r.cargo === 'JUNIOR');
  const remSenior = configRemuneracao.find(r => r.cargo === 'SENIOR');
  const remProf   = configRemuneracao.find(r => r.cargo === 'PROFISSIONAL');

  const [remJ, setRemJ] = useState({ diaria4h: 80,  diaria6h: 120, diaria8h: 140, passagem: 10.20 });
  const [remS, setRemS] = useState({ diaria4h: 85,  diaria6h: 130, diaria8h: 150, passagem: 10.20 });
  const [remP, setRemP] = useState({ diaria4h: 90,  diaria6h: 140, diaria8h: 160, passagem: 10.20 });

  useEffect(() => { if (remJunior) setRemJ({ diaria4h: remJunior.diaria4h, diaria6h: remJunior.diaria6h, diaria8h: remJunior.diaria8h, passagem: remJunior.passagem }); }, [remJunior?.id]);
  useEffect(() => { if (remSenior) setRemS({ diaria4h: remSenior.diaria4h, diaria6h: remSenior.diaria6h, diaria8h: remSenior.diaria8h, passagem: remSenior.passagem }); }, [remSenior?.id]);
  useEffect(() => { if (remProf)   setRemP({ diaria4h: remProf.diaria4h,   diaria6h: remProf.diaria6h,   diaria8h: remProf.diaria8h,   passagem: remProf.passagem   }); }, [remProf?.id]);

  // ── Bônus config ────────────────────────────────────────────────────────────
  const [bonusCfg, setBonusCfg] = useState({
    salarioFixo: 2800, multiplicadorFaxina: 3, bonusAvaliacao: 150,
    bonusAvaliacao5estrelas: 300, metaAvaliacao: 4.5, metaFaxinasMes: 100,
  });
  useEffect(() => {
    if (configBonusLider) setBonusCfg({
      salarioFixo:             configBonusLider.salarioFixo,
      multiplicadorFaxina:     configBonusLider.multiplicadorFaxina,
      bonusAvaliacao:          configBonusLider.bonusAvaliacao,
      bonusAvaliacao5estrelas: configBonusLider.bonusAvaliacao5estrelas ?? configBonusLider.bonusAvaliacao * 2,
      metaAvaliacao:           configBonusLider.metaAvaliacao,
      metaFaxinasMes:          configBonusLider.metaFaxinasMes,
    });
  }, [configBonusLider?.id]);

  // ── Bônus calculator state ──────────────────────────────────────────────────
  const lideres = useMemo(
    () => colaboradoras.filter(c => c.cargoAtual === CargoRH.LIDER && c.status === 'ATIVA'),
    [colaboradoras],
  );
  const now = new Date();
  const [calcColabId, setCalcColabId] = useState(() => lideres[0]?.id || '');
  const [calcMes,  setCalcMes]  = useState(now.getMonth() + 1);
  const [calcAno,  setCalcAno]  = useState(now.getFullYear());
  const [faxinas,  setFaxinas]  = useState('');
  const [mediaManual, setMediaManual] = useState('4.5');
  const [usarManual,  setUsarManual]  = useState(false);
  const [showSaveCal, setShowSaveCal] = useState(false);
  const [regPor,      setRegPor]      = useState('');

  const mediaDoSistema = useMemo(
    () => (calcColabId ? getMediaAvaliacoesMes(calcColabId, calcMes, calcAno) : null),
    [calcColabId, calcMes, calcAno, getMediaAvaliacoesMes],
  );
  const qtdAvaliacoes = useMemo(() => {
    if (!calcColabId) return 0;
    const ini = new Date(calcAno, calcMes - 1, 1);
    const fim = new Date(calcAno, calcMes, 0, 23, 59, 59);
    return avaliacoes.filter(a => {
      if (a.colaboradoraId !== calcColabId) return false;
      const d = new Date(a.createdAt);
      return d >= ini && d <= fim;
    }).length;
  }, [calcColabId, calcMes, calcAno, avaliacoes]);

  const mediaEfetiva = usarManual || mediaDoSistema === null ? parseFloat(mediaManual) : mediaDoSistema;
  const totalFaxinas = parseFloat(faxinas);
  const meta         = bonusCfg.metaFaxinasMes;
  const metaAtingida = !isNaN(totalFaxinas) && totalFaxinas > meta;
  const progressoPct = isNaN(totalFaxinas) ? 0 : Math.min(100, (totalFaxinas / meta) * 100);

  const calculo = useMemo(() => {
    if (isNaN(totalFaxinas) || isNaN(mediaEfetiva) || totalFaxinas < 0) return null;
    return calcularBonus(totalFaxinas, mediaEfetiva);
  }, [totalFaxinas, mediaEfetiva, calcularBonus]);

  const lider = colaboradoras.find(c => c.id === calcColabId);

  const handleSaveCalculo = async () => {
    if (!calculo || !calcColabId || !configBonusLider) return;
    await addBonusMensal({
      colaboradoraId: calcColabId, mes: calcMes, ano: calcAno,
      totalFaxinasEquipe: totalFaxinas, mediaAvaliacaoEquipe: mediaEfetiva,
      valorBonusFaxinas: calculo.valorBonusFaxinas, valorBonusAvaliacao: calculo.valorBonusAvaliacao,
      totalBonus: calculo.totalBonus, totalReceber: calculo.totalReceber,
      configuracaoId: configBonusLider.id,
    });
    setShowSaveCal(false);
    setFaxinas('');
  };

  // ── Gendo integration state ─────────────────────────────────────────────────
  const [gendoUsername, setGendoUsername] = useState(() => localStorage.getItem(LS_GENDO_USER) || '');
  const [gendoToken,    setGendoToken]    = useState(() => localStorage.getItem(LS_GENDO_TOKEN) || '');
  const [showToken,     setShowToken]     = useState(false);
  const [gendoSyncing,  setGendoSyncing]  = useState(false);
  const [gendoResult,   setGendoResult]   = useState<null | {
    periodo: string;
    totalFinalizados: number;
    professionals: { id_responsavel: number; nome_responsavel: string; count: number }[];
  }>(null);
  const [gendoError,    setGendoError]    = useState('');
  const [copied,        setCopied]        = useState(false);

  const saveGendoConfig = () => {
    localStorage.setItem(LS_GENDO_USER,  gendoUsername.trim());
    localStorage.setItem(LS_GENDO_TOKEN, gendoToken.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const supabaseRef = getSupabaseRef();
  const webhookUrl  = supabaseRef
    ? `https://${supabaseRef}.supabase.co/functions/v1/gendo-webhook`
    : '(configure VITE_SUPABASE_URL no .env)';

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Called from the Bônus calculator to pull faxinas for the selected month
  const syncFromGendo = useCallback(async () => {
    if (!gendoUsername || !gendoToken) {
      setGendoError('Configure o usuário e token do Gendo na aba Integrações primeiro.');
      return;
    }
    setGendoSyncing(true);
    setGendoError('');
    setGendoResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('gendo-sync', {
        body: { username: gendoUsername, token: gendoToken, mes: calcMes, ano: calcAno },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Erro desconhecido');
      setGendoResult(data);
      // Auto-fill if we find the selected líder by name match
      if (lider && data.professionals?.length) {
        const match = data.professionals.find((p: any) =>
          p.nome_responsavel.toLowerCase().includes(lider.nome.split(' ')[0].toLowerCase()) ||
          lider.nome.toLowerCase().includes(p.nome_responsavel.split(' ')[0].toLowerCase())
        );
        if (match) setFaxinas(String(match.count));
      }
    } catch (e: any) {
      setGendoError(e.message || 'Erro ao conectar ao Gendo');
    } finally {
      setGendoSyncing(false);
    }
  }, [gendoUsername, gendoToken, calcMes, calcAno, lider]);

  // ── Critérios ───────────────────────────────────────────────────────────────
  const getCrit = (cargo: CargoRH) => configCriterios.find(c => c.cargoOrigem === cargo);
  const [critJ, setCritJ] = useState({ tempoMinimoMeses: 6,  mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1 });
  const [critS, setCritS] = useState({ tempoMinimoMeses: 12, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1 });
  const [critP, setCritP] = useState({ tempoMinimoMeses: 18, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1 });
  const [critL, setCritL] = useState({ tempoMinimoMeses: 36, mesesSemReclamacoes: 6, mesesConsecutivosMetaBatida: 3 });

  useEffect(() => {
    const j = getCrit(CargoRH.JUNIOR);       if (j) setCritJ({ tempoMinimoMeses: j.tempoMinimoMeses, mesesSemReclamacoes: j.mesesSemReclamacoes, mesesConsecutivosMetaBatida: j.mesesConsecutivosMetaBatida });
    const s = getCrit(CargoRH.SENIOR);       if (s) setCritS({ tempoMinimoMeses: s.tempoMinimoMeses, mesesSemReclamacoes: s.mesesSemReclamacoes, mesesConsecutivosMetaBatida: s.mesesConsecutivosMetaBatida });
    const p = getCrit(CargoRH.PROFISSIONAL); if (p) setCritP({ tempoMinimoMeses: p.tempoMinimoMeses, mesesSemReclamacoes: p.mesesSemReclamacoes, mesesConsecutivosMetaBatida: p.mesesConsecutivosMetaBatida });
    const l = getCrit(CargoRH.LIDER);        if (l) setCritL({ tempoMinimoMeses: l.tempoMinimoMeses, mesesSemReclamacoes: l.mesesSemReclamacoes, mesesConsecutivosMetaBatida: l.mesesConsecutivosMetaBatida });
  }, [configCriterios.length]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const askConfirm = (fn: () => Promise<void>) => { setPendingSave(() => fn); setShowConfirm(true); };

  const handleConfirm = async () => {
    if (!pendingSave) return;
    await pendingSave();
    setShowConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const saveRemuneracao = () => askConfirm(async () => {
    const hoje = new Date().toISOString().split('T')[0];
    await updateConfigRemuneracao([
      { cargo: 'JUNIOR',       ...remJ, vigenciaInicio: hoje, alteradoPor },
      { cargo: 'SENIOR',       ...remS, vigenciaInicio: hoje, alteradoPor },
      { cargo: 'PROFISSIONAL', ...remP, vigenciaInicio: hoje, alteradoPor },
    ]);
  });

  const saveBonus = () => askConfirm(async () => {
    await updateConfigBonusLider({
      salarioFixo: bonusCfg.salarioFixo, multiplicadorFaxina: bonusCfg.multiplicadorFaxina,
      bonusAvaliacao: bonusCfg.bonusAvaliacao, bonusAvaliacao5estrelas: bonusCfg.bonusAvaliacao5estrelas,
      metaAvaliacao: bonusCfg.metaAvaliacao, metaFaxinasMes: bonusCfg.metaFaxinasMes,
      vigenciaInicio: new Date().toISOString().split('T')[0], alteradoPor,
    });
  });

  const saveCriterios = () => askConfirm(async () => {
    const hoje = new Date().toISOString().split('T')[0];
    await updateConfigCriterios([
      { cargoOrigem: CargoRH.JUNIOR,       ...critJ, vigenciaInicio: hoje, alteradoPor },
      { cargoOrigem: CargoRH.SENIOR,       ...critS, vigenciaInicio: hoje, alteradoPor },
      { cargoOrigem: CargoRH.PROFISSIONAL, ...critP, vigenciaInicio: hoje, alteradoPor },
      { cargoOrigem: CargoRH.LIDER,        ...critL, vigenciaInicio: hoje, alteradoPor },
    ]);
  });

  // ── Input helpers ────────────────────────────────────────────────────────────
  const CellInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <input
      type="number" value={value} step="0.01"
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full border border-input bg-background dark:bg-darkBg rounded-lg px-2 py-1.5 text-sm text-darkText dark:text-darkTextPrimary text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );

  const NumInput = ({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) => (
    <div>
      <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1">{label}</label>
      <div className="flex items-center border border-input bg-background dark:bg-darkBg rounded-xl overflow-hidden">
        {prefix && <span className="px-2.5 py-2 text-xs text-lightText bg-gray-50 dark:bg-darkBg border-r border-input">{prefix}</span>}
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step="0.01"
          className="flex-1 px-2.5 py-2 text-sm text-darkText dark:text-darkTextPrimary bg-transparent focus:outline-none" />
      </div>
    </div>
  );

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Configurações de RH</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">Todos os valores são editáveis e versionados</p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-green-700 dark:text-green-400 text-sm font-bold">
            <CheckCircle size={16}/> Configuração salva com sucesso!
          </div>
        )}

        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-yellow-700 dark:text-yellow-400 text-xs">
          <AlertTriangle size={14} className="shrink-0" />
          Cada alteração cria uma nova versão. O histórico de bônus anteriores não é afetado.
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-darkBorder gap-1">
          {TAB_KEYS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* ═══ TAB: REMUNERAÇÃO ═══ */}
        {tab === 'remuneracao' && (
          <div className="space-y-4">
            {/* Tabela compacta em colunas */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 dark:border-darkBorder flex items-center gap-2">
                <DollarSign size={15} className="text-primary"/>
                <h3 className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Tabela de Diárias</h3>
                <span className="ml-auto text-[10px] text-lightText dark:text-darkTextSecondary">Todos os valores em R$</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-darkBg">
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide w-28">Campo</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Auxiliar de Limpeza</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Faxineira</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Faxineira Profissional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-darkBorder">
                    {[
                      { label: 'Diária 4h', jVal: remJ.diaria4h, sVal: remS.diaria4h, pVal: remP.diaria4h, jSet: (v: number) => setRemJ(p => ({...p, diaria4h: v})), sSet: (v: number) => setRemS(p => ({...p, diaria4h: v})), pSet: (v: number) => setRemP(p => ({...p, diaria4h: v})) },
                      { label: 'Diária 6h', jVal: remJ.diaria6h, sVal: remS.diaria6h, pVal: remP.diaria6h, jSet: (v: number) => setRemJ(p => ({...p, diaria6h: v})), sSet: (v: number) => setRemS(p => ({...p, diaria6h: v})), pSet: (v: number) => setRemP(p => ({...p, diaria6h: v})) },
                      { label: 'Diária 8h', jVal: remJ.diaria8h, sVal: remS.diaria8h, pVal: remP.diaria8h, jSet: (v: number) => setRemJ(p => ({...p, diaria8h: v})), sSet: (v: number) => setRemS(p => ({...p, diaria8h: v})), pSet: (v: number) => setRemP(p => ({...p, diaria8h: v})) },
                      { label: 'Passagem',  jVal: remJ.passagem,  sVal: remS.passagem,  pVal: remP.passagem,  jSet: (v: number) => setRemJ(p => ({...p, passagem: v})),  sSet: (v: number) => setRemS(p => ({...p, passagem: v})),  pSet: (v: number) => setRemP(p => ({...p, passagem: v})) },
                    ].map(({ label, jVal, sVal, pVal, jSet, sSet, pSet }) => (
                      <tr key={label} className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-4 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">{label}</td>
                        <td className="px-3 py-2"><CellInput value={jVal} onChange={jSet}/></td>
                        <td className="px-3 py-2"><CellInput value={sVal} onChange={sSet}/></td>
                        <td className="px-3 py-2"><CellInput value={pVal} onChange={pSet}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Líder e Gerente — info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-3">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400">Líder de Equipe</p>
                <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">
                  Salário fixo + bônus por meta.<br/>
                  Configure na aba <strong>Bônus / Líder</strong>.
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-xl p-3">
                <p className="text-xs font-bold text-green-700 dark:text-green-400">Gerente de Equipe</p>
                <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">
                  Salário fixo negociado.<br/>
                  Defina individualmente no perfil.
                </p>
              </div>
            </div>

            <Input label="Alterado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
            <Button fullWidth onClick={saveRemuneracao}>Salvar Tabela de Remuneração</Button>

            {/* Histórico */}
            {configRemuneracao.length > 0 && (
              <HistoricoSection>
                {configRemuneracao.map(r => (
                  <div key={r.id} className="flex justify-between text-xs text-lightText dark:text-darkTextSecondary py-1.5 border-b border-gray-50 dark:border-darkBorder last:border-0">
                    <span>{r.cargo} · vigência: {fmtDate(r.vigenciaInicio)}{r.vigenciaFim ? ` → ${fmtDate(r.vigenciaFim)}` : ' (atual)'}</span>
                    <span>4h={fmt(r.diaria4h)} · 6h={fmt(r.diaria6h)} · 8h={fmt(r.diaria8h)}</span>
                  </div>
                ))}
              </HistoricoSection>
            )}
          </div>
        )}

        {/* ═══ TAB: BÔNUS / LÍDER ═══ */}
        {tab === 'bonus' && (
          <div className="space-y-5">

            {/* ── Configuração ── */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 dark:border-darkBorder flex items-center gap-2">
                <Award size={15} className="text-primary"/>
                <h3 className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Configuração do Bônus</h3>
              </div>
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-darkBg">
                        <th className="text-left px-3 py-2 text-xs font-bold text-lightText uppercase tracking-wide">Campo</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Líder de Equipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-darkBorder">
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-3 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">Salário fixo</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center border border-input bg-background dark:bg-darkBg rounded-lg overflow-hidden">
                            <span className="px-2 py-1.5 text-xs text-lightText bg-gray-50 dark:bg-darkBg border-r border-input">R$</span>
                            <input type="number" value={bonusCfg.salarioFixo} onChange={e => setBonusCfg(p => ({...p, salarioFixo: parseFloat(e.target.value)||0}))} className="flex-1 px-2 py-1.5 text-sm text-center text-darkText dark:text-darkTextPrimary bg-transparent focus:outline-none"/>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-3 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">Meta de faxinas/mês</td>
                        <td className="px-3 py-2">
                          <input type="number" value={bonusCfg.metaFaxinasMes} onChange={e => setBonusCfg(p => ({...p, metaFaxinasMes: Math.round(parseFloat(e.target.value)||0)}))} className="w-full border border-input bg-background dark:bg-darkBg rounded-lg px-2 py-1.5 text-sm text-center text-darkText dark:text-darkTextPrimary focus:outline-none"/>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-3 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">Multiplicador por faxina</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center border border-input bg-background dark:bg-darkBg rounded-lg overflow-hidden">
                            <span className="px-2 py-1.5 text-xs text-lightText bg-gray-50 dark:bg-darkBg border-r border-input">R$</span>
                            <input type="number" value={bonusCfg.multiplicadorFaxina} onChange={e => setBonusCfg(p => ({...p, multiplicadorFaxina: parseFloat(e.target.value)||0}))} className="flex-1 px-2 py-1.5 text-sm text-center text-darkText dark:text-darkTextPrimary bg-transparent focus:outline-none"/>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-3 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">Meta de avaliação (estrelas)</td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.1" min="1" max="5" value={bonusCfg.metaAvaliacao} onChange={e => setBonusCfg(p => ({...p, metaAvaliacao: parseFloat(e.target.value)||0}))} className="w-full border border-input bg-background dark:bg-darkBg rounded-lg px-2 py-1.5 text-sm text-center text-darkText dark:text-darkTextPrimary focus:outline-none"/>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-3 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">
                          Bônus avaliação ≥{bonusCfg.metaAvaliacao.toFixed(1)}⭐
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center border border-input bg-background dark:bg-darkBg rounded-lg overflow-hidden">
                            <span className="px-2 py-1.5 text-xs text-lightText bg-gray-50 dark:bg-darkBg border-r border-input">R$</span>
                            <input type="number" value={bonusCfg.bonusAvaliacao} onChange={e => setBonusCfg(p => ({...p, bonusAvaliacao: parseFloat(e.target.value)||0}))} className="flex-1 px-2 py-1.5 text-sm text-center text-darkText dark:text-darkTextPrimary bg-transparent focus:outline-none"/>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-3 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">
                          Bônus 5⭐ (média ≥4,9)
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center border border-input bg-background dark:bg-darkBg rounded-lg overflow-hidden">
                            <span className="px-2 py-1.5 text-xs text-lightText bg-gray-50 dark:bg-darkBg border-r border-input">R$</span>
                            <input type="number" value={bonusCfg.bonusAvaliacao5estrelas} onChange={e => setBonusCfg(p => ({...p, bonusAvaliacao5estrelas: parseFloat(e.target.value)||0}))} className="flex-1 px-2 py-1.5 text-sm text-center text-darkText dark:text-darkTextPrimary bg-transparent focus:outline-none"/>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Preview do cálculo */}
                <div className="mt-4 bg-primary/5 dark:bg-primary/10 rounded-xl p-3 text-xs space-y-1">
                  <p className="font-bold text-darkText dark:text-darkTextPrimary text-[11px] mb-1.5">
                    Preview — meta batida + avaliação ≥{bonusCfg.metaAvaliacao.toFixed(1)}⭐
                  </p>
                  <div className="flex justify-between">
                    <span className="text-lightText">Salário fixo</span>
                    <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(bonusCfg.salarioFixo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lightText">{bonusCfg.metaFaxinasMes + 1} faxinas × {fmt(bonusCfg.multiplicadorFaxina)}</span>
                    <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt((bonusCfg.metaFaxinasMes + 1) * bonusCfg.multiplicadorFaxina)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lightText">+ Bônus avaliação</span>
                    <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(bonusCfg.bonusAvaliacao)}</span>
                  </div>
                  <div className="flex justify-between border-t border-primary/20 pt-1.5 mt-1">
                    <span className="font-bold text-darkText dark:text-darkTextPrimary">Total a receber</span>
                    <span className="font-bold text-primary">{fmt(bonusCfg.salarioFixo + (bonusCfg.metaFaxinasMes + 1) * bonusCfg.multiplicadorFaxina + bonusCfg.bonusAvaliacao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lightText">Com 5⭐ dobrado</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">{fmt(bonusCfg.salarioFixo + (bonusCfg.metaFaxinasMes + 1) * bonusCfg.multiplicadorFaxina + bonusCfg.bonusAvaliacao5estrelas)}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <Input label="Alterado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
                </div>
                <Button fullWidth className="mt-3" onClick={saveBonus}>Salvar Configuração de Bônus</Button>

                {historicoConfigBonus.length > 1 && (
                  <div className="mt-3">
                    <HistoricoSection>
                      {historicoConfigBonus.map(c => (
                        <div key={c.id} className="flex justify-between items-start text-xs text-lightText dark:text-darkTextSecondary py-2 border-b border-gray-50 dark:border-darkBorder last:border-0">
                          <div>
                            <p>Vigência: {fmtDate(c.vigenciaInicio)}{c.vigenciaFim ? ` → ${fmtDate(c.vigenciaFim)}` : ' (atual)'}</p>
                            {c.alteradoPor && <p className="mt-0.5">Por: {c.alteradoPor}</p>}
                          </div>
                          <p>Mult: {fmt(c.multiplicadorFaxina)} · Bônus: {fmt(c.bonusAvaliacao)}</p>
                        </div>
                      ))}
                    </HistoricoSection>
                  </div>
                )}
              </div>
            </div>

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100 dark:bg-darkBorder"/>
              <span className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-widest">Calculadora de Bônus</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-darkBorder"/>
            </div>

            {/* ── Calculadora integrada ── */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-4">
              <h3 className="font-bold text-sm text-darkText dark:text-darkTextPrimary flex items-center gap-2">
                <Calculator size={15} className="text-primary"/> Calcular Bônus do Mês
              </h3>

              {lideres.length === 0 ? (
                <p className="text-sm text-lightText dark:text-darkTextSecondary bg-gray-50 dark:bg-darkBg rounded-xl p-3">
                  Nenhuma Líder de Equipe ativa. Cadastre em <strong>Colaboradoras</strong>.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1">Líder</label>
                      <select value={calcColabId} onChange={e => setCalcColabId(e.target.value)}
                        className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
                        {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1">Mês / Ano</label>
                      <div className="flex gap-1">
                        <select value={calcMes} onChange={e => setCalcMes(Number(e.target.value))}
                          className="flex-1 border border-input bg-background dark:bg-darkBg rounded-xl px-2 py-2 text-xs text-darkText dark:text-darkTextPrimary focus:outline-none">
                          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m.substring(0,3)}</option>)}
                        </select>
                        <input type="number" value={calcAno} onChange={e => setCalcAno(Number(e.target.value))}
                          className="w-16 border border-input bg-background dark:bg-darkBg rounded-xl px-1 py-2 text-xs text-darkText dark:text-darkTextPrimary focus:outline-none text-center"/>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Faxinas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-1.5">
                          <Target size={11} className="text-primary"/> Faxinas da equipe
                        </label>
                        {gendoUsername && gendoToken ? (
                          <button onClick={syncFromGendo} disabled={gendoSyncing}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg px-2 py-1 transition-colors disabled:opacity-60">
                            <RefreshCw size={10} className={gendoSyncing ? 'animate-spin' : ''}/>
                            {gendoSyncing ? 'Buscando...' : 'Gendo'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-lightText italic">Configure Gendo na aba Integrações</span>
                        )}
                      </div>
                      <Input type="number" placeholder={`Meta: >${meta}`} value={faxinas} onChange={e => setFaxinas(e.target.value)}/>
                      {gendoError && (
                        <p className="text-[10px] text-red-500 font-bold">{gendoError}</p>
                      )}
                      {gendoResult && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 space-y-1">
                          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">
                            Gendo: {gendoResult.totalFinalizados} faxinas finalizadas ({gendoResult.periodo})
                          </p>
                          {gendoResult.professionals.map(p => (
                            <button key={p.id_responsavel}
                              onClick={() => setFaxinas(String(p.count))}
                              className="w-full flex justify-between items-center text-[10px] px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                              <span className="text-blue-800 dark:text-blue-300 font-bold">{p.nome_responsavel}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{p.count} faxinas →</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {faxinas !== '' && !isNaN(totalFaxinas) && (
                        <div className="space-y-1">
                          <div className="h-2.5 bg-gray-200 dark:bg-darkBorder rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${metaAtingida ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${progressoPct}%` }}/>
                          </div>
                          <p className={`text-[10px] font-bold text-center ${metaAtingida ? 'text-green-600' : 'text-orange-500'}`}>
                            {metaAtingida ? `✅ Meta batida! (${totalFaxinas}/${meta})` : `⚠ Faltam ${meta - totalFaxinas + 1} faxinas`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Avaliação */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-1.5">
                        <Star size={11} className="text-yellow-500"/> Avaliação dos clientes
                      </label>
                      {mediaDoSistema !== null && (
                        <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-yellow-700 dark:text-yellow-400 font-bold">
                            Sistema: {mediaDoSistema.toFixed(2)}⭐ ({qtdAvaliacoes})
                          </span>
                          <label className="flex items-center gap-1 text-[10px] text-lightText cursor-pointer">
                            <input type="checkbox" checked={usarManual} onChange={e => setUsarManual(e.target.checked)} className="accent-primary w-3 h-3"/>
                            manual
                          </label>
                        </div>
                      )}
                      {(mediaDoSistema === null || usarManual) && (
                        <>
                          <input type="range" min="1" max="5" step="0.1" value={mediaManual}
                            onChange={e => setMediaManual(e.target.value)} className="w-full accent-primary"/>
                          <p className="text-xs font-bold text-center text-primary">{parseFloat(mediaManual).toFixed(1)} ★</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resultado */}
                  {calculo && (
                    <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 space-y-2 border border-gray-200 dark:border-darkBorder">
                      <div className="flex justify-between text-sm">
                        <span className="text-lightText">Salário fixo</span>
                        <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(configBonusLider?.salarioFixo ?? 2800)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-lightText">
                          + Bônus faxinas {calculo.metaAtingida ? `(${totalFaxinas}×${fmt(configBonusLider?.multiplicadorFaxina??3)})` : '(meta não atingida)'}
                        </span>
                        <span className={`font-bold ${calculo.metaAtingida ? 'text-green-600 dark:text-green-400' : 'text-lightText'}`}>
                          {fmt(calculo.valorBonusFaxinas)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-lightText">
                          + Bônus avaliação {calculo.atingiu5estrelas ? '(5⭐!)' : calculo.atingiuMetaAvaliacao ? '(meta atingida)' : '(meta não atingida)'}
                        </span>
                        <span className={`font-bold ${calculo.valorBonusAvaliacao > 0 ? 'text-green-600 dark:text-green-400' : 'text-lightText'}`}>
                          {fmt(calculo.valorBonusAvaliacao)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-darkBorder">
                        <span className="font-bold text-darkText dark:text-darkTextPrimary">💰 Total a receber</span>
                        <span className="text-xl font-bold text-primary">{fmt(calculo.totalReceber)}</span>
                      </div>
                      <Button fullWidth icon={<Save size={14}/>} onClick={() => setShowSaveCal(true)}>
                        Salvar no histórico
                      </Button>
                    </div>
                  )}

                  {/* Histórico de bônus */}
                  {bonusMensal.filter(b => b.colaboradoraId === calcColabId).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-darkText dark:text-darkTextPrimary mb-2 flex items-center gap-1.5">
                        <History size={12} className="text-primary"/> Histórico
                      </p>
                      <div className="space-y-1.5">
                        {[...bonusMensal].filter(b => b.colaboradoraId === calcColabId)
                          .sort((a, b) => b.ano - a.ano || b.mes - a.mes).slice(0, 6)
                          .map(b => (
                            <div key={b.id} className="flex items-center gap-3 bg-gray-50 dark:bg-darkBg rounded-xl px-3 py-2 text-xs">
                              <span className="text-lightText w-16 shrink-0">{MESES[b.mes-1].substring(0,3)}/{b.ano}</span>
                              <span className="text-lightText flex-1">{b.totalFaxinasEquipe} fax · {b.mediaAvaliacaoEquipe.toFixed(1)}⭐</span>
                              <span className="font-bold text-green-600 dark:text-green-400">{fmt(b.totalBonus)}</span>
                              <span className="font-bold text-primary">{fmt(b.totalReceber)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ TAB: CRITÉRIOS ═══ */}
        {tab === 'criterios' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 dark:border-darkBorder flex items-center gap-2">
                <TrendingUp size={15} className="text-primary"/>
                <h3 className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Critérios de Promoção</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-darkBg">
                      <th className="text-left px-4 py-2.5 text-xs font-bold text-lightText uppercase tracking-wide">Campo</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Aux.→Faxineira</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Fax.→Prof.</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Prof.→Líder</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Líder→Gerente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-darkBorder">
                    {[
                      {
                        label: 'Tempo mín. (meses)',
                        jVal: critJ.tempoMinimoMeses, sVal: critS.tempoMinimoMeses, pVal: critP.tempoMinimoMeses, lVal: critL.tempoMinimoMeses,
                        jSet: (v: number) => setCritJ(p => ({...p, tempoMinimoMeses: Math.round(v)})),
                        sSet: (v: number) => setCritS(p => ({...p, tempoMinimoMeses: Math.round(v)})),
                        pSet: (v: number) => setCritP(p => ({...p, tempoMinimoMeses: Math.round(v)})),
                        lSet: (v: number) => setCritL(p => ({...p, tempoMinimoMeses: Math.round(v)})),
                      },
                      {
                        label: 'Meses sem reclamações',
                        jVal: critJ.mesesSemReclamacoes, sVal: critS.mesesSemReclamacoes, pVal: critP.mesesSemReclamacoes, lVal: critL.mesesSemReclamacoes,
                        jSet: (v: number) => setCritJ(p => ({...p, mesesSemReclamacoes: Math.round(v)})),
                        sSet: (v: number) => setCritS(p => ({...p, mesesSemReclamacoes: Math.round(v)})),
                        pSet: (v: number) => setCritP(p => ({...p, mesesSemReclamacoes: Math.round(v)})),
                        lSet: (v: number) => setCritL(p => ({...p, mesesSemReclamacoes: Math.round(v)})),
                      },
                      {
                        label: 'Meses consec. meta',
                        jVal: critJ.mesesConsecutivosMetaBatida, sVal: critS.mesesConsecutivosMetaBatida, pVal: critP.mesesConsecutivosMetaBatida, lVal: critL.mesesConsecutivosMetaBatida,
                        jSet: (v: number) => setCritJ(p => ({...p, mesesConsecutivosMetaBatida: Math.round(v)})),
                        sSet: (v: number) => setCritS(p => ({...p, mesesConsecutivosMetaBatida: Math.round(v)})),
                        pSet: (v: number) => setCritP(p => ({...p, mesesConsecutivosMetaBatida: Math.round(v)})),
                        lSet: (v: number) => setCritL(p => ({...p, mesesConsecutivosMetaBatida: Math.round(v)})),
                      },
                    ].map(({ label, jVal, sVal, pVal, lVal, jSet, sSet, pSet, lSet }) => (
                      <tr key={label} className="hover:bg-gray-50/50 dark:hover:bg-darkBg/50">
                        <td className="px-4 py-2.5 text-sm font-bold text-darkText dark:text-darkTextPrimary">{label}</td>
                        <td className="px-3 py-2"><CellInput value={jVal} onChange={jSet}/></td>
                        <td className="px-3 py-2"><CellInput value={sVal} onChange={sSet}/></td>
                        <td className="px-3 py-2"><CellInput value={pVal} onChange={pSet}/></td>
                        <td className="px-3 py-2"><CellInput value={lVal} onChange={lSet}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Input label="Alterado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
            <Button fullWidth onClick={saveCriterios}>Salvar Critérios</Button>

            {configCriterios.length > 0 && (
              <HistoricoSection>
                {configCriterios.map(c => (
                  <div key={c.id} className="text-xs text-lightText dark:text-darkTextSecondary py-1.5 border-b border-gray-50 dark:border-darkBorder last:border-0">
                    {c.cargoOrigem}: min {c.tempoMinimoMeses} meses, {c.mesesSemReclamacoes} sem recl. · vigência: {fmtDate(c.vigenciaInicio)}{c.vigenciaFim ? ` → ${fmtDate(c.vigenciaFim)}` : ' (atual)'}
                  </div>
                ))}
              </HistoricoSection>
            )}
          </div>
        )}

        {/* ═══ TAB: INTEGRAÇÕES ═══ */}
        {tab === 'integracoes' && (
          <div className="space-y-5">

            {/* Gendo */}
            <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 dark:border-darkBorder flex items-center gap-2">
                <Zap size={15} className="text-primary"/>
                <h3 className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Gendo — Agendamento</h3>
                <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">API disponível</span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-lightText dark:text-darkTextSecondary">
                  Conecte sua conta Gendo para que o sistema busque automaticamente a contagem de faxinas finalizadas de cada colaboradora e pré-preencha o calculador de bônus.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1">
                      Usuário Gendo <span className="font-normal text-lightText">(subdomínio: <em>seuusuario</em>.adm.gendo.app)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: negociosdelimpeza"
                      value={gendoUsername}
                      onChange={e => setGendoUsername(e.target.value)}
                      className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-darkText dark:text-darkTextPrimary mb-1">
                      API Token <span className="font-normal text-lightText">(Gendo → Outras Configurações → API Token)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type={showToken ? 'text' : 'password'}
                        placeholder="eyJh..."
                        value={gendoToken}
                        onChange={e => setGendoToken(e.target.value)}
                        className="flex-1 border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                      />
                      <button onClick={() => setShowToken(v => !v)}
                        className="px-3 py-2 border border-input rounded-xl text-lightText hover:text-darkText dark:hover:text-darkTextPrimary transition-colors">
                        {showToken ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                    <p className="text-[10px] text-lightText dark:text-darkTextSecondary mt-1">
                      Salvo localmente no seu navegador. Não é enviado para nenhum servidor nosso.
                    </p>
                  </div>
                </div>

                <Button onClick={saveGendoConfig} fullWidth>
                  <Save size={14} className="mr-2"/> Salvar Configuração Gendo
                </Button>

                {/* Webhook section */}
                <div className="border-t border-gray-100 dark:border-darkBorder pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-primary"/>
                    <h4 className="font-bold text-sm text-darkText dark:text-darkTextPrimary">Webhook (tempo real)</h4>
                    <span className="text-[10px] text-lightText">(opcional)</span>
                  </div>
                  <p className="text-xs text-lightText dark:text-darkTextSecondary">
                    Configure este URL no Gendo → Outras Configurações → Webhook para receber faxinas finalizadas em tempo real, sem precisar clicar em "Buscar do Gendo":
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-lg px-3 py-2 text-xs text-darkText dark:text-darkTextPrimary font-mono break-all">
                      {webhookUrl}
                    </code>
                    <button onClick={copyWebhook}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 border border-input rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors">
                      {copied ? <CheckCircle size={13}/> : <Copy size={13}/>}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <p className="font-bold">Como configurar no Gendo:</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Acesse <strong>Outras Configurações → Webhook</strong></li>
                      <li>Cole a URL acima no campo <strong>Webhook URL</strong></li>
                      <li>Clique em <strong>Validar e Salvar</strong></li>
                    </ol>
                    <p className="mt-2 text-blue-600 dark:text-blue-400">
                      A cada atendimento finalizado no Gendo, o sistema registrará a faxina automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Como usar */}
            <div className="bg-gray-50 dark:bg-darkBg rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-3">
              <h4 className="font-bold text-sm text-darkText dark:text-darkTextPrimary flex items-center gap-2">
                <Info size={14} className="text-primary"/> Como usar a integração
              </h4>
              <ol className="text-xs text-lightText dark:text-darkTextSecondary space-y-2 list-decimal pl-4">
                <li>Configure o usuário e token Gendo acima e salve.</li>
                <li>Na aba <strong>Bônus / Líder</strong>, selecione a Líder e o mês desejado.</li>
                <li>Clique no botão <strong>Gendo</strong> (ao lado de "Faxinas da equipe").</li>
                <li>O sistema busca todos os atendimentos finalizados no Gendo para o período e exibe a contagem por profissional.</li>
                <li>Clique no nome da colaboradora para pré-preencher o campo de faxinas.</li>
                <li>Confira a avaliação e clique em <strong>Calcular e Salvar</strong>.</li>
              </ol>
            </div>

          </div>
        )}
      </div>

      {/* Modal confirmação de alteração de configuração */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmar Alteração">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-darkText dark:text-darkTextPrimary">
            Esses valores serão usados a partir de agora. Uma nova versão será criada e o histórico anterior será preservado.
          </p>
        </div>
        <Input label="Confirmado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
        <div className="flex gap-3 mt-5">
          <Button variant="outline" fullWidth onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button fullWidth onClick={handleConfirm}>Confirmar e Salvar</Button>
        </div>
      </Modal>

      {/* Modal salvar cálculo no histórico */}
      <Modal isOpen={showSaveCal} onClose={() => setShowSaveCal(false)} title="Salvar no Histórico">
        <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4">
          Confirme antes de salvar. Registros não podem ser editados depois.
        </p>
        {calculo && (
          <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 text-sm space-y-2 mb-4">
            <div className="flex justify-between"><span className="text-lightText">Líder:</span><span className="font-bold">{lider?.nome}</span></div>
            <div className="flex justify-between"><span className="text-lightText">Período:</span><span className="font-bold">{MESES[calcMes-1]}/{calcAno}</span></div>
            <div className="flex justify-between"><span className="text-lightText">Faxinas:</span><span className="font-bold">{totalFaxinas}</span></div>
            <div className="flex justify-between"><span className="text-lightText">Avaliação:</span><span className="font-bold">{mediaEfetiva.toFixed(2)} ⭐</span></div>
            <div className="flex justify-between border-t pt-2 dark:border-darkBorder">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-primary text-lg">{fmt(calculo.totalReceber)}</span>
            </div>
          </div>
        )}
        <Input label="Registrado por (opcional)" value={regPor} onChange={e => setRegPor(e.target.value)} />
        <div className="flex gap-3 mt-4">
          <Button variant="outline" fullWidth onClick={() => setShowSaveCal(false)}>Cancelar</Button>
          <Button fullWidth onClick={handleSaveCalculo}>Confirmar</Button>
        </div>
      </Modal>
    </Layout>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const TrendingUp2: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

const HistoricoSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <details className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder">
    <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide flex items-center gap-2 select-none">
      <History size={14}/> Histórico de alterações
    </summary>
    <div className="px-4 pb-3 pt-1">{children}</div>
  </details>
);

