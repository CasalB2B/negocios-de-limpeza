import React, { useState, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import { DollarSign, Calculator, Star, CheckCircle, Save, History } from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const AdminRHBonus: React.FC = () => {
  const { colaboradoras, bonusMensal, configBonusLider, calcularBonus, addBonusMensal } = useRH();

  const lideres = useMemo(() => colaboradoras.filter(c => c.cargoAtual === CargoRH.LIDER && c.status === 'ATIVA'), [colaboradoras]);

  const now = new Date();
  const [faxinas, setFaxinas] = useState('');
  const [mediaAval, setMediaAval] = useState('');
  const [colaboradoraId, setColaboradoraId] = useState(lideres[0]?.id || '');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [showSave, setShowSave] = useState(false);
  const [registradoPor, setRegistradoPor] = useState('');

  const calculo = useMemo(() => {
    const f = parseFloat(faxinas);
    const a = parseFloat(mediaAval);
    if (isNaN(f) || isNaN(a)) return null;
    return calcularBonus(f, a);
  }, [faxinas, mediaAval, calcularBonus]);

  const handleSaveBonus = async () => {
    if (!calculo || !colaboradoraId || !configBonusLider) return;
    await addBonusMensal({
      colaboradoraId,
      mes, ano,
      totalFaxinasEquipe: parseFloat(faxinas),
      mediaAvaliacaoEquipe: parseFloat(mediaAval),
      valorBonusFaxinas: calculo.valorBonusFaxinas,
      valorBonusAvaliacao: calculo.valorBonusAvaliacao,
      totalBonus: calculo.totalBonus,
      totalReceber: calculo.totalReceber,
      configuracaoId: configBonusLider.id,
    });
    setShowSave(false);
    setFaxinas('');
    setMediaAval('');
    alert('Bônus registrado com sucesso!');
  };

  const getColabNome = (id: string) => colaboradoras.find(c => c.id === id)?.nome ?? '—';

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Calculadora de Bônus</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">Cálculo de bônus para Líder de Equipe</p>
        </div>

        {/* Config vigente */}
        {configBonusLider && (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Configuração Vigente</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-lightText dark:text-darkTextSecondary text-xs">Salário fixo</p><p className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(configBonusLider.salarioFixo)}</p></div>
              <div><p className="text-lightText dark:text-darkTextSecondary text-xs">Multiplicador/faxina</p><p className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(configBonusLider.multiplicadorFaxina)}</p></div>
              <div><p className="text-lightText dark:text-darkTextSecondary text-xs">Bônus de avaliação</p><p className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(configBonusLider.bonusAvaliacao)}</p></div>
              <div><p className="text-lightText dark:text-darkTextSecondary text-xs">Meta de avaliação</p><p className="font-bold text-darkText dark:text-darkTextPrimary">≥ {configBonusLider.metaAvaliacao.toFixed(1)} ⭐</p></div>
            </div>
          </div>
        )}

        {/* Calculator */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-4">
          <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Calculator size={18} className="text-primary"/> Calculadora</h2>

          {lideres.length === 0 ? (
            <p className="text-sm text-lightText dark:text-darkTextSecondary">Nenhuma Líder de Equipe ativa cadastrada.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Líder</label>
                <select value={colaboradoraId} onChange={e => setColaboradoraId(e.target.value)}
                  className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Mês</label>
                  <select value={mes} onChange={e => setMes(Number(e.target.value))}
                    className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <Input label="Ano" type="number" value={String(ano)} onChange={e => setAno(Number(e.target.value))} />
              </div>
              <Input
                label="Total de faxinas da equipe no mês"
                type="number"
                placeholder="ex: 24"
                value={faxinas}
                onChange={e => setFaxinas(e.target.value)}
                icon={<Calculator size={16}/>}
              />
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Média de avaliação da equipe</label>
                <input type="range" min="1" max="5" step="0.1" value={mediaAval || 4.5}
                  onChange={e => setMediaAval(e.target.value)}
                  className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-lightText mt-1">
                  <span>1.0</span>
                  <span className="font-bold text-primary">{mediaAval ? parseFloat(mediaAval).toFixed(1) : '—'}</span>
                  <span>5.0</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Resultado */}
        {calculo && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-4">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><DollarSign size={18} className="text-green-500"/> Resultado</h2>

            <div className="space-y-3">
              <ResultRow label="Salário fixo" value={fmt(configBonusLider?.salarioFixo ?? 2200)} neutral />
              <ResultRow label={`Bônus faxinas (${faxinas} × ${fmt(configBonusLider?.multiplicadorFaxina ?? 3)})`} value={fmt(calculo.valorBonusFaxinas)} />
              <ResultRow
                label={`Bônus avaliação (${calculo.atingiuMetaAvaliacao ? '✓ meta atingida' : '✗ meta não atingida'})`}
                value={fmt(calculo.valorBonusAvaliacao)}
                highlight={calculo.atingiuMetaAvaliacao}
              />
              <div className="border-t border-gray-100 dark:border-darkBorder pt-3">
                <ResultRow label="Total bônus" value={fmt(calculo.totalBonus)} />
                <div className="flex items-center justify-between mt-3 bg-primary/5 dark:bg-primary/10 rounded-xl p-3">
                  <span className="font-bold text-darkText dark:text-darkTextPrimary">Total a receber</span>
                  <span className="text-xl font-bold text-primary">{fmt(calculo.totalReceber)}</span>
                </div>
              </div>
            </div>

            {calculo.atingiuMetaAvaliacao ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                <CheckCircle size={16}/> Meta de avaliação atingida — bônus de {fmt(configBonusLider?.bonusAvaliacao ?? 150)} incluído!
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-600 text-sm">
                <Star size={16}/> Média {parseFloat(mediaAval).toFixed(1)} — precisa ≥ {configBonusLider?.metaAvaliacao.toFixed(1)} para o bônus de avaliação.
              </div>
            )}

            <Button fullWidth icon={<Save size={16}/>} onClick={() => setShowSave(true)}>Salvar no histórico</Button>
          </div>
        )}

        {/* Histórico */}
        {bonusMensal.length > 0 && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2 mb-4">
              <History size={18} className="text-primary"/> Histórico de Bônus
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 dark:border-darkBorder">
                  <th className="text-left px-3 py-2 text-xs font-bold text-lightText uppercase">Líder</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-lightText uppercase">Mês/Ano</th>
                  <th className="text-center px-3 py-2 text-xs font-bold text-lightText uppercase">Faxinas</th>
                  <th className="text-right px-3 py-2 text-xs font-bold text-lightText uppercase">Bônus</th>
                  <th className="text-right px-3 py-2 text-xs font-bold text-lightText uppercase">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50 dark:divide-darkBorder">
                  {[...bonusMensal].sort((a,b) => b.ano - a.ano || b.mes - a.mes).map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-darkBg">
                      <td className="px-3 py-2.5 font-medium text-darkText dark:text-darkTextPrimary">{getColabNome(b.colaboradoraId)}</td>
                      <td className="px-3 py-2.5 text-center text-lightText dark:text-darkTextSecondary">{MESES[b.mes-1].substring(0,3)}/{b.ano}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-darkText dark:text-darkTextPrimary">{b.totalFaxinasEquipe}</td>
                      <td className="px-3 py-2.5 text-right text-green-600 font-bold">{fmt(b.totalBonus)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary">{fmt(b.totalReceber)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal confirmação salvar */}
        <Modal isOpen={showSave} onClose={() => setShowSave(false)} title="Salvar Bônus">
          <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4">
            Confirme os dados antes de salvar no histórico. Este registro não pode ser alterado depois.
          </p>
          <Input label="Registrado por" value={registradoPor} onChange={e => setRegistradoPor(e.target.value)} />
          {calculo && (
            <div className="mt-4 bg-gray-50 dark:bg-darkBg rounded-xl p-4 text-sm space-y-1">
              <p><span className="text-lightText">Líder:</span> <span className="font-bold text-darkText dark:text-darkTextPrimary">{getColabNome(colaboradoraId)}</span></p>
              <p><span className="text-lightText">Mês:</span> <span className="font-bold text-darkText dark:text-darkTextPrimary">{MESES[mes-1]}/{ano}</span></p>
              <p><span className="text-lightText">Total a receber:</span> <span className="font-bold text-primary">{fmt(calculo.totalReceber)}</span></p>
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <Button variant="outline" fullWidth onClick={() => setShowSave(false)}>Cancelar</Button>
            <Button fullWidth onClick={handleSaveBonus}>Confirmar</Button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

// ─── Sub-component ─────────────────────────────────────────────────────────────
const ResultRow: React.FC<{ label: string; value: string; neutral?: boolean; highlight?: boolean }> = ({ label, value, neutral, highlight }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${neutral ? 'text-lightText dark:text-darkTextSecondary' : 'text-darkText dark:text-darkTextPrimary'}`}>{label}</span>
    <span className={`font-bold text-sm ${highlight ? 'text-green-600' : neutral ? 'text-lightText dark:text-darkTextSecondary' : 'text-darkText dark:text-darkTextPrimary'}`}>{value}</span>
  </div>
);
