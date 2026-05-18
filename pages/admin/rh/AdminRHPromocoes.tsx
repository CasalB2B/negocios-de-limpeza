import React, { useState, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { UserRole, CargoRH } from '../../../types';
import { useRH } from '../../../components/RHContext';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { Award, ChevronRight, CheckCircle, XCircle, Clock, FileText, Printer } from 'lucide-react';

const CARGO_LABEL: Record<CargoRH, string> = {
  JUNIOR: 'Faxineira Júnior', SENIOR: 'Faxineira Sênior', PROFISSIONAL: 'Faxineira Profissional', LIDER: 'Líder de Equipe', GERENTE: 'Gerente de Equipe',
};

const CARGO_NEXT: Partial<Record<CargoRH, CargoRH>> = {
  JUNIOR: CargoRH.SENIOR,
  SENIOR: CargoRH.PROFISSIONAL,
  PROFISSIONAL: CargoRH.LIDER,
  LIDER: CargoRH.GERENTE,
};

const CRITERIOS_LABEL: Record<CargoRH, string[]> = {
  JUNIOR: ['Mínimo 6 meses na empresa','Zero reclamações nos últimos 3 meses','Domínio do checklist padrão','Pontualidade consistente','Avaliação positiva da Líder de Equipe'],
  SENIOR: ['Mínimo 12 meses na empresa','Ao menos 3 avaliações 5 estrelas de clientes','Autonomia total em limpeza completa','Referência de qualidade para a equipe','Aprovação das sócias'],
  PROFISSIONAL: ['Mínimo 18 meses na empresa','Ao menos 1 avaliação escrita positiva de cliente','Domínio de passadoria e limpeza pós-obra','Demonstrar iniciativa e liderança natural','Aprovação das sócias'],
  LIDER: ['Mínimo 36 meses na empresa','Equipe batendo metas por 3 meses consecutivos','Histórico de liderança sem conflitos','Aprovação formal das 3 sócias'],
  GERENTE: [],
};

export const AdminRHPromocoes: React.FC = () => {
  const { colaboradoras, promocoes, configCriterios, addPromocao, getElegibilidade, getMesesNaEmpresa } = useRH();

  const [step, setStep] = useState<1|2|3>(1);
  const [selectedId, setSelectedId] = useState('');
  const [obs, setObs] = useState('');
  const [aprovadaPor, setAprovadaPor] = useState('');
  const [dataPromocao, setDataPromocao] = useState(new Date().toISOString().split('T')[0]);
  const [showCarta, setShowCarta] = useState<string | null>(null);

  const selected = colaboradoras.find(c => c.id === selectedId);
  const promovivel = colaboradoras.filter(c => c.cargoAtual !== CargoRH.GERENTE && c.status === 'ATIVA');

  const handleConfirm = async () => {
    if (!selected) return;
    const proximo = CARGO_NEXT[selected.cargoAtual];
    if (!proximo) return;
    if (!window.confirm(`Confirmar promoção de ${selected.nome} para ${CARGO_LABEL[proximo]}?`)) return;
    await addPromocao({
      colaboradoraId: selected.id,
      cargoAnterior: selected.cargoAtual,
      cargoNovo: proximo,
      dataPromocao,
      observacoes: obs,
      aprovadaPor,
    });
    setStep(1); setSelectedId(''); setObs(''); setAprovadaPor(''); setDataPromocao(new Date().toISOString().split('T')[0]);
    alert('Promoção registrada com sucesso!');
  };

  const getColabNome = (id: string) => colaboradoras.find(c => c.id === id)?.nome ?? '—';

  const getCriterioConfig = (cargo: CargoRH) => configCriterios.find(c => c.cargoOrigem === cargo);

  const ELEGIBILIDADE_LABEL = { GREEN: 'Elegível', YELLOW: 'Quase elegível', GRAY: 'Cedo demais' };
  const ELEGIBILIDADE_COLOR = { GREEN: 'text-green-600', YELLOW: 'text-yellow-600', GRAY: 'text-gray-500' };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">Promoções</h1>
          <p className="text-sm text-lightText dark:text-darkTextSecondary mt-0.5">Registre a promoção de uma colaboradora</p>
        </div>

        {/* Fluxo de promoção */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5 space-y-4">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-2">
            {(['Selecionar','Revisar critérios','Confirmar'] as const).map((label, i) => (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-1.5 text-xs font-bold ${step === i+1 ? 'text-primary' : step > i+1 ? 'text-green-600' : 'text-lightText dark:text-darkTextSecondary'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === i+1 ? 'bg-primary text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-darkBg text-lightText'}`}>{step > i+1 ? '✓' : i+1}</span>
                  <span className="hidden md:inline">{label}</span>
                </div>
                {i < 2 && <ChevronRight size={12} className="text-gray-300 dark:text-gray-600" />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Selecionar */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-bold text-darkText dark:text-darkTextPrimary">Selecione a colaboradora</h3>
              <div className="space-y-2">
                {promovivel.map(col => {
                  const eleg = getElegibilidade(col);
                  const proximo = CARGO_NEXT[col.cargoAtual];
                  return (
                    <button key={col.id} onClick={() => { setSelectedId(col.id); setStep(2); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedId === col.id ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-darkBorder hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-darkBg'}`}>
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-darkBg flex items-center justify-center font-bold text-lightText overflow-hidden shrink-0">
                        {col.foto ? <img src={col.foto} alt={col.nome} className="w-full h-full object-cover" /> : col.nome[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{col.nome}</p>
                        <p className="text-xs text-lightText dark:text-darkTextSecondary">{CARGO_LABEL[col.cargoAtual]} → {proximo ? CARGO_LABEL[proximo] : '—'}</p>
                      </div>
                      <span className={`text-xs font-bold ${ELEGIBILIDADE_COLOR[eleg]}`}>{ELEGIBILIDADE_LABEL[eleg]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Revisar critérios */}
          {step === 2 && selected && (
            <div className="space-y-4">
              <h3 className="font-bold text-darkText dark:text-darkTextPrimary">Critérios para {CARGO_LABEL[CARGO_NEXT[selected.cargoAtual]!]}</h3>

              <div className="p-3 bg-gray-50 dark:bg-darkBg rounded-xl text-sm space-y-1">
                <p className="font-bold text-darkText dark:text-darkTextPrimary">{selected.nome}</p>
                <p className="text-lightText dark:text-darkTextSecondary">{getMesesNaEmpresa(selected.dataAdmissao)} meses na empresa · {CARGO_LABEL[selected.cargoAtual]}</p>
                {(() => {
                  const cfg = getCriterioConfig(selected.cargoAtual);
                  const meses = getMesesNaEmpresa(selected.dataAdmissao);
                  if (!cfg) return null;
                  return (
                    <p className={`text-xs font-bold mt-1 ${meses >= cfg.tempoMinimoMeses ? 'text-green-600' : 'text-red-500'}`}>
                      {meses >= cfg.tempoMinimoMeses ? '✓' : '✗'} Tempo mínimo: {cfg.tempoMinimoMeses} meses ({meses >= cfg.tempoMinimoMeses ? 'atingido' : `faltam ${cfg.tempoMinimoMeses - meses} meses`})
                    </p>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wide">Checklist de critérios</p>
                {CRITERIOS_LABEL[selected.cargoAtual].map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-darkBorder mt-0.5 shrink-0" />
                    <span className="text-darkText dark:text-darkTextPrimary">{c}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setStep(1)}>Voltar</Button>
                <Button fullWidth onClick={() => setStep(3)}>Avançar</Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmar */}
          {step === 3 && selected && (
            <div className="space-y-4">
              <h3 className="font-bold text-darkText dark:text-darkTextPrimary">Confirmar promoção</h3>

              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary overflow-hidden">
                  {selected.foto ? <img src={selected.foto} alt={selected.nome} className="w-full h-full object-cover rounded-xl" /> : selected.nome[0]}
                </div>
                <div>
                  <p className="font-bold text-darkText dark:text-darkTextPrimary">{selected.nome}</p>
                  <p className="text-sm text-lightText dark:text-darkTextSecondary">
                    {CARGO_LABEL[selected.cargoAtual]} <span className="text-primary font-bold">→</span> {CARGO_LABEL[CARGO_NEXT[selected.cargoAtual]!]}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Data da promoção</label>
                <input type="date" value={dataPromocao} onChange={e => setDataPromocao(e.target.value)}
                  className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Aprovada por (sócias)</label>
                <input type="text" placeholder="ex: Ana, Beatriz, Carla" value={aprovadaPor} onChange={e => setAprovadaPor(e.target.value)}
                  className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Observações</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
                  className="w-full border border-input bg-background dark:bg-darkBg rounded-xl px-3 py-2 text-sm text-darkText dark:text-darkTextPrimary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Contexto, motivo, destaques da colaboradora..." />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => setStep(2)}>Voltar</Button>
                <Button fullWidth icon={<Award size={16}/>} onClick={handleConfirm}>Registrar Promoção</Button>
              </div>
            </div>
          )}
        </div>

        {/* Histórico de promoções */}
        {promocoes.length > 0 && (
          <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-5">
            <h2 className="font-bold text-darkText dark:text-darkTextPrimary mb-4">Histórico de Promoções</h2>
            <div className="space-y-3">
              {promocoes.map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-darkBg rounded-xl border border-gray-100 dark:border-darkBorder">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Award size={18}/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-darkText dark:text-darkTextPrimary">{getColabNome(p.colaboradoraId)}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-lightText dark:text-darkTextSecondary">{new Date(p.dataPromocao).toLocaleDateString('pt-BR')}</span>
                        <button onClick={() => setShowCarta(p.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <FileText size={12}/> Carta
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">
                      {CARGO_LABEL[p.cargoAnterior]} → <span className="font-bold text-primary">{CARGO_LABEL[p.cargoNovo]}</span>
                    </p>
                    {p.aprovadaPor && <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">Aprovada por: {p.aprovadaPor}</p>}
                    {p.observacoes && <p className="text-xs text-lightText dark:text-darkTextSecondary mt-0.5">{p.observacoes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Carta de Promoção */}
      {showCarta && (() => {
        const p = promocoes.find(pr => pr.id === showCarta)!;
        const col = colaboradoras.find(c => c.id === p.colaboradoraId);
        if (!p || !col) return null;
        return (
          <Modal isOpen={!!showCarta} onClose={() => setShowCarta(null)} title="Carta de Promoção">
            <div id="carta-promocao" className="space-y-4 text-sm text-darkText dark:text-darkTextPrimary">
              <div className="text-center space-y-1">
                <p className="text-xs text-lightText">Negócios de Limpeza — Guarapari, ES</p>
                <p className="font-bold text-lg">Carta de Reconhecimento e Promoção</p>
                <p className="text-xs text-lightText">{new Date(p.dataPromocao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              <p>Prezada <span className="font-bold">{col.nome}</span>,</p>

              <p>Com imenso prazer, comunicamos sua promoção ao cargo de <strong>{CARGO_LABEL[p.cargoNovo]}</strong>, a partir de {new Date(p.dataPromocao).toLocaleDateString('pt-BR')}.</p>

              <p>Esta conquista é fruto de sua dedicação, comprometimento e excelência no serviço prestado às nossas clientes. Você representa os valores que norteiam a Negócios de Limpeza: <em>Amor, Compromisso e Confiança</em>.</p>

              {p.observacoes && <p>{p.observacoes}</p>}

              <p>Confiamos em sua liderança e capacidade de elevar ainda mais o padrão da nossa equipe. Seja bem-vinda à nova etapa da sua trajetória conosco.</p>

              <div className="pt-4 space-y-1">
                <p className="text-xs text-lightText">Com carinho,</p>
                <p className="font-bold">As Sócias da Negócios de Limpeza</p>
                {p.aprovadaPor && <p className="text-xs text-lightText">{p.aprovadaPor}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" fullWidth onClick={() => setShowCarta(null)}>Fechar</Button>
              <Button fullWidth icon={<Printer size={16}/>} onClick={() => window.print()}>Imprimir</Button>
            </div>
          </Modal>
        );
      })()}
    </Layout>
  );
};
