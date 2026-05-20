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
  // Metas individuais
  metaMensalFaxinas?: number;
  // Dados pessoais
  dataNascimento?: string;
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
  bonusAvaliacao5estrelas?: number;   // bônus quando média ≥ 4.9 (5 estrelas)
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
  metaAtingida: boolean;           // totalFaxinas > metaFaxinasMes
  atingiuMetaAvaliacao: boolean;   // média >= metaAvaliacao
  atingiu5estrelas: boolean;       // média >= 4.9
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
  rhSyncing: boolean; // true while background-syncing from Supabase after initial LS load

  addColaboradora: (data: Omit<ColaboradoraRH, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateColaboradora: (id: string, data: Partial<ColaboradoraRH>) => Promise<void>;
  deleteColaboradora: (id: string) => Promise<void>;
  syncToSupabase: () => Promise<{ synced: number; errors: number }>;

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
  deleteAvaliacao: (id: string) => Promise<void>;

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
  bonusAvaliacao5estrelas: 300,
  metaAvaliacao: 4.5,
  metaFaxinasMes: 100,
  salarioFixo: 2800,
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
  return { id: r.id, nome: r.nome, telefone: r.telefone, foto: r.foto, dataAdmissao: r.data_admissao, cargoAtual: r.cargo_atual as CargoRH, status: r.status as StatusColaboradoraRH, observacoes: r.observacoes, endereco: r.endereco, cep: r.cep, contratoUrl: r.contrato_url, contratoNome: r.contrato_nome, pontosFortes: r.pontos_fortes, areasDesenvolvimento: r.areas_desenvolvimento, perfilComportamental: r.perfil_comportamental, metaMensalFaxinas: r.meta_mensal_faxinas ?? undefined, dataNascimento: r.data_nascimento ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at };
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
  return { id: r.id, multiplicadorFaxina: parseFloat(r.multiplicador_faxina), bonusAvaliacao: parseFloat(r.bonus_avaliacao), bonusAvaliacao5estrelas: r.bonus_avaliacao_5estrelas ? parseFloat(r.bonus_avaliacao_5estrelas) : undefined, metaAvaliacao: parseFloat(r.meta_avaliacao), metaFaxinasMes: r.meta_faxinas_mes, salarioFixo: parseFloat(r.salario_fixo), vigenciaInicio: r.vigencia_inicio, vigenciaFim: r.vigencia_fim, alteradoPor: r.alterado_por, createdAt: r.created_at };
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
function mapCandidatura(r: any): CandidataRH {
  return { id: r.id, nome: r.nome, data: r.data, telefone: r.telefone, status: r.status, dadosFormulario: r.dados_formulario, notasEntrevista: r.notas_entrevista, observacoes: r.observacoes, createdAt: r.created_at, updatedAt: r.updated_at };
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
  const [rhSyncing, setRhSyncing] = useState(false); // background refresh indicator

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    // ── Phase 1: instant load from localStorage ──────────────────────────────
    // Populate state immediately so the UI is never blank while the edge function loads
    const lsCols   = lsGet<ColaboradoraRH[]>('rh_colaboradoras', SEED_COLABORADORAS);
    const lsDes    = lsGet<DesempenhoMensalRH[]>('rh_desempenho', buildVanielenDesempenho());
    const lsPros   = lsGet<PromocaoRH[]>('rh_promocoes', []);
    const lsBons   = lsGet<BonusMensalRH[]>('rh_bonus_mensal', []);
    const lsCfg    = lsGet<ConfiguracaoBonusLider>('rh_config_bonus', DEFAULT_CONFIG_BONUS);
    const lsRems   = lsGet<ConfiguracaoRemuneracaoRH[]>('rh_config_remuneracao', DEFAULT_CONFIG_REMUNERACAO);
    const lsCris   = lsGet<ConfiguracaoCriteriosRH[]>('rh_config_criterios', DEFAULT_CONFIG_CRITERIOS);
    const lsAvals  = lsGet<AvaliacaoCliente[]>('rh_avaliacoes', []);
    const lsObs    = lsGet<ObservacaoColaboradora[]>('rh_obs_colaboradoras', []);
    const lsCands  = lsGet<CandidataRH[]>('rh_candidatas', []);
    setColaboradoras(lsCols);
    setDesempenhoMensal(lsDes);
    setPromocoes(lsPros);
    setBonusMensal(lsBons);
    setConfigBonusLider(lsCfg);
    setHistoricoConfigBonus([lsCfg]);
    setConfigRemuneracao(lsRems);
    setConfigCriterios(lsCris);
    setAvaliacoes(lsAvals);
    setObsColaboradoras(lsObs);
    setCandidatas(lsCands);
    setRhLoading(false); // UI unlocked after Phase 1

    // ── Phase 2: background sync from Supabase ──────────────────────────────
    setRhSyncing(true);
    try {
      // Primary: use rh-write/get_admin_data which bypasses RLS with SERVICE_ROLE_KEY
      // This ensures mobile/new devices always see all data without needing localStorage
      const adminRes = await supabase.functions.invoke('rh-write', {
        body: { action: 'get_admin_data' },
      });

      if (!adminRes.data?.ok) throw new Error('get_admin_data failed');

      const d = adminRes.data;
      const cols     = (d.colaboradoras    || []).map(mapColaboradora);
      const des      = (d.desempenho       || []).map(mapDesempenho);
      const pros     = (d.promocoes        || []).map(mapPromocao);
      const bons     = (d.bonus            || []).map(mapBonusMensal);
      const cfgBons  = (d.configBonus      || []).map(mapConfigBonus);
      const cfgRems  = (d.configRemuneracao|| []).map(mapRemuneracao);
      const cfgCris  = (d.configCriterios  || []).map(mapCriterios);
      const avals    = (d.avaliacoes       || []).map(mapAvaliacao);
      const obs      = (d.observacoes      || []).map(mapObservacao);
      const cands    = (d.candidatas       || []).map(mapCandidatura);

      // Active config: no vigenciaFim
      // Read LS first — used as fallback when Supabase returns empty (RLS blocks anon reads)
      const lsBonusConfig = lsGet<ConfiguracaoBonusLider>('rh_config_bonus', DEFAULT_CONFIG_BONUS);
      const lsRemConfig   = lsGet<ConfiguracaoRemuneracaoRH[]>('rh_config_remuneracao', DEFAULT_CONFIG_REMUNERACAO);
      const lsCriConfig   = lsGet<ConfiguracaoCriteriosRH[]>('rh_config_criterios', DEFAULT_CONFIG_CRITERIOS);

      const activeBonus = cfgBons.find(c => !c.vigenciaFim) ?? cfgBons[0] ?? lsBonusConfig;
      const activeRems = cfgRems.filter(c => !c.vigenciaFim);
      const activeCris = cfgCris.filter(c => !c.vigenciaFim);

      // Compare createdAt: LS may be newer if Supabase write failed — prefer the most recent
      const newestDate = (arr: { createdAt: string }[]) =>
        arr.length ? arr.map(r => r.createdAt ?? '0').sort().pop()! : '0';

      const lsRemDate = newestDate(lsRemConfig);
      const sbRemDate = newestDate(activeRems);
      const lsCriDate = newestDate(lsCriConfig);
      const sbCriDate = newestDate(activeCris);

      // Supabase wins only if its data is strictly newer than what's in LS
      const finalRems = (sbRemDate > lsRemDate && activeRems.length) ? activeRems : (lsRemConfig.length ? lsRemConfig : DEFAULT_CONFIG_REMUNERACAO);
      const finalCris = (sbCriDate > lsCriDate && activeCris.length) ? activeCris : (lsCriConfig.length ? lsCriConfig : DEFAULT_CONFIG_CRITERIOS);
      const finalBonus = activeBonus;

      // Merge Supabase + local-only (only col_XXX — never seeds, they're just fallback)
      const supabaseIds  = new Set(cols.map((c: ColaboradoraRH) => c.id));
      const lsCols       = lsGet<ColaboradoraRH[]>('rh_colaboradoras', SEED_COLABORADORAS);
      // Only include user-created (col_) that haven't been synced yet — never seeds
      const localOnly    = lsCols.filter(c => c.id.startsWith('col_') && !supabaseIds.has(c.id));

      // For each Supabase colaboradora, prefer LS version if it has a newer updatedAt
      // (this happens when an edit was saved locally but Supabase write failed silently)
      const lsColsMap = new Map(lsCols.map(c => [c.id, c]));
      const staleInSupabase: ColaboradoraRH[] = []; // LS version is newer → Supabase is stale
      const mergedCols = cols.map((c: ColaboradoraRH) => {
        const lsVersion = lsColsMap.get(c.id);
        if (lsVersion && (lsVersion.updatedAt ?? '') > (c.updatedAt ?? '')) {
          staleInSupabase.push(lsVersion); // LS won — needs to be pushed to Supabase
          return lsVersion;
        }
        return c;
      });
      const finalCols = cols.length > 0 ? [...mergedCols, ...localOnly] : lsCols;

      // ── Auto-push: if LS has edits newer than Supabase, push them silently ──
      // Also push seed_ records — rh-write resolves them by name so seed_vanielen
      // correctly finds and updates the real Vaniele record in Supabase
      const seedColabs = lsCols.filter(c => c.id.startsWith('seed_'));
      const colsToPush = [...new Map(
        [...staleInSupabase, ...localOnly, ...seedColabs].map(c => [c.id, c])
      ).values()];
      if (colsToPush.length > 0) {
        supabase.functions.invoke('rh-write', {
          body: { action: 'sync_colaboradoras', data: colsToPush },
        }).then(res => {
          // Update IDs in LS if seed_ got resolved to real UUID
          const results: { localId: string; supabaseId: string | null }[] = res.data?.results ?? [];
          const newMapping: Record<string, string> = {};
          for (const r of results) {
            if (r.supabaseId && r.localId !== r.supabaseId) newMapping[r.localId] = r.supabaseId;
          }
          if (Object.keys(newMapping).length > 0) {
            setColaboradoras(prev => {
              const next = prev.map(c => newMapping[c.id] ? { ...c, id: newMapping[c.id] } : c);
              lsSet('rh_colaboradoras', next);
              return next;
            });
          }
        }).catch(() => {});
      }

      // Tombstone: IDs of avaliacoes the user has deliberately deleted
      // This prevents Phase 2 from restoring reviews that were deleted locally
      const tombstone = new Set(lsGet<string[]>('rh_deleted_avals', []));

      // Filter out tombstoned reviews from Supabase data
      const avalsFiltered = avals.filter((a: AvaliacaoCliente) => !tombstone.has(a.id));

      // Build set of all colaboradora IDs present in Supabase avaliacoes
      const supabaseColabsInAvals = new Set(avalsFiltered.map((a: AvaliacaoCliente) => a.colaboradoraId));
      const lsAvals = lsGet<AvaliacaoCliente[]>('rh_avaliacoes', []);
      // Include local avals whose colaboradora is NOT yet in Supabase (still local col_)
      const localOnlyAvals = lsAvals.filter(a =>
        a.id.startsWith('aval_') && !supabaseColabsInAvals.has(a.colaboradoraId) && !tombstone.has(a.id)
      );
      const finalAvals = avalsFiltered.length > 0 ? [...avalsFiltered, ...localOnlyAvals] : lsAvals.filter(a => !tombstone.has(a.id));

      const finalDes   = des.length  > 0  ? des   : lsGet<DesempenhoMensalRH[]>('rh_desempenho', []);
      const finalPros  = pros.length > 0  ? pros  : lsGet<PromocaoRH[]>('rh_promocoes', []);
      const finalObs   = obs.length  > 0  ? obs   : lsGet<ObservacaoColaboradora[]>('rh_obs_colaboradoras', []);

      setColaboradoras(finalCols);
      setDesempenhoMensal(finalDes);
      setPromocoes(finalPros);
      setBonusMensal(bons);
      setHistoricoConfigBonus(cfgBons.length ? cfgBons : [finalBonus]);
      setConfigBonusLider(finalBonus);
      setConfigRemuneracao(finalRems);
      setConfigCriterios(finalCris);
      setAvaliacoes(finalAvals);
      setObsColaboradoras(finalObs);
      setCandidatas(cands);

      // Só sobrescreve localStorage com dados do Supabase se Supabase retornou algo
      if (finalCols.length)  lsSet('rh_colaboradoras', finalCols);
      if (finalDes.length)   lsSet('rh_desempenho', finalDes);
      if (finalPros.length)  lsSet('rh_promocoes', finalPros);
      if (bons.length)       lsSet('rh_bonus_mensal', bons);
      // Only update LS config if Supabase data is newer than what's already saved locally
      lsSet('rh_config_bonus', finalBonus);
      if (sbRemDate > lsRemDate && activeRems.length) lsSet('rh_config_remuneracao', activeRems);
      if (sbCriDate > lsCriDate && activeCris.length) lsSet('rh_config_criterios', activeCris);
      if (finalAvals.length) lsSet('rh_avaliacoes', finalAvals);
      if (finalObs.length)   lsSet('rh_obs_colaboradoras', finalObs);
      if (cands.length)      lsSet('rh_candidatas', cands);
    } catch {
      // Supabase offline — Phase 1 localStorage data is already showing in the UI, nothing to do
    } finally {
      setRhSyncing(false);
    }
  };

  // ── Colaboradoras ──────────────────────────────────────────────────────────

  const addColaboradora = useCallback(async (data: Omit<ColaboradoraRH, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = `col_${Date.now()}`;
    const now = new Date().toISOString();
    const item: ColaboradoraRH = { ...data, id: newId, createdAt: now, updatedAt: now };
    try {
      const res = await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_colaboradora', data: { ...data, id: newId } },
      });
      const result = res.data;
      if (result?.ok) {
        const saved: ColaboradoraRH = { ...item, id: result.id };
        setColaboradoras(prev => { const next = [...prev, saved]; lsSet('rh_colaboradoras', next); return next; });
        return;
      }
    } catch {}
    // Fallback: save locally with col_ prefix (will show in admin, sync later)
    setColaboradoras(prev => { const next = [...prev, item]; lsSet('rh_colaboradoras', next); return next; });
  }, []);

  const updateColaboradora = useCallback(async (id: string, data: Partial<ColaboradoraRH>) => {
    const update = (prev: ColaboradoraRH[]) => {
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
      lsSet('rh_colaboradoras', next); return next;
    };
    try {
      // For UUID ids (Supabase), upsert via rh-write; for local col_ ids, just update locally
      if (!id.startsWith('col_')) {
        const current = colaboradoras.find(c => c.id === id);
        if (current) {
          await supabase.functions.invoke('rh-write', {
            body: { action: 'upsert_colaboradora', data: { ...current, ...data, id } },
          });
        }
      }
    } catch {}
    setColaboradoras(update);
  }, [colaboradoras]);

  const deleteColaboradora = useCallback(async (id: string) => {
    try {
      if (!id.startsWith('col_')) {
        await supabase.functions.invoke('rh-write', { body: { action: 'delete_colaboradora', data: { id } } });
      }
    } catch {}
    setColaboradoras(prev => { const next = prev.filter(c => c.id !== id); lsSet('rh_colaboradoras', next); return next; });
  }, []);

  // ── Desempenho ─────────────────────────────────────────────────────────────

  const addDesempenho = useCallback(async (data: Omit<DesempenhoMensalRH, 'id' | 'createdAt'>) => {
    const newId = `des_${Date.now()}`;
    const item: DesempenhoMensalRH = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      const res = await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_desempenho', data: { ...data, id: newId } },
      });
      if (res.data?.ok && res.data.id) {
        const saved: DesempenhoMensalRH = { ...item, id: res.data.id };
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
      const current = desempenhoMensal.find(d => d.id === id);
      if (current) {
        await supabase.functions.invoke('rh-write', {
          body: { action: 'upsert_desempenho', data: { ...current, ...data, id } },
        });
      }
    } catch {}
    setDesempenhoMensal(update);
  }, [desempenhoMensal]);

  const deleteDesempenho = useCallback(async (id: string) => {
    try {
      await supabase.functions.invoke('rh-write', { body: { action: 'delete_desempenho', data: { id } } });
    } catch {}
    setDesempenhoMensal(prev => { const next = prev.filter(d => d.id !== id); lsSet('rh_desempenho', next); return next; });
  }, []);

  // ── Promoções ──────────────────────────────────────────────────────────────

  const addPromocao = useCallback(async (data: Omit<PromocaoRH, 'id' | 'createdAt'>) => {
    const newId = `prom_${Date.now()}`;
    const item: PromocaoRH = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      const res = await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_promocao', data: { ...data, id: newId } },
      });
      if (res.data?.ok && res.data.id) {
        const saved: PromocaoRH = { ...item, id: res.data.id };
        setPromocoes(prev => { const next = [saved, ...prev]; lsSet('rh_promocoes', next); return next; });
        await updateColaboradora(data.colaboradoraId, { cargoAtual: data.cargoNovo });
        return;
      }
    } catch {}
    setPromocoes(prev => { const next = [item, ...prev]; lsSet('rh_promocoes', next); return next; });
    // Also update collaborator's cargo
    await updateColaboradora(data.colaboradoraId, { cargoAtual: data.cargoNovo });
  }, [updateColaboradora]);

  // ── Bônus ──────────────────────────────────────────────────────────────────

  const calcularBonus = useCallback((totalFaxinas: number, mediaAvaliacao: number): BonusCalculo => {
    const cfg = configBonusLider ?? DEFAULT_CONFIG_BONUS;
    // Bônus de faxinas: só ativa se SUPERAR a meta (> metaFaxinasMes)
    const metaAtingida = totalFaxinas > cfg.metaFaxinasMes;
    const valorBonusFaxinas = metaAtingida ? totalFaxinas * cfg.multiplicadorFaxina : 0;
    // Bônus de avaliação: 5 estrelas (≥4.9) dobra; ≥meta normal; abaixo = 0
    const atingiu5estrelas = mediaAvaliacao >= 4.9;
    const atingiuMetaAvaliacao = mediaAvaliacao >= cfg.metaAvaliacao;
    const bonus5 = cfg.bonusAvaliacao5estrelas ?? cfg.bonusAvaliacao * 2;
    const valorBonusAvaliacao = atingiu5estrelas
      ? bonus5
      : atingiuMetaAvaliacao
        ? cfg.bonusAvaliacao
        : 0;
    const totalBonus = valorBonusFaxinas + valorBonusAvaliacao;
    const totalReceber = cfg.salarioFixo + totalBonus;
    return { valorBonusFaxinas, valorBonusAvaliacao, totalBonus, totalReceber, metaAtingida, atingiuMetaAvaliacao, atingiu5estrelas };
  }, [configBonusLider]);

  const addBonusMensal = useCallback(async (data: Omit<BonusMensalRH, 'id' | 'createdAt'>) => {
    const newId = `bon_${Date.now()}`;
    const item: BonusMensalRH = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      const res = await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_bonus_mensal', data: { ...data, id: newId } },
      });
      if (res.data?.ok && res.data.id) {
        const saved: BonusMensalRH = { ...item, id: res.data.id };
        setBonusMensal(prev => { const next = [...prev, saved]; lsSet('rh_bonus_mensal', next); return next; });
        return;
      }
    } catch {}
    setBonusMensal(prev => { const next = [...prev, item]; lsSet('rh_bonus_mensal', next); return next; });
  }, []);

  // ── Avaliações ─────────────────────────────────────────────────────────────

  const addAvaliacao = useCallback(async (data: Omit<AvaliacaoCliente, 'id' | 'createdAt'>) => {
    const item: AvaliacaoCliente = { ...data, id: `aval_${Date.now()}`, createdAt: new Date().toISOString() };
    try {
      await supabase.functions.invoke('rh-write', {
        body: {
          action: 'upsert_avaliacao',
          data: {
            colaboradoraId: data.colaboradoraId,
            nomeCliente: data.nomeCliente,
            dataFaxina: data.dataFaxina || null,
            estrelas: data.estrelas,
            comentario: data.comentario || null,
          },
        },
      });
    } catch {}
    setAvaliacoes(prev => { const next = [item, ...prev]; lsSet('rh_avaliacoes', next); return next; });
  }, []);

  // ── Observações de Colaboradoras ───────────────────────────────────────────

  const addObservacao = useCallback(async (data: Omit<ObservacaoColaboradora, 'id' | 'createdAt'>) => {
    const newId = `obs_${Date.now()}`;
    const item: ObservacaoColaboradora = { ...data, id: newId, createdAt: new Date().toISOString() };
    try {
      const res = await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_observacao', data: { ...data, id: newId } },
      });
      if (res.data?.ok && res.data.id) {
        const saved: ObservacaoColaboradora = { ...item, id: res.data.id };
        setObsColaboradoras(prev => { const next = [saved, ...prev]; lsSet('rh_obs_colaboradoras', next); return next; });
        return;
      }
    } catch {}
    setObsColaboradoras(prev => { const next = [item, ...prev]; lsSet('rh_obs_colaboradoras', next); return next; });
  }, []);

  const deleteObservacao = useCallback(async (id: string) => {
    try {
      await supabase.functions.invoke('rh-write', { body: { action: 'delete_observacao', data: { id } } });
    } catch {}
    setObsColaboradoras(prev => { const next = prev.filter(o => o.id !== id); lsSet('rh_obs_colaboradoras', next); return next; });
  }, []);

  const deleteAvaliacao = useCallback(async (id: string) => {
    // Add to tombstone FIRST — prevents Phase 2 from restoring the review even if Supabase delete is slow
    const tombstone = lsGet<string[]>('rh_deleted_avals', []);
    if (!tombstone.includes(id)) lsSet('rh_deleted_avals', [...tombstone, id]);
    // Remove from local state immediately
    setAvaliacoes(prev => { const next = prev.filter(a => a.id !== id); lsSet('rh_avaliacoes', next); return next; });
    // Delete from Supabase in background
    try {
      await supabase.functions.invoke('rh-write', { body: { action: 'delete_avaliacao', data: { id } } });
    } catch {}
  }, []);

  // ── Candidatas (Contratação) ───────────────────────────────────────────────

  const addCandidatura = useCallback(async (data: Omit<CandidataRH, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newId = `cand_${Date.now()}`;
    const item: CandidataRH = { ...data, id: newId, createdAt: now, updatedAt: now };
    try {
      const res = await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_candidatura', data: { ...data, id: newId } },
      });
      if (res.data?.ok && res.data.id) {
        const r = res.data.row;
        const saved: CandidataRH = r
          ? { id: r.id, nome: r.nome, data: r.data, telefone: r.telefone, status: r.status, dadosFormulario: r.dados_formulario, notasEntrevista: r.notas_entrevista, observacoes: r.observacoes, createdAt: r.created_at, updatedAt: r.updated_at }
          : { ...item, id: res.data.id };
        setCandidatas(prev => { const next = [saved, ...prev]; lsSet('rh_candidatas', next); return next; });
        return;
      }
    } catch {}
    setCandidatas(prev => { const next = [item, ...prev]; lsSet('rh_candidatas', next); return next; });
  }, []);

  const updateCandidatura = useCallback(async (id: string, data: Partial<CandidataRH>) => {
    const upd = (prev: CandidataRH[]) => { const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c); lsSet('rh_candidatas', next); return next; };
    try {
      const current = candidatas.find(c => c.id === id);
      if (current) {
        await supabase.functions.invoke('rh-write', {
          body: { action: 'upsert_candidatura', data: { ...current, ...data, id } },
        });
      }
    } catch {}
    setCandidatas(upd);
  }, [candidatas]);

  const deleteCandidatura = useCallback(async (id: string) => {
    try {
      await supabase.functions.invoke('rh-write', { body: { action: 'delete_candidatura', data: { id } } });
    } catch {}
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
      await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_config_bonus', data },
      });
    } catch {}
    setConfigBonusLider(item);
    setHistoricoConfigBonus(prev => [item, ...prev.map(c => c.id === configBonusLider?.id ? { ...c, vigenciaFim: new Date().toISOString().split('T')[0] } : c)]);
    lsSet('rh_config_bonus', item);
  }, [configBonusLider]);

  const updateConfigRemuneracao = useCallback(async (items: Omit<ConfiguracaoRemuneracaoRH, 'id' | 'createdAt'>[]) => {
    const saved = items.map((item, i) => ({ ...item, id: `rem_${Date.now()}_${i}`, createdAt: new Date().toISOString() }));
    try {
      await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_config_remuneracao', data: items },
      });
    } catch {}
    setConfigRemuneracao(saved);
    lsSet('rh_config_remuneracao', saved);
  }, []);

  const updateConfigCriterios = useCallback(async (items: Omit<ConfiguracaoCriteriosRH, 'id' | 'createdAt'>[]) => {
    const saved = items.map((item, i) => ({ ...item, id: `crit_${Date.now()}_${i}`, createdAt: new Date().toISOString() }));
    try {
      await supabase.functions.invoke('rh-write', {
        body: { action: 'upsert_config_criterios', data: items },
      });
    } catch {}
    setConfigCriterios(saved);
    lsSet('rh_config_criterios', saved);
  }, []);

  // ── Sync local collaborators to Supabase ───────────────────────────────────

  const syncToSupabase = useCallback(async (): Promise<{ synced: number; errors: number }> => {
    // Only sync user-created (col_) — never seed_ records
    const localColabs = colaboradoras.filter(c => c.id.startsWith('col_'));
    const localAvals  = avaliacoes.filter(a => a.id.startsWith('aval_'));
    let errors = 0;
    const mapping: Record<string, string> = {};

    // ── Step 1: sync collaborators ─────────────────────────────────────────
    if (localColabs.length > 0) {
      try {
        const res = await supabase.functions.invoke('rh-write', {
          body: { action: 'sync_colaboradoras', data: localColabs },
        });
        const result = res.data;
        if (result?.ok) {
          for (const r of (result.results ?? [])) {
            if (r.supabaseId && !r.error) mapping[r.localId] = r.supabaseId;
            else errors++;
          }
        } else {
          errors += localColabs.length;
        }
      } catch {
        errors += localColabs.length;
      }

      // Update colaboradoras in state/LS with new Supabase UUIDs
      if (Object.keys(mapping).length > 0) {
        setColaboradoras(prev => {
          const next = prev.map(c => {
            const newId = mapping[c.id];
            return newId ? { ...c, id: newId } : c;
          });
          lsSet('rh_colaboradoras', next);
          return next;
        });
      }
    }

    // ── Step 2: sync local evaluations ────────────────────────────────────
    // For each local aval, resolve colaboradora ID (mapped UUID or existing UUID)
    let syncedAvals = 0;
    const updatedAvals = avaliacoes.map(a => {
      // Update colaboradoraId to the new Supabase UUID if it was just mapped
      const newColabId = mapping[a.colaboradoraId];
      return newColabId ? { ...a, colaboradoraId: newColabId } : a;
    });

    for (const aval of localAvals) {
      const colabId = mapping[aval.colaboradoraId] ?? aval.colaboradoraId;
      // Skip if colaboradora is still local (not yet synced)
      if (colabId.startsWith('col_') || colabId.startsWith('seed_')) { errors++; continue; }
      try {
        const res = await supabase.functions.invoke('rh-write', {
          body: {
            action: 'upsert_avaliacao',
            data: {
              colaboradoraId: colabId,
              nomeCliente:    aval.nomeCliente,
              dataFaxina:     aval.dataFaxina  || null,
              estrelas:       aval.estrelas,
              comentario:     aval.comentario  || null,
            },
          },
        });
        if (res.data?.ok) syncedAvals++;
        else errors++;
      } catch { errors++; }
    }

    // ── Step 3: push ALL colaboradoras (UUID + seed_ + col_ not yet mapped) ─────
    // Includes seed_ records — rh-write now resolves them by name in Supabase
    // so 'seed_vanielen' → finds existing Supabase Vaniele → updates her cargo/data
    const allColabs = colaboradoras.filter(c => !mapping[c.id]); // skip already-synced col_ above
    if (allColabs.length > 0) {
      try {
        const res = await supabase.functions.invoke('rh-write', {
          body: { action: 'sync_colaboradoras', data: allColabs },
        });
        // Update LS: if a seed_ or col_ got resolved to a real UUID, replace the ID
        const step3Results: { localId: string; supabaseId: string | null }[] = res.data?.results ?? [];
        const newMapping: Record<string, string> = {};
        for (const r of step3Results) {
          if (r.supabaseId && r.localId !== r.supabaseId) newMapping[r.localId] = r.supabaseId;
        }
        if (Object.keys(newMapping).length > 0) {
          setColaboradoras(prev => {
            const next = prev.map(c => newMapping[c.id] ? { ...c, id: newMapping[c.id] } : c);
            lsSet('rh_colaboradoras', next);
            return next;
          });
        }
      } catch {}
    }

    // Update state/LS with new colaboradora IDs — keep aval_ items as fallback
    // (RLS blocks reading avaliacoes from Supabase with anon key, so we keep
    //  them in localStorage as the source of truth for the admin UI)
    setAvaliacoes(() => {
      lsSet('rh_avaliacoes', updatedAvals);
      return updatedAvals;
    });

    return { synced: Object.keys(mapping).length + syncedAvals, errors };
  }, [colaboradoras, avaliacoes]);

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
      avaliacoes, rhLoading, rhSyncing,
      addColaboradora, updateColaboradora, deleteColaboradora, syncToSupabase,
      addDesempenho, updateDesempenho, deleteDesempenho,
      addPromocao, addBonusMensal, calcularBonus,
      addAvaliacao, getMediaAvaliacoesMes, deleteAvaliacao,
      observacoes: obsColaboradoras, addObservacao, deleteObservacao,
      candidatas, addCandidatura, updateCandidatura, deleteCandidatura,
      updateConfigBonusLider, updateConfigRemuneracao, updateConfigCriterios,
      getElegibilidade, getMesesNaEmpresa,
    }}>
      {children}
    </RHContext.Provider>
  );
};
