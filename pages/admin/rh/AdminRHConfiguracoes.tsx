import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { Settings, DollarSign, Award, History, AlertTriangle, CheckCircle } from 'lucide-react';

const TAB_KEYS = ['remuneracao', 'bonus', 'criterios'] as const;
type Tab = typeof TAB_KEYS[number];
const TAB_LABELS: Record<Tab, string> = { remuneracao: 'Remuneração', bonus: 'Bônus / Líder', criterios: 'Critérios de Promoção' };

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export const AdminRHConfiguracoes: React.FC = () => {
  const { configBonusLider, historicoConfigBonus, configRemuneracao, configCriterios, updateConfigBonusLider, updateConfigRemuneracao, updateConfigCriterios } = useRH();
  const [tab, setTab] = useState<Tab>('remuneracao');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);
  const [alteradoPor, setAlteradoPor] = useState('');
  const [saved, setSaved] = useState(false);

  // ── Remuneração state ───────────────────────────────────────────────────────
  const remJunior = configRemuneracao.find(r => r.cargo === 'JUNIOR');
  const remSenior = configRemuneracao.find(r => r.cargo === 'SENIOR');
  const remProf = configRemuneracao.find(r => r.cargo === 'PROFISSIONAL');

  const [remJ, setRemJ] = useState({ diaria4h: 80, diaria6h: 120, diaria8h: 140, passagem: 10.20 });
  const [remS, setRemS] = useState({ diaria4h: 85, diaria6h: 130, diaria8h: 150, passagem: 10.20 });
  const [remP, setRemP] = useState({ diaria4h: 90, diaria6h: 140, diaria8h: 160, passagem: 10.20 });

  useEffect(() => {
    if (remJunior) setRemJ({ diaria4h: remJunior.diaria4h, diaria6h: remJunior.diaria6h, diaria8h: remJunior.diaria8h, passagem: remJunior.passagem });
  }, [remJunior?.id]);
  useEffect(() => {
    if (remSenior) setRemS({ diaria4h: remSenior.diaria4h, diaria6h: remSenior.diaria6h, diaria8h: remSenior.diaria8h, passagem: remSenior.passagem });
  }, [remSenior?.id]);
  useEffect(() => {
    if (remProf) setRemP({ diaria4h: remProf.diaria4h, diaria6h: remProf.diaria6h, diaria8h: remProf.diaria8h, passagem: remProf.passagem });
  }, [remProf?.id]);

  // ── Bônus state ─────────────────────────────────────────────────────────────
  const [bonusCfg, setBonusCfg] = useState({
    salarioFixo: 2200, multiplicadorFaxina: 3, bonusAvaliacao: 150, metaAvaliacao: 4.5, metaFaxinasMes: 100,
  });
  useEffect(() => {
    if (configBonusLider) setBonusCfg({ salarioFixo: configBonusLider.salarioFixo, multiplicadorFaxina: configBonusLider.multiplicadorFaxina, bonusAvaliacao: configBonusLider.bonusAvaliacao, metaAvaliacao: configBonusLider.metaAvaliacao, metaFaxinasMes: configBonusLider.metaFaxinasMes });
  }, [configBonusLider?.id]);

  // ── Critérios state ─────────────────────────────────────────────────────────
  const getCrit = (cargo: CargoRH) => configCriterios.find(c => c.cargoOrigem === cargo);
  const [critJ, setCritJ] = useState({ tempoMinimoMeses: 6, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1 });
  const [critS, setCritS] = useState({ tempoMinimoMeses: 12, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1 });
  const [critP, setCritP] = useState({ tempoMinimoMeses: 18, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1 });
  const [critL, setCritL] = useState({ tempoMinimoMeses: 36, mesesSemReclamacoes: 6, mesesConsecutivosMetaBatida: 3 });

  useEffect(() => {
    const j = getCrit(CargoRH.JUNIOR); if (j) setCritJ({ tempoMinimoMeses: j.tempoMinimoMeses, mesesSemReclamacoes: j.mesesSemReclamacoes, mesesConsecutivosMetaBatida: j.mesesConsecutivosMetaBatida });
    const s = getCrit(CargoRH.SENIOR); if (s) setCritS({ tempoMinimoMeses: s.tempoMinimoMeses, mesesSemReclamacoes: s.mesesSemReclamacoes, mesesConsecutivosMetaBatida: s.mesesConsecutivosMetaBatida });
    const p = getCrit(CargoRH.PROFISSIONAL); if (p) setCritP({ tempoMinimoMeses: p.tempoMinimoMeses, mesesSemReclamacoes: p.mesesSemReclamacoes, mesesConsecutivosMetaBatida: p.mesesConsecutivosMetaBatida });
    const l = getCrit(CargoRH.LIDER); if (l) setCritL({ tempoMinimoMeses: l.tempoMinimoMeses, mesesSemReclamacoes: l.mesesSemReclamacoes, mesesConsecutivosMetaBatida: l.mesesConsecutivosMetaBatida });
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
      { cargo: 'JUNIOR', ...remJ, vigenciaInicio: hoje, alteradoPor },
      { cargo: 'SENIOR', ...remS, vigenciaInicio: hoje, alteradoPor },
      { cargo: 'PROFISSIONAL', ...remP, vigenciaInicio: hoje, alteradoPor },
    ]);
  });

  const saveBonus = () => askConfirm(async () => {
    await updateConfigBonusLider({
      ...bonusCfg,
      vigenciaInicio: new Date().toISOString().split('T')[0],
      alteradoPor,
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

  const NumInput = ({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) => (
    <div>
      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1">{label}</label>
      <div className="flex items-center border border-input bg-background dark:bg-darkBg rounded-xl overflow-hidden">
        {prefix && <span className="px-3 py-2 text-sm text-lightText bg-gray-50 dark:bg-darkBg border-r border-input">{prefix}</span>}
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step="0.01"
          className="flex-1 px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary'}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab: Remuneração */}
        {tab === 'remuneracao' && (
          <div className="space-y-4">
            {/* Júnior */}
            <Section title="Faxineira Júnior" icon={<DollarSign size={16}/>}>
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="Diária 4h" value={remJ.diaria4h} onChange={v => setRemJ(p => ({...p, diaria4h: v}))} prefix="R$" />
                <NumInput label="Diária 6h" value={remJ.diaria6h} onChange={v => setRemJ(p => ({...p, diaria6h: v}))} prefix="R$" />
                <NumInput label="Diária 8h" value={remJ.diaria8h} onChange={v => setRemJ(p => ({...p, diaria8h: v}))} prefix="R$" />
                <NumInput label="Passagem" value={remJ.passagem} onChange={v => setRemJ(p => ({...p, passagem: v}))} prefix="R$" />
              </div>
            </Section>

            {/* Sênior */}
            <Section title="Faxineira Sênior" icon={<DollarSign size={16}/>}>
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="Diária 4h" value={remS.diaria4h} onChange={v => setRemS(p => ({...p, diaria4h: v}))} prefix="R$" />
                <NumInput label="Diária 6h" value={remS.diaria6h} onChange={v => setRemS(p => ({...p, diaria6h: v}))} prefix="R$" />
                <NumInput label="Diária 8h" value={remS.diaria8h} onChange={v => setRemS(p => ({...p, diaria8h: v}))} prefix="R$" />
                <NumInput label="Passagem" value={remS.passagem} onChange={v => setRemS(p => ({...p, passagem: v}))} prefix="R$" />
              </div>
            </Section>

            {/* Profissional */}
            <Section title="Faxineira Profissional" icon={<DollarSign size={16}/>}>
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="Diária 4h" value={remP.diaria4h} onChange={v => setRemP(p => ({...p, diaria4h: v}))} prefix="R$" />
                <NumInput label="Diária 6h" value={remP.diaria6h} onChange={v => setRemP(p => ({...p, diaria6h: v}))} prefix="R$" />
                <NumInput label="Diária 8h" value={remP.diaria8h} onChange={v => setRemP(p => ({...p, diaria8h: v}))} prefix="R$" />
                <NumInput label="Passagem" value={remP.passagem} onChange={v => setRemP(p => ({...p, passagem: v}))} prefix="R$" />
              </div>
            </Section>

            <MetaInfo label="Líder de Equipe" info={`Salário fixo: ${fmt(bonusCfg.salarioFixo)} + bônus. Configure na aba "Bônus / Líder".`} />
            <MetaInfo label="Gerente de Equipe" info="Salário R$ 3.000–R$ 3.500 + bônus (multiplicador a definir nas negociações)." />

            <Input label="Alterado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
            <Button fullWidth onClick={saveRemuneracao}>Salvar Remuneração</Button>

            {/* Histórico simplificado */}
            {configRemuneracao.length > 0 && (
              <HistoricoSection>
                {configRemuneracao.map(r => (
                  <div key={r.id} className="flex justify-between text-xs text-lightText dark:text-darkTextSecondary py-1.5 border-b border-gray-50 dark:border-darkBorder last:border-0">
                    <span>{r.cargo} · vigência: {fmtDate(r.vigenciaInicio)}{r.vigenciaFim ? ` → ${fmtDate(r.vigenciaFim)}` : ' (atual)'}</span>
                    <span>4h={fmt(r.diaria4h)} 6h={fmt(r.diaria6h)} 8h={fmt(r.diaria8h)}</span>
                  </div>
                ))}
              </HistoricoSection>
            )}
          </div>
        )}

        {/* Tab: Bônus / Líder */}
        {tab === 'bonus' && (
          <div className="space-y-4">
            <Section title="Líder de Equipe — Cálculo de Bônus" icon={<Award size={16}/>}>
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="Salário fixo" value={bonusCfg.salarioFixo} onChange={v => setBonusCfg(p => ({...p, salarioFixo: v}))} prefix="R$" />
                <NumInput label="Multiplicador por faxina" value={bonusCfg.multiplicadorFaxina} onChange={v => setBonusCfg(p => ({...p, multiplicadorFaxina: v}))} prefix="R$" />
                <NumInput label="Bônus de avaliação" value={bonusCfg.bonusAvaliacao} onChange={v => setBonusCfg(p => ({...p, bonusAvaliacao: v}))} prefix="R$" />
                <NumInput label="Meta de avaliação mínima" value={bonusCfg.metaAvaliacao} onChange={v => setBonusCfg(p => ({...p, metaAvaliacao: v}))} />
                <NumInput label="Meta de faxinas/mês (equipe)" value={bonusCfg.metaFaxinasMes} onChange={v => setBonusCfg(p => ({...p, metaFaxinasMes: Math.round(v)}))} />
              </div>

              {/* Preview do cálculo */}
              <div className="mt-3 bg-gray-50 dark:bg-darkBg rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-darkText dark:text-darkTextPrimary mb-2">Preview do cálculo (com {bonusCfg.metaFaxinasMes} faxinas e avaliação ≥ meta):</p>
                <p className="text-lightText">Bônus faxinas: {bonusCfg.metaFaxinasMes} × {fmt(bonusCfg.multiplicadorFaxina)} = <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(bonusCfg.metaFaxinasMes * bonusCfg.multiplicadorFaxina)}</span></p>
                <p className="text-lightText">+ Bônus avaliação: <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(bonusCfg.bonusAvaliacao)}</span></p>
                <p className="text-lightText">= Total bônus: <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(bonusCfg.metaFaxinasMes * bonusCfg.multiplicadorFaxina + bonusCfg.bonusAvaliacao)}</span></p>
                <p className="text-lightText font-bold border-t border-gray-200 dark:border-darkBorder pt-1 mt-1">Total a receber: <span className="text-primary">{fmt(bonusCfg.salarioFixo + bonusCfg.metaFaxinasMes * bonusCfg.multiplicadorFaxina + bonusCfg.bonusAvaliacao)}</span></p>
              </div>
            </Section>

            <Input label="Alterado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
            <Button fullWidth onClick={saveBonus}>Salvar Configuração de Bônus</Button>

            {historicoConfigBonus.length > 1 && (
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
            )}
          </div>
        )}

        {/* Tab: Critérios */}
        {tab === 'criterios' && (
          <div className="space-y-4">
            {([
              { label: 'Júnior → Sênior', state: critJ, setter: setCritJ },
              { label: 'Sênior → Profissional', state: critS, setter: setCritS },
              { label: 'Profissional → Líder', state: critP, setter: setCritP },
              { label: 'Líder → Gerente', state: critL, setter: setCritL },
            ] as const).map(({ label, state, setter }) => (
              <Section key={label} title={label} icon={<Award size={16}/>}>
                <div className="grid grid-cols-2 gap-3">
                  <NumInput label="Tempo mínimo (meses)" value={state.tempoMinimoMeses} onChange={v => setter((p: any) => ({...p, tempoMinimoMeses: Math.round(v)}))} />
                  <NumInput label="Meses sem reclamações" value={state.mesesSemReclamacoes} onChange={v => setter((p: any) => ({...p, mesesSemReclamacoes: Math.round(v)}))} />
                  <NumInput label="Meses consecutivos batendo meta" value={state.mesesConsecutivosMetaBatida} onChange={v => setter((p: any) => ({...p, mesesConsecutivosMetaBatida: Math.round(v)}))} />
                </div>
              </Section>
            ))}

            <Input label="Alterado por" value={alteradoPor} onChange={e => setAlteradoPor(e.target.value)} />
            <Button fullWidth onClick={saveCriterios}>Salvar Critérios</Button>

            {configCriterios.length > 0 && (
              <HistoricoSection>
                {configCriterios.map(c => (
                  <div key={c.id} className="text-xs text-lightText dark:text-darkTextSecondary py-1.5 border-b border-gray-50 dark:border-darkBorder last:border-0">
                    <span>{c.cargoOrigem}: min {c.tempoMinimoMeses} meses, {c.mesesSemReclamacoes} sem recl. · vigência: {fmtDate(c.vigenciaInicio)}{c.vigenciaFim ? ` → ${fmtDate(c.vigenciaFim)}` : ' (atual)'}</span>
                  </div>
                ))}
              </HistoricoSection>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmação */}
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
    </Layout>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-3">
    <h3 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2 text-sm">
      <span className="text-primary">{icon}</span>{title}
    </h3>
    {children}
  </div>
);

const MetaInfo: React.FC<{ label: string; info: string }> = ({ label, info }) => (
  <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3 text-sm">
    <p className="font-bold text-darkText dark:text-darkTextPrimary">{label}</p>
    <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">{info}</p>
  </div>
);

const HistoricoSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <details className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder">
    <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide flex items-center gap-2 select-none">
      <History size={14}/> Histórico de alterações
    </summary>
    <div className="px-4 pb-3 pt-1">{children}</div>
  </details>
);
