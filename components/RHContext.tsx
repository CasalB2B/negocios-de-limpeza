import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CargoRH, StatusColaboradoraRH, ElegibilidadeRH } from '../types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ColaboradoraRH {
  id: string;
  nome: string;
  telefone?: string;
  foto?: string;
  dataAdmissao: string;
  cargoAtual: CargoRH;
  status: StatusColaboradoraRH;
  observacoes?: string;
  // Localização
  endereco?: string;
  cep?: string;
  // Contrato
  contratoUrl?: string;
  contratoNome?: string;
  // Perfil comportamental
  pontosFortes?: string;
  areasDesenvolvimento?: string;
  perfilComportamental?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObservacaoColaboradora {
  id: string;
  colaboradoraId: string;
  data: string;
  tipo: 'POSITIVA' | 'NEGATIVA' | 'NEUTRA' | 'OCORRENCIA';
  titulo: string;
  descricao: string;
  registradoPor?: string;
  createdAt: string;
}

export interface DesempenhoMensalRH {
  id: string;
  colaboradoraId: string;
  mes: number;
  ano: number;
  totalFaxinas: number;
  mediaAvaliacao: number;
  totalOcorrencias: number;
  observacoes?: string;
  registradoPor?: string;
  createdAt: string;
}

export interface PromocaoRH {
  id: string;
  colaboradoraId: string;
  cargoAnterior: CargoRH;
  cargoNovo: CargoRH;
  dataPromocao: string;
  observacoes?: string;
  aprovadaPor?: string;
  createdAt: string;
}

export interface ConfiguracaoBonusLider {
  id: string;
  multiplicadorFaxina: number;
  bonusAvaliacao: number;
  metaAvaliacao: number;
  metaFaxinasMes: number;
  salarioFixo: number;
  vigenciaInicio: string;
  vigenciaFim?: string;
  alteradoPor?: string;
  createdAt: string;
}

export interface BonusMensalRH {
  id: string;
  colaboradoraId: string;
  mes: number;
  ano: number;
  totalFaxinasEquipe: number;
  mediaAvaliacaoEquipe: number;
  valorBonusFaxinas: number;
  valorBonusAvaliacao: number;
  totalBonus: number;
  totalReceber: number;
  configuracaoId: string;
  createdAt: string;
}

export interface ConfiguracaoRemuneracaoRH {
  id: string;
  cargo: 'JUNIOR' | 'SENIOR' | 'PROFISSIONAL';
  diaria4h: number;
  diaria6h: number;
  diaria8h: number;
  passagem: number;
  vigenciaInicio: string;
  vigenciaFim?: string;
  alteradoPor?: string;
  createdAt: string;
}

export interface ConfiguracaoCriteriosRH {
  id: string;
  cargoOrigem: CargoRH;
  tempoMinimoMeses: number;
  mesesSemReclamacoes: number;
  mesesConsecutivosMetaBatida: number;
  vigenciaInicio: string;
  vigenciaFim?: string;
  alteradoPor?: string;
  createdAt: string;
}

export interface BonusCalculo {
  valorBonusFaxinas: number;
  valorBonusAvaliacao: number;
  totalBonus: number;
  totalReceber: number;
  atingiuMetaAvaliacao: boolean;
}

export interface AvaliacaoCliente {
  id: string;
  colaboradoraId: string;
  nomeCliente: string;
  dataFaxina?: string;
  estrelas: number;
  comentario?: string;
  createdAt: string;
}

export type StatusCandidataRH = 'NOVA' | 'EM_PROCESSO' | 'APROVADA' | 'REPROVADA' | 'DESISTIU';

export interface CandidataRH {
  id: string;
  nome: string;
  data: string;
  telefone?: string;
  status: StatusCandidataRH;
  dadosFormulario?: string;
  notasEntrevista?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface RHContextType {
  colaboradoras: ColaboradoraRH[];
  desempenhoMensal: DesempenhoMensalRH[];
  promocoes: PromocaoRH[];
  bonusMensal: BonusMensalRH[];
  configBonusLider: ConfiguracaoBonusLider | null;
  historicoConfigBonus: ConfiguracaoBonusLider[];
  configRemuneracao: ConfiguracaoRemuneracaoRH[];
  configCriterios: ConfiguracaoCriteriosRH[];
  avaliacoes: AvaliacaoCliente[];
  rhLoading: boolean;

  addColaboradora: (data: Omit<ColaboradoraRH, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateColaboradora: (id: string, data: Partial<ColaboradoraRH>) => Promise<void>;
  deleteColaboradora: (id: string) => Promise<void>;

  addDesempenho: (data: Omit<DesempenhoMensalRH, 'id' | 'createdAt'>) => Promise<void>;
  updateDesempenho: (id: string, data: Partial<DesempenhoMensalRH>) => Promise<void>;
  deleteDesempenho: (id: string) => Promise<void>;

  addPromocao: (data: Omit<PromocaoRH, 'id' | 'createdAt'>) => Promise<void>;

  addBonusMensal: (data: Omit<BonusMensalRH, 'id' | 'createdAt'>) => Promise<void>;
  calcularBonus: (totalFaxinasEquipe: number, mediaAvaliacaoEquipe: number) => BonusCalculo;

  updateConfigBonusLider: (data: Omit<ConfiguracaoBonusLider, 'id' | 'createdAt'>) => Promise<void>;
  updateConfigRemuneracao: (items: Omit<ConfiguracaoRemuneracaoRH, 'id' | 'createdAt'>[]) => Promise<void>;
  updateConfigCriterios: (items: Omit<ConfiguracaoCriteriosRH, 'id' | 'createdAt'>[]) => Promise<void>;

  addAvaliacao: (data: Omit<AvaliacaoCliente, 'id' | 'createdAt'>) => Promise<void>;
  getMediaAvaliacoesMes: (colaboradoraId: string, mes: number, ano: number) => number | null;

  observacoes: ObservacaoColaboradora[];
  addObservacao: (data: Omit<ObservacaoColaboradora, 'id' | 'createdAt'>) => Promise<void>;
  deleteObservacao: (id: string) => Promise<void>;

  candidatas: CandidataRH[];
  addCandidatura: (data: Omit<CandidataRH, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCandidatura: (id: string, data: Partial<CandidataRH>) => Promise<void>;
  deleteCandidatura: (id: string) => Promise<void>;

  getElegibilidade: (colaboradora: ColaboradoraRH) => ElegibilidadeRH;
  getMesesNaEmpresa: (dataAdmissao: string) => number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG_BONUS: ConfiguracaoBonusLider = {
  id: 'default',
  multiplicadorFaxina: 3,
  bonusAvaliacao: 150,
  metaAvaliacao: 4.5,
  metaFaxinasMes: 100,
  salarioFixo: 2200,
  vigenciaInicio: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
};

const DEFAULT_CONFIG_REMUNERACAO: ConfiguracaoRemuneracaoRH[] = [
  { id: 'rem_j', cargo: 'JUNIOR',       diaria4h: 80,  diaria6h: 120, diaria8h: 140, passagem: 10.20, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
  { id: 'rem_s', cargo: 'SENIOR',       diaria4h: 85,  diaria6h: 130, diaria8h: 150, passagem: 10.20, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
  { id: 'rem_p', cargo: 'PROFISSIONAL', diaria4h: 90,  diaria6h: 140, diaria8h: 160, passagem: 10.20, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
];

const DEFAULT_CONFIG_CRITERIOS: ConfiguracaoCriteriosRH[] = [
  { id: 'crit_j', cargoOrigem: CargoRH.JUNIOR,       tempoMinimoMeses: 6,  mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
  { id: 'crit_s', cargoOrigem: CargoRH.SENIOR,       tempoMinimoMeses: 12, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
  { id: 'crit_p', cargoOrigem: CargoRH.PROFISSIONAL, tempoMinimoMeses: 18, mesesSemReclamacoes: 3, mesesConsecutivosMetaBatida: 1, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
  { id: 'crit_l', cargoOrigem: CargoRH.LIDER,        tempoMinimoMeses: 36, mesesSemReclamacoes: 6, mesesConsecutivosMetaBatida: 3, vigenciaInicio: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
];

// Seed: Vanielen — Líder de Equipe, 3 anos de empresa
const now = new Date();
const admissaoVanielen = new Date(now);
admissaoVanielen.setMonth(admissaoVanielen.getMonth() - 36);

type SeedRow = [number, number, number, string];

function buildVanielenDesempenho(): DesempenhoMensalRH[] {
  const rows: SeedRow[] = [
    [24, 4.8, 0, 'Excelente mês, superou as expectativas.'],
    [21, 4.6, 0, 'Bom desempenho, equipe coesa.'],
    [19, 4.5, 1, 'Uma ocorrência de atraso no início do mês.'],
  ];
  return rows.map((row, i) => {
    const offset = i + 1;
    const d = new Date(now);
    d.setMonth(d.getMonth() - offset);
    return {
      id: `seed_des_${offset}`,
      colaboradoraId: 'seed_vanielen',
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      totalFaxinas: row[0],
      mediaAvaliacao: row[1],
      totalOcorrencias: row[2],
      observacoes: row[3],
      registradoPor: 'Admin',
      createdAt: new Date().toISOString(),
    };
  });
}

const SEED_COLABORADORAS: ColaboradoraRH[] = [
  {
    id: 'seed_vanielen',
    nome: 'Vanielen',
    dataAdmissao: admissaoVanielen.toISOString().split('T')[0],
    cargoAtual: CargoRH.LIDER,
    status: StatusColaboradoraRH.ATIVA,
    observacoes: 'Líder de equipe desde a fundação. Referência em qualidade e pontualidade.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Supabase ↔ camelCase mappers ─────────────────────────────────────────────

function mapColaboradora(r: any): ColaboradoraRH {
  return { id: r.id, nome: r.nome, telefone: r.telefone, foto: r.foto, dataAdmissao: r.data_admissao, cargoAtual: r.cargo_atual as CargoRH, status: r.status as StatusColaboradoraRH, observacoes: r.observacoes, endereco: r.endereco, cep: r.cep, contratoUrl: r.contrato_url, contratoNome: r.contrato_nome, pontosFortes: r.pontos_fortes, areasDesenvolvimento: r.areas_desenvolvimento, perfilComportamental: r.perfil_comportamental, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapObservacao(r: any): ObservacaoColaboradora {
  return { id: r.id, colaboradoraId: r.colaboradora_id, data: r.data, tipo: r.tipo, titulo: r.titulo, descricao: r.descricao, registradoPor: r.registrado_por, createdAt: r.created_at };
}
function mapDesempenho(r: any): DesempenhoMensalRH {
  return { id: r.id, colaboradoraId: r.colaboradora_id, mes: r.mes, ano: r.ano, totalFaxinas: r.total_faxinas, mediaAvaliacao: parseFloat(r.media_avaliacao), totalOcorrencias: r.total_ocorrencias, observacoes: r.observacoes, registradoPor: r.registrado_por, createdAt: r.created_at };
}
function mapPromocao(r: any): PromocaoRH {
  return { id: r.id, colaboradoraId: r.colaboradora_id, cargoAnterior: r.cargo_anterior as CargoRH, cargoNovo: r.cargo_novo as CargoRH, dataPromocao: r.data_promocao, observacoes: r.observacoes, aprovadaPor: r.aprovada_por, createdAt: r.created_at };
}
function mapConfigBonus(r: any): ConfiguracaoBonusLider {
  return { id: r.id, multiplicadorFaxina: parseFloat(r.multiplicador_faxina), bonusAvaliacao: parseFloat(r.bonus_avaliacao), metaAvaliacao: parseFloat(r.meta_avaliacao), metaFaxinasMes: r.meta_faxinas_mes, salarioFixo: parseFloat(r.salario_fixo), vigenciaInicio: r.vigencia_inicio, vigenciaFim: r.vigencia_fim, alteradoPor: r.alterado_por, createdAt: r.created_at };
}
function mapBonusMensal(r: any): BonusMensalRH {
  return { id: r.id, colaboradoraId: r.colaboradora_id, mes: r.mes, ano: r.ano, totalFaxinasEquipe: r.total_faxinas_equipe, mediaAvaliacaoEquipe: parseFloat(r.media_avaliacao_equipe), valorBonusFaxinas: parseFloat(r.valor_bonus_faxinas), valorBonusAvaliacao: parseFloat(r.valor_bonus_avaliacao), totalBonus: parseFloat(r.total_bonus), totalReceber: parseFloat(r.total_receber), configuracaoId: r.configuracao_id, createdAt: r.created_at };
}
function mapRemuneracao(r: any): ConfiguracaoRemuneracaoRH {
  return { id: r.id, cargo: r.cargo, diaria4h: parseFloat(r.diaria_4h), diaria6h: parseFloat(r.diaria_6h), diaria8h: parseFloat(r.diaria_8h), passagem: parseFloat(r.passagem), vigenciaInicio: r.vigencia_inicio, vigenciaFim: r.vigencia_fim, alteradoPor: r.alterado_por, createdAt: r.created_at };
}
function mapCriterios(r: any): ConfiguracaoCriteriosRH {
  return { id: r.id, cargoOrigem: r.cargo_origem as CargoRH, tempoMinimoMeses: r.tempo_minimo_meses, mesesSemReclamacoes: r.meses_sem_reclamacoes, mesesConsecutivosMetaBatida: r.meses_consecutivos_meta, vigenciaInicio: r.vigencia_inicio, vigenciaFim: r.vigencia_fim, alteradoPor: r.alterado_por, createdAt: r.created_at };
}
function mapAvaliacao(r: any): AvaliacaoCliente {
  return { id: r.id, colaboradoraId: r.colaboradora_id, nomeCliente: r.nome_cliente, dataFaxina: r.data_faxina, estrelas: r.estrelas, comentario: r.comentario, createdAt: r.created_at };
}

// ─── LS helpers ───────────────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const RHContext = createContext<RHContextType | undefined>(undefined);

export const useRH = () => {
  const ctx = useContext(RHContext);
  if (!ctx) throw new Error('useRH must be used inside RHProvider');
  return ctx;
};

export const RHProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colaboradoras, setColaboradoras] = useState<ColaboradoraRH[]>([]);
  const [desempenhoMensal, setDesempenhoMensal] = useState<DesempenhoMensalRH[]>([]);
  const [promocoes, setPromocoes] = useState<PromocaoRH[]>([]);
  const [bonusMensal, setBonusMensal] = useState<BonusMensalRH[]>([]);
  const [historicoConfigBonus, setHistoricoConfigBonus] = useState<ConfiguracaoBonusLider[]>([]);
  const [configBonusLider, setConfigBonusLider] = useState<ConfiguracaoBonusLider | null>(null);
  const [configRemuneracao, setConfigRemuneracao] = useState<ConfiguracaoRemuneracaoRH[]>([]);
  const [configCriterios, setConfigCriterios] = useState<ConfiguracaoCriteriosRH[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoCliente[]>([]);
  const [obsColaboradoras, setObsColaboradoras] = useState<ObservacaoColaboradora[]>([]);
  const [candidatas, setCandidatas] = useState<CandidataRH[]>([]);
  const [rhLoading, setRhLoading] = useState(true);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setRhLoading(true);
    try {
      const [colRes, desRes, proRes, bonRes, cfgBonRes, cfgRemRes, cfgCriRes, avalRes, obsRes] = await Promise.all([
        supabase.from('colaboradoras_rh').select('*').order('nome'),
        supabase.from('desempenho_mensal').select('*').order('ano,mes'),
        supabase.from('promocoes_rh').select('*').order('data_promocao', { ascending: false }),
        supabase.from('bonus_mensal').select('*').order('ano,mes'),
        supabase.from('configuracao_bonus_lider').select('*').order('created_at', { ascending: false }),
        supabase.from('configuracao_remuneracao').select('*').order('created_at', { ascending: false }),
        supabase.from('configuracao_criterios_promocao').select('*').order('created_at', { ascending: false }),
        supabase.from('avaliacoes_clientes').select('*').order('created_at', { ascending: false }),
        supabase.from('observacoes_colaboradoras').select('*').order('data', { ascending: false }),
      ]);

      if (colRes.error) throw colRes.error;

      const cols = (colRes.data || []).map(mapColaboradora);
      const des = (desRes.data || []).map(mapDesempenho);
      const pros = (proRes.data || []).map(mapPromocao);
      const bons = (bonRes.data || []).map(mapBonusMensal);
      const cfgBons = (cfgBonRes.data || []).map(mapConfigBonus);
      const cfgRems = (cfgRemRes.data || []).map(mapRemuneracao);
      const cfgCris = (cfgCriRes.data || []).map(mapCriterios);
      const avals = (avalRes.data || []).map(mapAvaliacao);
      const obs = (obsRes.data || []).map(mapObservacao);

      // Active config: no vigenciaFim
      const activeBonus = cfgBons.find(c => !c.vigenciaFim) ?? cfgBons[0] ?? DEFAULT_CONFIG_BONUS;
      const activeRems = cfgRems.filter(c => !c.vigenciaFim);
      const activeCris = cfgCris.filter(c => !c.vigenciaFim);

      // Se Supabase retornou vazio mas localStorage tem dados, preserva localStorage
      const finalCols = cols.length > 0 ? cols : lsGet<ColaboradoraRH[]>('rh_colaboradoras', SEED_COLABORADORAS);
      const finalAvals = avals.length > 0 ? avals : lsGet<AvaliacaoCliente[]>('rh_avaliacoes', []);
      const finalObs = obs.length > 0 ? obs : lsGet<ObservacaoColaboradora[]>('rh_obs_colaboradoras', []);

      setColaboradoras(finalCols);
      setDesempenhoMensal(des.length > 0 ? des : lsGet<DesempenhoMensalRH[]>('rh_desempenho', []));
      setPromocoes(pros.length > 0 ? pros : lsGet<PromocaoRH[]>('rh_promocoes', []));
      setBonusMensal(bons);
      setHistoricoConfigBonus(cfgBons);
      setConfigBonusLider(activeBonus);
      setConfigRemuneracao(activeRems.length ? activeRems : DEFAULT_CONFIG_REMUNERACAO);
      setConfigCriterios(activeCris.length ? activeCris : DEFAULT_CONFIG_CRITERIOS);
      setAvaliacoes(finalAvals);
      setObsColaboradoras(finalObs);

      lsSet('rh_colaboradoras', cols);
      lsSet('rh_desempenho', des);
      lsSet('rh_promocoes', pros);
      lsSet('rh_bonus_mensal', bons);
      lsSet('rh_config_bonus', activeBonus);
      lsSet('rh_config_remuneracao', activeRems.length ? activeRems : DEFAULT_CONFIG_REMUNERACAO);
      lsSet('rh_config_criterios', activeCris.length ? activeCris : DEFAULT_CONFIG_CRITERIOS);
      lsSet('rh_avaliacoes', avals);
      lsSet('rh_obs_colaboradoras', obs);
    } catch {
      // Fallback to localStorage + seed
      const cols = lsGet<ColaboradoraRH[]>('rh_colaboradoras', SEED_COLABORADORAS);
      const des = lsGet<DesempenhoMensalRH[]>('rh_desempenho', buildVanielenDesempenho());
      const pros = lsGet<PromocaoRH[]>('rh_promocoes', []);
      const bons = lsGet<BonusMensalRH[]>('rh_bonus_mensal', []);
      const cfg = lsGet<ConfiguracaoBonusLider>('rh_config_bonus', DEFAULT_CONFIG_BONUS);
      const rems = lsGet<ConfiguracaoRemuneracaoRH[]>('rh_config_remuneracao', DEFAULT_CONFIG_REMUNERACAO);
      const cris = lsGet<ConfiguracaoCriteriosRH[]>('rh_config_criterios', DEFAULT_CONFIG_CRITERIOS);
      const avals = lsGet<AvaliacaoCliente[]>('rh_avaliacoes', []);
      const obs = lsGet<ObservacaoColaboradora[]>('rh_obs_colaboradoras', []);
      const cands = lsGet<CandidataRH[]>('rh_candidatas', []);

      setColaboradoras(cols);
      setCandidatas(cands);
      setDesempenhoMensal(des);
      setPromocoes(pros);
      setBonusMensal(bons);
      setHistoricoConfigBonus([cfg]);
      setConfigBonusLider(cfg);
      setConfigRemuneracao(rems);
      setConfigCriterios(cris);
      setAvaliacoes(avals);
      setObsColaboradoras(obs);

      if (!localStorage.getItem('rh_colaboradoras')) {
        lsSet('rh_colaboradoras', cols);
        lsSet('rh_desempenho', des);
        lsSet('rh_config_bonus', cfg);
        lsSet('rh_config_remuneracao', rems);
        lsSet('rh_config_criterios', cris);
      }
    } finally {
      setRhLoading(false);
    }
  };

  // ── Colaboradoras ──────────────────────────────────────────────────────────

  const addColaboradora = useCallback(async (data: Omit<ColaboradoraRH, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `col_${Date.now()}`;
    const now = new Date().toISOString();
    const item: ColaboradoraRH = { ...data, id: newId, createdAt: now, updatedAt: now };
    try {
      const { data: r, error } = await supabase.from('colaboradoras_rh').insert({
        nome: data.nome, telefone: data.telefone, foto: data.foto,
        data_admissao: data.dataAdmissao, cargo_atual: data.cargoAtual,
        status: data.status, observacoes: data.observacoes,
        endereco: data.endereco, cep: data.cep,
        contrato_url: data.contratoUrl, contrato_nome: data.contratoNome,
      }).select().single();
      if (!error && r) {
        const saved = mapColaboradora(r);
        setColaboradoras(prev => { const next = [...prev, saved]; lsSet('rh_colaboradoras', next); return next; });
        return;
      }
    } catch {}
    setColaboradoras(prev => { const next = [...prev, item]; lsSet('rh_colaboradoras', next); return next; });
  }, []);

  const updateColaboradora = useCallback(async (id: string, data: Partial<ColaboradoraRH>) => {
    const update = (prev: ColaboradoraRH[]) => {
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      lsSet('rh_colaboradoras', next); return next;
    };
    try {
      await supabase.from('colaboradoras_rh').update({
        nome: data.nome, telefone: data.telefone, foto: data.foto,
        data_admissao: data.dataAdmissao, cargo_atual: data.cargoAtual,
        status: data.status, observacoes: data.observacoes,
        endereco: data.endereco, cep: data.cep,
        contrato_url: data.contratoUrl, contrato_nome: data.contratoNome,
        pontos_fortes: data.pontosFortes, areas_desenvolvimento: data.areasDesenvolvimento,
        perfil_comportamental: data.perfilComportamental,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } catch {}
    setColaboradoras(update);
  }, []);

  const deleteColaboradora = useCallback(async (id: string) => {
    try { await supabase.from('colaboradoras_rh').delete().eq('id', id); } catch {}
    setColaboradoras(prev => { const next = prev.filter(c => c.id !== id); lsSet('rh_colaboradoras', next); return next; });
  }, []);

  // ── Desempenho ─────────────────────────────────────────────────────────────

  const addDesempenho = useCallback(async (data: Omit<DesempenhoMensalRH, 'id' | 'createdAt'>) => {
    const newId = `des_${Date.now()}`;
    const item: DesempenhoMensalRH = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      const { data: r, error } = await supabase.from('desempenho_mensal').insert({
        colaboradora_id: data.colaboradoraId, mes: data.mes, ano: data.ano,
        total_faxinas: data.totalFaxinas, media_avaliacao: data.mediaAvaliacao,
        total_ocorrencias: data.totalOcorrencias, observacoes: data.observacoes,
        registrado_por: data.registradoPor,
      }).select().single();
      if (!error && r) {
        const saved = mapDesempenho(r);
        setDesempenhoMensal(prev => { const next = [...prev, saved]; lsSet('rh_desempenho', next); return next; });
        return;
      }
    } catch {}
    setDesempenhoMensal(prev => { const next = [...prev, item]; lsSet('rh_desempenho', next); return next; });
  }, []);

  const updateDesempenho = useCallback(async (id: string, data: Partial<DesempenhoMensalRH>) => {
    const update = (prev: DesempenhoMensalRH[]) => {
      const next = prev.map(d => d.id === id ? { ...d, ...data } : d);
      lsSet('rh_desempenho', next); return next;
    };
    try {
      await supabase.from('desempenho_mensal').update({
        total_faxinas: data.totalFaxinas, media_avaliacao: data.mediaAvaliacao,
        total_ocorrencias: data.totalOcorrencias, observacoes: data.observacoes,
        registrado_por: data.registradoPor,
      }).eq('id', id);
    } catch {}
    setDesempenhoMensal(update);
  }, []);

  const deleteDesempenho = useCallback(async (id: string) => {
    try { await supabase.from('desempenho_mensal').delete().eq('id', id); } catch {}
    setDesempenhoMensal(prev => { const next = prev.filter(d => d.id !== id); lsSet('rh_desempenho', next); return next; });
  }, []);

  // ── Promoções ──────────────────────────────────────────────────────────────

  const addPromocao = useCallback(async (data: Omit<PromocaoRH, 'id' | 'createdAt'>) => {
    const newId = `prom_${Date.now()}`;
    const item: PromocaoRH = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      await supabase.from('promocoes_rh').insert({
        colaboradora_id: data.colaboradoraId, cargo_anterior: data.cargoAnterior,
        cargo_novo: data.cargoNovo, data_promocao: data.dataPromocao,
        observacoes: data.observacoes, aprovada_por: data.aprovadaPor,
      });
    } catch {}
    setPromocoes(prev => { const next = [item, ...prev]; lsSet('rh_promocoes', next); return next; });
    // Also update collaborator's cargo
    await updateColaboradora(data.colaboradoraId, { cargoAtual: data.cargoNovo });
  }, [updateColaboradora]);

  // ── Bônus ──────────────────────────────────────────────────────────────────

  const calcularBonus = useCallback((totalFaxinasEquipe: number, mediaAvaliacaoEquipe: number): BonusCalculo => {
    const cfg = configBonusLider ?? DEFAULT_CONFIG_BONUS;
    const valorBonusFaxinas = totalFaxinasEquipe * cfg.multiplicadorFaxina;
    const atingiuMetaAvaliacao = mediaAvaliacaoEquipe >= cfg.metaAvaliacao;
    const valorBonusAvaliacao = atingiuMetaAvaliacao ? cfg.bonusAvaliacao : 0;
    const totalBonus = valorBonusFaxinas + valorBonusAvaliacao;
    const totalReceber = cfg.salarioFixo + totalBonus;
    return { valorBonusFaxinas, valorBonusAvaliacao, totalBonus, totalReceber, atingiuMetaAvaliacao };
  }, [configBonusLider]);

  const addBonusMensal = useCallback(async (data: Omit<BonusMensalRH, 'id' | 'createdAt'>) => {
    const newId = `bon_${Date.now()}`;
    const item: BonusMensalRH = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      await supabase.from('bonus_mensal').insert({
        colaboradora_id: data.colaboradoraId, mes: data.mes, ano: data.ano,
        total_faxinas_equipe: data.totalFaxinasEquipe,
        media_avaliacao_equipe: data.mediaAvaliacaoEquipe,
        valor_bonus_faxinas: data.valorBonusFaxinas,
        valor_bonus_avaliacao: data.valorBonusAvaliacao,
        total_bonus: data.totalBonus, total_receber: data.totalReceber,
        configuracao_id: data.configuracaoId,
      });
    } catch {}
    setBonusMensal(prev => { const next = [...prev, item]; lsSet('rh_bonus_mensal', next); return next; });
  }, []);

  // ── Avaliações ─────────────────────────────────────────────────────────────

  const addAvaliacao = useCallback(async (data: Omit<AvaliacaoCliente, 'id' | 'createdAt'>) => {
    const item: AvaliacaoCliente = { ...data, id: `aval_${Date.now()}`, createdAt: new Date().toISOString() };
    try {
      await supabase.from('avaliacoes_clientes').insert({
        colaboradora_id: data.colaboradoraId, nome_cliente: data.nomeCliente,
        data_faxina: data.dataFaxina || null, estrelas: data.estrelas, comentario: data.comentario || null,
      });
    } catch {}
    setAvaliacoes(prev => { const next = [item, ...prev]; lsSet('rh_avaliacoes', next); return next; });
  }, []);

  // ── Observações de Colaboradoras ───────────────────────────────────────────

  const addObservacao = useCallback(async (data: Omit<ObservacaoColaboradora, 'id' | 'createdAt'>) => {
    const item: ObservacaoColaboradora = { ...data, id: `obs_${Date.now()}`, createdAt: new Date().toISOString() };
    try {
      await supabase.from('observacoes_colaboradoras').insert({
        colaboradora_id: data.colaboradoraId, data: data.data, tipo: data.tipo,
        titulo: data.titulo, descricao: data.descricao, registrado_por: data.registradoPor || null,
      });
    } catch {}
    setObsColaboradoras(prev => { const next = [item, ...prev]; lsSet('rh_obs_colaboradoras', next); return next; });
  }, []);

  const deleteObservacao = useCallback(async (id: string) => {
    try { await supabase.from('observacoes_colaboradoras').delete().eq('id', id); } catch {}
    setObsColaboradoras(prev => { const next = prev.filter(o => o.id !== id); lsSet('rh_obs_colaboradoras', next); return next; });
  }, []);

  // ── Candidatas (Contratação) ───────────────────────────────────────────────

  const addCandidatura = useCallback(async (data: Omit<CandidataRH, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: CandidataRH = { ...data, id: `cand_${Date.now()}`, createdAt: now, updatedAt: now };
    try {
      const { data: r, error } = await supabase.from('candidatas_rh').insert({
        nome: data.nome, data: data.data, telefone: data.telefone, status: data.status,
        dados_formulario: data.dadosFormulario, notas_entrevista: data.notasEntrevista, observacoes: data.observacoes,
      }).select().single();
      if (!error && r) {
        const saved: CandidataRH = { id: r.id, nome: r.nome, data: r.data, telefone: r.telefone, status: r.status, dadosFormulario: r.dados_formulario, notasEntrevista: r.notas_entrevista, observacoes: r.observacoes, createdAt: r.created_at, updatedAt: r.updated_at };
        setCandidatas(prev => { const next = [saved, ...prev]; lsSet('rh_candidatas', next); return next; });
        return;
      }
    } catch {}
    setCandidatas(prev => { const next = [item, ...prev]; lsSet('rh_candidatas', next); return next; });
  }, []);

  const updateCandidatura = useCallback(async (id: string, data: Partial<CandidataRH>) => {
    const upd = (prev: CandidataRH[]) => { const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c); lsSet('rh_candidatas', next); return next; };
    try {
      await supabase.from('candidatas_rh').update({
        nome: data.nome, data: data.data, telefone: data.telefone, status: data.status,
        dados_formulario: data.dadosFormulario, notas_entrevista: data.notasEntrevista, observacoes: data.observacoes,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } catch {}
    setCandidatas(upd);
  }, []);

  const deleteCandidatura = useCallback(async (id: string) => {
    try { await supabase.from('candidatas_rh').delete().eq('id', id); } catch {}
    setCandidatas(prev => { const next = prev.filter(c => c.id !== id); lsSet('rh_candidatas', next); return next; });
  }, []);

  const getMediaAvaliacoesMes = useCallback((colaboradoraId: string, mes: number, ano: number): number | null => {
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0, 23, 59, 59);
    const relevant = avaliacoes.filter(a => {
      if (a.colaboradoraId !== colaboradoraId) return false;
      const d = new Date(a.createdAt);
      return d >= inicio && d <= fim;
    });
    if (!relevant.length) return null;
    return relevant.reduce((sum, a) => sum + a.estrelas, 0) / relevant.length;
  }, [avaliacoes]);

  // ── Configurações ──────────────────────────────────────────────────────────

  const updateConfigBonusLider = useCallback(async (data: Omit<ConfiguracaoBonusLider, 'id' | 'createdAt'>) => {
    const newId = `cfg_${Date.now()}`;
    const item: ConfiguracaoBonusLider = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      // Close previous config
      if (configBonusLider && configBonusLider.id !== 'default') {
        await supabase.from('configuracao_bonus_lider').update({ vigencia_fim: new Date().toISOString().split('T')[0] }).eq('id', configBonusLider.id);
      }
      await supabase.from('configuracao_bonus_lider').insert({
        multiplicador_faxina: data.multiplicadorFaxina, bonus_avaliacao: data.bonusAvaliacao,
        meta_avaliacao: data.metaAvaliacao, meta_faxinas_mes: data.metaFaxinasMes,
        salario_fixo: data.salarioFixo, vigencia_inicio: data.vigenciaInicio,
        alterado_por: data.alteradoPor,
      });
    } catch {}
    setConfigBonusLider(item);
    setHistoricoConfigBonus(prev => [item, ...prev.map(c => c.id === configBonusLider?.id ? { ...c, vigenciaFim: new Date().toISOString().split('T')[0] } : c)]);
    lsSet('rh_config_bonus', item);
  }, [configBonusLider]);

  const updateConfigRemuneracao = useCallback(async (items: Omit<ConfiguracaoRemuneracaoRH, 'id' | 'createdAt'>[]) => {
    const saved = items.map((item, i) => ({ ...item, id: `rem_${Date.now()}_${i}`, createdAt: new Date().toISOString() }));
    try {
      for (const prev of configRemuneracao) {
        await supabase.from('configuracao_remuneracao').update({ vigencia_fim: new Date().toISOString().split('T')[0] }).eq('id', prev.id);
      }
      for (const item of items) {
        await supabase.from('configuracao_remuneracao').insert({
          cargo: item.cargo, diaria_4h: item.diaria4h, diaria_6h: item.diaria6h,
          diaria_8h: item.diaria8h, passagem: item.passagem,
          vigencia_inicio: item.vigenciaInicio, alterado_por: item.alteradoPor,
        });
      }
    } catch {}
    setConfigRemuneracao(saved);
    lsSet('rh_config_remuneracao', saved);
  }, [configRemuneracao]);

  const updateConfigCriterios = useCallback(async (items: Omit<ConfiguracaoCriteriosRH, 'id' | 'createdAt'>[]) => {
    const saved = items.map((item, i) => ({ ...item, id: `crit_${Date.now()}_${i}`, createdAt: new Date().toISOString() }));
    try {
      for (const prev of configCriterios) {
        await supabase.from('configuracao_criterios_promocao').update({ vigencia_fim: new Date().toISOString().split('T')[0] }).eq('id', prev.id);
      }
      for (const item of items) {
        await supabase.from('configuracao_criterios_promocao').insert({
          cargo_origem: item.cargoOrigem, tempo_minimo_meses: item.tempoMinimoMeses,
          meses_sem_reclamacoes: item.mesesSemReclamacoes,
          meses_consecutivos_meta: item.mesesConsecutivosMetaBatida,
          vigencia_inicio: item.vigenciaInicio, alterado_por: item.alteradoPor,
        });
      }
    } catch {}
    setConfigCriterios(saved);
    lsSet('rh_config_criterios', saved);
  }, [configCriterios]);

  // ── Utils ──────────────────────────────────────────────────────────────────

  const getMesesNaEmpresa = useCallback((dataAdmissao: string): number => {
    const admissao = new Date(dataAdmissao);
    const hoje = new Date();
    return (hoje.getFullYear() - admissao.getFullYear()) * 12 + (hoje.getMonth() - admissao.getMonth());
  }, []);

  const getElegibilidade = useCallback((colaboradora: ColaboradoraRH): ElegibilidadeRH => {
    if (colaboradora.cargoAtual === CargoRH.GERENTE) return 'GRAY';
    const meses = getMesesNaEmpresa(colaboradora.dataAdmissao);
    const criterio = configCriterios.find(c => c.cargoOrigem === colaboradora.cargoAtual);
    if (!criterio) return 'GRAY';

    const minimo = criterio.tempoMinimoMeses;
    if (meses < minimo - 3) return 'GRAY';

    const hoje = new Date();
    const ultimos: { mes: number; ano: number }[] = [];
    for (let i = 1; i <= criterio.mesesSemReclamacoes; i++) {
      const d = new Date(hoje); d.setMonth(d.getMonth() - i);
      ultimos.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
    }
    const registros = desempenhoMensal.filter(d =>
      d.colaboradoraId === colaboradora.id &&
      ultimos.some(u => u.mes === d.mes && u.ano === d.ano)
    );
    const semReclamacoes = registros.length > 0 && registros.every(r => r.totalOcorrencias === 0);

    if (meses >= minimo && semReclamacoes) return 'GREEN';
    if (meses >= minimo - 3) return 'YELLOW';
    return 'GRAY';
  }, [configCriterios, desempenhoMensal, getMesesNaEmpresa]);

  return (
    <RHContext.Provider value={{
      colaboradoras, desempenhoMensal, promocoes, bonusMensal,
      configBonusLider, historicoConfigBonus, configRemuneracao, configCriterios,
      avaliacoes, rhLoading,
      addColaboradora, updateColaboradora, deleteColaboradora,
      addDesempenho, updateDesempenho, deleteDesempenho,
      addPromocao, addBonusMensal, calcularBonus,
      addAvaliacao, getMediaAvaliacoesMes,
      observacoes: obsColaboradoras, addObservacao, deleteObservacao,
      candidatas, addCandidatura, updateCandidatura, deleteCandidatura,
      updateConfigBonusLider, updateConfigRemuneracao, updateConfigCriterios,
      getElegibilidade, getMesesNaEmpresa,
    }}>
      {children}
    </RHContext.Provider>
  );
};
