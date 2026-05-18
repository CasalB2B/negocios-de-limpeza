import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  DollarSign, Calculator, Star, CheckCircle, Save, History,
  Target, Award, AlertCircle, Info, Settings, TrendingUp, X,
} from 'lucide-react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const AdminRHBonus: React.FC = () => {
  const navigate = useNavigate();
  const {
    colaboradoras, bonusMensal, configBonusLider,
    calcularBonus, addBonusMensal, getMediaAvaliacoesMes, avaliacoes,
  } = useRH();

  const lideres = useMemo(
    () => colaboradoras.filter(c => c.cargoAtual === CargoRH.LIDER && c.status === 'ATIVA'),
    [colaboradoras],
  );

  const now = new Date();
  const [colaboradoraId, setColaboradoraId] = useState(() => lideres[0]?.id || '');
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [ano, setAno]   = useState(now.getFullYear());
  const [faxinas, setFaxinas]         = useState('');
  const [mediaManual, setMediaManual] = useState('4.5');
  const [usarManual, setUsarManual]   = useState(false);
  const [showSave, setShowSave]       = useState(false);
  const [registradoPor, setRegistradoPor] = useState('');

  const cfg = configBonusLider;
  const meta = cfg?.metaFaxinasMes ?? 100;

  // ── Avaliações do sistema para o período ──────────────────────────────────
  const mediaDoSistema = useMemo(
    () => (colaboradoraId ? getMediaAvaliacoesMes(colaboradoraId, mes, ano) : null),
    [colaboradoraId, mes, ano, getMediaAvaliacoesMes],
  );

  const qtdAvaliacoes = useMemo(() => {
    if (!colaboradoraId) return 0;
    const ini = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);
    return avaliacoes.filter(a => {
      if (a.colaboradoraId !== colaboradoraId) return false;
      const d = new Date(a.createdAt);
      return d >= ini && d <= fim;
    }).length;
  }, [colaboradoraId, mes, ano, avaliacoes]);

  const mediaEfetiva = usarManual || mediaDoSistema === null
    ? parseFloat(mediaManual)
    : mediaDoSistema;

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const totalFaxinas  = parseFloat(faxinas);
  const metaAtingida  = !isNaN(totalFaxinas) && totalFaxinas > meta;
  const progressoPct  = isNaN(totalFaxinas) ? 0 : Math.min(100, (totalFaxinas / meta) * 100);

  const calculo = useMemo(() => {
    if (isNaN(totalFaxinas) || isNaN(mediaEfetiva) || totalFaxinas < 0) return null;
    return calcularBonus(totalFaxinas, mediaEfetiva);
  }, [totalFaxinas, mediaEfetiva, calcularBonus]);

  // ── Salvar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!calculo || !colaboradoraId || !cfg) return;
    await addBonusMensal({
      colaboradoraId, mes, ano,
      totalFaxinasEquipe:   totalFaxinas,
      mediaAvaliacaoEquipe: mediaEfetiva,
      valorBonusFaxinas:    calculo.valorBonusFaxinas,
      valorBonusAvaliacao:  calculo.valorBonusAvaliacao,
      totalBonus:           calculo.totalBonus,
      totalReceber:         calculo.totalReceber,
      configuracaoId:       cfg.id,
    });
    setShowSave(false);
    setFaxinas('');
  };

  const lider = colaboradoras.find(c => c.id === colaboradoraId);
  const getColabNome = (id: string) => colaboradoras.find(c => c.id === id)?.nome ?? '—';

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5 max-w-3xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Bônus — Líder de Equipe</h1>
            <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">
              Calcule e registre o bônus mensal com base na performance da equipe
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/rh/configuracoes')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-darkBorder rounded-xl text-xs font-bold text-lightText hover:text-primary hover:border-primary transition-colors shrink-0"
          >
            <Settings size={13}/> Config. Bônus
          </button>
        </div>

        {/* ── Card de configuração vigente ── */}
        {cfg && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Award size={12}/> Configuração Vigente
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { label: 'Salário fixo',           value: fmt(cfg.salarioFixo) },
                { label: `Meta equipe`,             value: `>${cfg.metaFaxinasMes} faxinas` },
                { label: `× por faxina`,            value: fmt(cfg.multiplicadorFaxina) },
                { label: `Bônus ≥${cfg.metaAvaliacao}⭐`, value: fmt(cfg.bonusAvaliacao) },
                { label: 'Bônus 5⭐',              value: fmt(cfg.bonusAvaliacao5estrelas ?? cfg.bonusAvaliacao * 2) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-darkSurface rounded-xl p-2.5 border border-primary/10 text-center">
                  <p className="text-[10px] text-lightText dark:text-darkTextSecondary leading-tight">{label}</p>
                  <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Calculadora ── */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-5">
          <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
            <Calculator size={17} className="text-primary"/> Calculadora
          </h2>

          {lideres.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
              <AlertCircle size={15} className="shrink-0"/>
              Nenhuma Líder de Equipe ativa cadastrada. Cadastre em Colaboradoras.
            </div>
          ) : (
            <>
              {/* Líder + mês */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Líder</label>
                  <select
                    value={colaboradoraId}
                    onChange={e => setColaboradoraId(e.target.value)}
                    className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Mês / Ano</label>
                  <div className="flex gap-1.5">
                    <select
                      value={mes}
                      onChange={e => setMes(Number(e.target.value))}
                      className="flex-1 border border-input bg-background dark:bg-darkBg rounded-xl px-2 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {MESES.map((m, i) => <option key={i+1} value={i+1}>{m.substring(0,3)}</option>)}
                    </select>
                    <input
                      type="number"
                      value={ano}
                      onChange={e => setAno(Number(e.target.value))}
                      className="w-20 border border-input bg-background dark:bg-darkBg rounded-xl px-2 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* ── Card: Faxinas ── */}
              <div className="bg-gray-50 dark:bg-darkBg rounded-2xl p-4 space-y-3 border border-gray-200 dark:border-darkBorder">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-primary" />
                  <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Faxinas da Equipe no Mês</p>
                  <span className="ml-auto text-[10px] text-lightText dark:text-darkTextSecondary">
                    Meta: &gt;{meta} faxinas
                  </span>
                </div>

                <Input
                  type="number"
                  placeholder={`Quantas faxinas a equipe fez em ${MESES[mes-1]}?`}
                  value={faxinas}
                  onChange={e => setFaxinas(e.target.value)}
                />

                {/* Barra de progresso */}
                {faxinas !== '' && !isNaN(totalFaxinas) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-lightText dark:text-darkTextSecondary">0</span>
                      <span className={`font-bold ${metaAtingida ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
                        {totalFaxinas} faxinas {metaAtingida ? '✅' : ''}
                      </span>
                      <span className="text-lightText dark:text-darkTextSecondary">{meta}</span>
                    </div>
                    <div className="h-3.5 bg-gray-200 dark:bg-darkBorder rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${metaAtingida ? 'bg-green-500' : 'bg-orange-400'}`}
                        style={{ width: `${progressoPct}%` }}
                      />
                    </div>
                    <p className={`text-xs font-bold text-center py-1 rounded-xl ${
                      metaAtingida
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                    }`}>
                      {metaAtingida
                        ? `🎯 Meta batida! ${totalFaxinas} × ${fmt(cfg?.multiplicadorFaxina ?? 3)} = ${fmt(totalFaxinas * (cfg?.multiplicadorFaxina ?? 3))} de bônus`
                        : `Faltam ${meta - totalFaxinas + 1} faxinas para bater a meta — sem bônus de faxinas`}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Card: Avaliação ── */}
              <div className="bg-gray-50 dark:bg-darkBg rounded-2xl p-4 space-y-3 border border-gray-200 dark:border-darkBorder">
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-yellow-500" />
                  <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Avaliação dos Clientes</p>
                </div>

                {/* Avaliação do sistema */}
                {mediaDoSistema !== null ? (
                  <div className="flex items-center gap-3 bg-white dark:bg-darkSurface rounded-xl p-3 border border-gray-200 dark:border-darkBorder">
                    <div className="flex-1">
                      <p className="text-[11px] text-lightText dark:text-darkTextSecondary">
                        Do sistema · {qtdAvaliacoes} avaliação{qtdAvaliacoes !== 1 ? 'ões' : ''} em {MESES[mes-1]}/{ano}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xl font-bold text-darkText dark:text-darkTextPrimary">
                          {mediaDoSistema.toFixed(2)}
                        </p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={14}
                              className={s <= Math.round(mediaDoSistema)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-200 dark:text-gray-700'}
                            />
                          ))}
                        </div>
                        {mediaDoSistema >= 4.9 && (
                          <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                            5 ⭐ Bônus dobrado!
                          </span>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-lightText dark:text-darkTextSecondary cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={usarManual}
                        onChange={e => setUsarManual(e.target.checked)}
                        className="accent-primary w-3.5 h-3.5"
                      />
                      Usar outro valor
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-lightText dark:text-darkTextSecondary bg-white dark:bg-darkSurface rounded-xl p-3 border border-gray-200 dark:border-darkBorder">
                    <Info size={13} className="shrink-0" />
                    Sem avaliações no sistema para {MESES[mes-1]}/{ano}. Insira manualmente abaixo.
                  </div>
                )}

                {/* Slider manual */}
                {(mediaDoSistema === null || usarManual) && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-darkText dark:text-darkTextPrimary block">
                      Média manual (1,0 – 5,0)
                    </label>
                    <input
                      type="range" min="1" max="5" step="0.1"
                      value={mediaManual}
                      onChange={e => setMediaManual(e.target.value)}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-lightText dark:text-darkTextSecondary">
                      <span>1,0 ★</span>
                      <span className="font-bold text-primary text-sm">
                        {parseFloat(mediaManual).toFixed(1)} ★
                        {parseFloat(mediaManual) >= 4.9 && ' — 5⭐ Dobrado!'}
                      </span>
                      <span>5,0 ★</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Resultado ── */}
        {calculo && cfg && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-4">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2">
              <DollarSign size={18} className="text-green-500"/>
              Resultado — {lider?.nome} · {MESES[mes-1]}/{ano}
            </h2>

            <div className="space-y-0">
              {/* Salário fixo */}
              <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-darkBorder">
                <span className="text-sm text-lightText dark:text-darkTextSecondary">Salário fixo</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(cfg.salarioFixo)}</span>
              </div>

              {/* Bônus faxinas */}
              <div className="flex items-start justify-between py-3 border-b border-gray-50 dark:border-darkBorder">
                <div>
                  <span className="text-sm text-darkText dark:text-darkTextPrimary">+ Bônus faxinas</span>
                  <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">
                    {calculo.metaAtingida
                      ? `${totalFaxinas} faxinas × ${fmt(cfg.multiplicadorFaxina)}`
                      : `Meta não atingida (${totalFaxinas} / ${meta})`}
                  </p>
                </div>
                <span className={`font-bold text-sm ${calculo.metaAtingida ? 'text-green-600 dark:text-green-400' : 'text-lightText dark:text-darkTextSecondary'}`}>
                  {calculo.metaAtingida ? fmt(calculo.valorBonusFaxinas) : 'R$ 0,00'}
                </span>
              </div>

              {/* Bônus avaliação */}
              <div className="flex items-start justify-between py-3 border-b border-gray-50 dark:border-darkBorder">
                <div>
                  <span className="text-sm text-darkText dark:text-darkTextPrimary flex items-center gap-1.5">
                    + Bônus avaliação
                    {calculo.atingiu5estrelas && (
                      <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                        5 ⭐ Dobrado!
                      </span>
                    )}
                  </span>
                  <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">
                    Média {mediaEfetiva.toFixed(2)} ⭐
                    {!calculo.atingiuMetaAvaliacao && ` · precisa ≥ ${cfg.metaAvaliacao.toFixed(1)} para bônus`}
                  </p>
                </div>
                <span className={`font-bold text-sm ${calculo.valorBonusAvaliacao > 0 ? 'text-green-600 dark:text-green-400' : 'text-lightText dark:text-darkTextSecondary'}`}>
                  {fmt(calculo.valorBonusAvaliacao)}
                </span>
              </div>

              {/* Total */}
              <div className="mt-3 bg-primary/5 dark:bg-primary/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-lightText dark:text-darkTextSecondary">Total bônus</span>
                  <span className="font-bold text-darkText dark:text-darkTextPrimary">{fmt(calculo.totalBonus)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-darkText dark:text-darkTextPrimary">💰 Total a receber</span>
                  <span className="text-2xl font-bold text-primary">{fmt(calculo.totalReceber)}</span>
                </div>
              </div>
            </div>

            {/* Badges de status */}
            <div className="flex flex-wrap gap-2">
              {calculo.metaAtingida ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
                  <CheckCircle size={12}/> Meta de faxinas atingida
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold">
                  <X size={12}/> Meta de faxinas não atingida
                </span>
              )}
              {calculo.atingiu5estrelas && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold">
                  <Star size={12} className="fill-current"/> Bônus 5 estrelas!
                </span>
              )}
              {calculo.atingiuMetaAvaliacao && !calculo.atingiu5estrelas && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold">
                  <Star size={12}/> Meta de avaliação atingida
                </span>
              )}
            </div>

            <Button fullWidth icon={<Save size={16}/>} onClick={() => setShowSave(true)}>
              Salvar no histórico
            </Button>
          </div>
        )}

        {/* ── Histórico ── */}
        {bonusMensal.length > 0 && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2 mb-4">
              <History size={17} className="text-primary"/> Histórico de Bônus
            </h2>
            <div className="space-y-2">
              {[...bonusMensal].sort((a,b) => b.ano - a.ano || b.mes - a.mes).map(b => (
                <div key={b.id} className="flex items-center gap-4 bg-gray-50 dark:bg-darkBg rounded-xl px-4 py-3">
                  <div className="shrink-0 text-center w-10">
                    <p className="text-[11px] font-bold text-lightText dark:text-darkTextSecondary">{MESES[b.mes-1].substring(0,3)}</p>
                    <p className="text-[11px] text-lightText dark:text-darkTextSecondary">{b.ano}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary truncate">{getColabNome(b.colaboradoraId)}</p>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">
                      {b.totalFaxinasEquipe} faxinas · {b.mediaAvaliacaoEquipe.toFixed(1)} ⭐
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-lightText dark:text-darkTextSecondary">bônus</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(b.totalBonus)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-lightText dark:text-darkTextSecondary">total</p>
                    <p className="text-base font-bold text-primary">{fmt(b.totalReceber)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Modal confirmar salvar ── */}
        <Modal isOpen={showSave} onClose={() => setShowSave(false)} title="Confirmar e Salvar">
          <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4">
            Confira os dados antes de salvar no histórico. Registros salvos não podem ser editados.
          </p>
          {calculo && (
            <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 text-sm space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-lightText">Líder:</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary">{lider?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lightText">Período:</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary">{MESES[mes-1]}/{ano}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lightText">Faxinas da equipe:</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary">{totalFaxinas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lightText">Média de avaliação:</span>
                <span className="font-bold text-darkText dark:text-darkTextPrimary">{mediaEfetiva.toFixed(2)} ⭐</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lightText">Total bônus:</span>
                <span className="font-bold text-green-600">{fmt(calculo.totalBonus)}</span>
              </div>
              <div className="flex justify-between border-t dark:border-darkBorder pt-2 mt-1">
                <span className="font-bold text-darkText dark:text-darkTextPrimary">Total a receber:</span>
                <span className="font-bold text-primary text-lg">{fmt(calculo.totalReceber)}</span>
              </div>
            </div>
          )}
          <Input label="Registrado por (opcional)" value={registradoPor} onChange={e => setRegistradoPor(e.target.value)} />
          <div className="flex gap-3 mt-4">
            <Button variant="outline" fullWidth onClick={() => setShowSave(false)}>Cancelar</Button>
            <Button fullWidth onClick={handleSave}>Confirmar e Salvar</Button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};
