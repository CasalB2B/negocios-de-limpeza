import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAoVoltar } from '../lib/aoVoltar';
import { empresaId } from '../lib/empresa';
import { entrar, sair, criarAcesso, definirSenha, excluirAcesso, cadastrarCliente } from '../lib/conta';
import { ServiceStatus, Address } from '../types';
import { supabase } from '../lib/supabase';
import { sendBookingConfirmation } from '../lib/whatsapp';
import { fotoParaGuardar } from '../lib/foto';

// --- CACHE HELPERS (stale-while-revalidate) ---
const CACHE_VER = '2';
const CACHE_MAX_MS = 30 * 60 * 1000; // 30 min

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`ndl_cache_${key}`);
    if (!raw) return null;
    const { d, t, v } = JSON.parse(raw);
    if (v !== CACHE_VER || Date.now() - t > CACHE_MAX_MS) return null;
    return d as T;
  } catch { return null; }
}

function setCache<T>(key: string, data: T): void {
  try { localStorage.setItem(`ndl_cache_${key}`, JSON.stringify({ d: data, t: Date.now(), v: CACHE_VER })); } catch {}
}


// The logged-in person is kept on the device. Never with a heavy embedded photo (it does not fit in the
// device storage and broke a login), and a full storage never stops the app.
const guardarSessao = (chave: 'auth_client' | 'auth_collab', obj: any) => {
  try { localStorage.setItem(chave, JSON.stringify({ ...obj, photo: fotoParaGuardar(obj?.photo) })); }
  catch { try { localStorage.setItem(chave, JSON.stringify({ ...obj, photo: undefined })); } catch { /* storage full */ } }
};

export function clearCache(): void {
  try { Object.keys(localStorage).filter(k => k.startsWith('ndl_cache_')).forEach(k => localStorage.removeItem(k)); } catch {}
}

// --- TIPOS DE DADOS ---
export type PricingModel = 'ROOMS' | 'HOURLY' | 'SQM' | 'FIXED';

export interface ServiceExtra {
  id: string;
  label: string;
  price: number;
}

export interface PricingTier {
  id: string;
  name: string;
  value: number;
  price: number;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string; 
  pricingModel: PricingModel;
  basePrice: number;
  pricePerUnit: number;
  pricePerBath?: number;
  extras: ServiceExtra[];
  pricingTiers?: PricingTier[];
  active: boolean;
}

// Nova estrutura de Settings: Matriz de Pagamento
export interface PayoutMatrix {
    hours4: number;
    hours6: number;
    hours8: number;
}

export interface PlatformSettings {
  // Matriz de Repasse (R$) por nível e horas
  payouts: {
      junior: PayoutMatrix;
      senior: PayoutMatrix;
      master: PayoutMatrix;
  };
  hourlyRate: number; // Valor base de cobrança ao cliente (referência)
  minDisplacement: number;
  botPrompt?: string; // Prompt customizado da Nina (bot WhatsApp)
  contactPhone?: string; // Telefone da empresa para notificações WhatsApp
  adminPhoto?: string; // URL da foto do administrador
  adminName?: string; // Nome do administrador
  ninaEnabled?: boolean;
  workingHoursEnabled?: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingHoursDays?: string;
  awayMessage?: string;
  followUpEnabled?: boolean;
  followUpChatHours?: number;   // 1ª tentativa: re-engajar quem parou no meio do fluxo
  followUpChatHours2?: number;  // 2ª tentativa: segunda chance de re-engajamento
  followUpHumanDelays?: number[]; // [horas1, horas2] para quem recebeu orçamento e sumiu
  ninaTone?: string;
  ninaSilenceHours?: number; // horas de inatividade para reativar Nina automaticamente
  templateWelcome?: string;
  templateProposal?: string;
  templateConfirmation?: string;
}

export interface Service {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  date: string;
  time: string;
  address: string;
  status: ServiceStatus | string;
  paymentStatus?: 'PENDING' | 'SIGNAL_PAID' | 'FULL_PAID';
  paymentMethod?: string;
  signalAmount?: number;
  signalStatus?: 'sending' | 'sent' | 'paid' | 'failed' | 'skipped' | null;
  signalSentAt?: string | null;
  signalError?: string | null;
  price?: number;
  notes?: string;
  photos?: { before: string[], after: string[] };
  collaboratorId?: string;
  collaboratorName?: string;
  collaboratorIds?: string[];
  collaboratorNames?: string[];
  duration: 4 | 6 | 8; // Duração estimada para cálculo de repasse
  collab_payment_id?: string | null;
  createdAt: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addresses: Address[];
  type: 'NOVO' | 'FIXO_SEMANAL' | 'FIXO_QUINZENAL' | 'FIXO_MENSAL' | 'EVENTUAL' | string;
  password?: string;
  photo?: string;
  createdAt: number;
  // Registration data (invoice, birthday messages)
  ddi?: string;
  documento?: string;
  tipoDocumento?: 'CPF' | 'CNPJ' | string;
  nascimento?: string; // YYYY-MM-DD
  sexo?: string;
  bloqueado?: boolean;
  descricao?: string;
}

export interface CollaboratorUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  photo?: string;
  status: 'AVAILABLE' | 'BUSY' | 'ON_SERVICE' | 'OFFLINE';
  level: 'JUNIOR' | 'SENIOR' | 'MASTER';
}

export interface Notification {
  id: string;
  type: 'NEW_CLIENT' | 'NEW_REQUEST' | 'ALERT' | 'SUCCESS' | 'INFO';
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

export interface Quote {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  cep: string;
  propertyType: string;
  rooms: string;
  priorities: string;
  internalCleaning: string;
  renovation: string;
  serviceOption: string;
  status: string;
  chatSummary?: string;
  clientPhotos?: string[];
  // CRM fields
  tags?: string[];
  crmNotes?: string;
  estimatedValue?: number;
  lastContactedAt?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressCity?: string;
  customFields?: Record<string, string>;
  source?: string;
  createdAt: number;
}

export interface CrmTag {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  serviceType: string;
  entity: string;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  method: string;
  receipt?: string | null;
}

interface DataContextType {
  services: Service[];
  clients: ClientUser[];
  collaborators: CollaboratorUser[];
  notifications: Notification[];
  serviceDefinitions: ServiceDefinition[];
  transactions: Transaction[]; 
  platformSettings: PlatformSettings;
  currentUser: ClientUser | null;
  currentCollaborator: CollaboratorUser | null;
  adminLoggedIn: boolean;
  reviewerMode: boolean;
  loading: boolean;
  isRefreshing: boolean;

  addService: (service: Service) => Promise<void>;
  updateServiceStatus: (id: string, status: string, additionalData?: Partial<Service>) => Promise<void>;
  
  addServiceDefinition: (def: ServiceDefinition) => Promise<void>;
  updateServiceDefinition: (def: ServiceDefinition) => Promise<void>;
  deleteServiceDefinition: (id: string) => Promise<void>;

  registerClient: (client: ClientUser) => Promise<ClientUser>;
  updateClient: (id: string, data: Partial<ClientUser>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  loginClient: (email: string, password: string) => Promise<ClientUser | null>;
  logoutClient: () => void;
  
  addClientAddress: (clientId: string, address: Address) => Promise<void>;
  updateClientAddress: (clientId: string, address: Address) => Promise<void>;
  deleteClientAddress: (clientId: string, addressId: string | number) => Promise<void>;

  registerCollaborator: (collab: CollaboratorUser) => Promise<void>;
  updateCollaborator: (id: string, data: Partial<CollaboratorUser>) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  loginCollaborator: (email: string, password: string) => Promise<boolean>;
  logoutCollaborator: () => void;
  
  loginAdmin: (user: string, pass: string) => Promise<boolean>;
  entrarUnico: (email: string, senha: string) => Promise<{ destino: string | null; erro?: string }>;
  logoutAdmin: () => void;
  markAllNotificationsRead: () => Promise<void>;
  updatePlatformSettings: (settings: PlatformSettings) => Promise<void>;
  
  markTransactionPaid: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  quotes: Quote[];
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => Promise<Quote>;
  updateQuote: (id: string, data: Partial<Quote>) => Promise<void>;
  updateQuoteStatus: (id: string, status: Quote['status']) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  crmTags: CrmTag[];
  addCrmTag: (tag: Omit<CrmTag, 'id'>) => Promise<CrmTag>;
  deleteCrmTag: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- DADOS MOCK PARA DEMONSTRAÇÃO (SEED) ---
// Estes dados só aparecem se a conexão com o Supabase falhar
const mockServiceDefinitions: ServiceDefinition[] = [
  {
    id: 'srv_1',
    name: 'Primeira Limpeza',
    description: 'Limpeza profunda e completa. Foco nas suas prioridades. 1 ou 2 profissionais.',
    icon: 'sparkles',
    pricingModel: 'ROOMS',
    basePrice: 320.00,    // 1 colaboradora — até 2 quartos/banheiros
    pricePerUnit: 0,
    pricePerBath: 0,
    extras: [
      {id: 'ex_1', label: 'Limpeza de Geladeira', price: 50},
      {id: 'ex_2', label: 'Limpeza de Forno', price: 40},
      {id: 'ex_3', label: 'Limpeza de Janelas (todas)', price: 60},
    ],
    pricingTiers: [
      { id: 'tier_grande', name: '2 Profissionais (3+ quartos ou banheiros)', value: 3, price: 520 }
    ],
    active: true
  },
  {
    id: 'srv_2',
    name: 'Passadoria',
    description: 'Suas roupas passadas e prontas para usar. Cobrado por hora.',
    icon: 'shirt',
    pricingModel: 'HOURLY',
    basePrice: 0,
    pricePerUnit: 18.50,
    extras: [],
    active: true
  },
  {
    id: 'srv_3',
    name: 'Limpeza Comercial',
    description: 'Limpeza de escritórios, clínicas e espaços comerciais. Cobrado por m².',
    icon: 'briefcase',
    pricingModel: 'SQM',
    basePrice: 0,
    pricePerUnit: 25.00,
    extras: [
      {id: 'ex_com_1', label: 'Limpeza de Vidros Externos', price: 80},
      {id: 'ex_com_2', label: 'Sanitização Completa', price: 100},
    ],
    active: true
  },
  {
    id: 'srv_4',
    name: 'Pós-Obra',
    description: 'Limpeza profunda após reformas, pinturas e construções. Cobrado por m².',
    icon: 'hardhat',
    pricingModel: 'SQM',
    basePrice: 0,
    pricePerUnit: 25.00,
    extras: [
      {id: 'ex_po_1', label: 'Remoção de Entulho Leve', price: 120},
      {id: 'ex_po_2', label: 'Limpeza de Vidros (tinta)', price: 80},
    ],
    active: true
  }
];

const mockClients: ClientUser[] = [];
const mockCollaborators: CollaboratorUser[] = [];
const mockServices: Service[] = [];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>(mockServiceDefinitions);
  
  // Default Settings (Overwritten by DB)
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({ 
      payouts: {
          junior: { hours4: 60, hours6: 90, hours8: 120 },
          senior: { hours4: 80, hours6: 120, hours8: 160 },
          master: { hours4: 100, hours6: 150, hours8: 200 },
      },
      hourlyRate: 60,
      minDisplacement: 20,
      contactPhone: '',
  });

  const [clients, setClients] = useState<ClientUser[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [crmTags, setCrmTags] = useState<CrmTag[]>([]);

  // --- PERSISTÊNCIA DE SESSÃO (INIT) ---
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(() => {
    try {
      const saved = localStorage.getItem('auth_client');
      return saved ? JSON.parse(saved) : null;
    } catch { localStorage.removeItem('auth_client'); return null; }
  });

  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorUser | null>(() => {
    try {
      const saved = localStorage.getItem('auth_collab');
      return saved ? JSON.parse(saved) : null;
    } catch { localStorage.removeItem('auth_collab'); return null; }
  });

  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('auth_admin') === 'true';
  });

  // Login de revisor (ex.: análise do app pela Meta): só enxerga a tela do WhatsApp e não carrega dados internos.
  const [reviewerMode, setReviewerMode] = useState<boolean>(() => localStorage.getItem('auth_reviewer') === 'true');

  // --- MAPPERS ---
  const mapDbUserToClient = (u: any, addresses: any[] = []): ClientUser => ({
    id: u.id,
    name: u.name || 'Cliente Sem Nome',
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    addresses: Array.isArray(addresses) ? addresses.map(a => ({
        id: a.id,
        alias: a.title || 'Principal',
        street: a.street || '',
        number: a.number || '',
        complement: a.complement || '',
        district: a.neighborhood || '',
        city: a.city || '',
        state: a.state || '',
        cep: a.zip || '',
        type: (a.type as any) || 'HOUSE',
        notes: a.notes || '',
        isMain: !!a.is_main
    })) : [],
    type: u.type || 'AVULSO',
    ddi: u.ddi || '55',
    documento: u.documento || '',
    tipoDocumento: u.tipo_documento || 'CPF',
    nascimento: u.nascimento || '',
    sexo: u.sexo || '',
    bloqueado: !!u.bloqueado,
    descricao: u.descricao || '',
    photo: u.photo || undefined,
    password: u.password || undefined,
    createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now()
  });

  const mapDbUserToCollab = (u: any): CollaboratorUser => ({
    id: u.id,
    name: u.name || 'Profissional',
    email: u.email || '',
    phone: u.phone || '',
    photo: u.photo,
    password: u.password,
    status: (u.status as any) || 'AVAILABLE',
    level: (u.level as any) || 'JUNIOR'
  });

  const mapDbServiceToApp = (s: any): Service => ({
    id: s.id,
    clientId: s.client_id,
    clientName: s.client_name || 'Cliente',
    collaboratorId: s.collaborator_id,
    collaboratorName: s.collaborator_name,
    collaboratorIds: Array.isArray(s.collaborator_ids) ? s.collaborator_ids : [],
    collaboratorNames: Array.isArray(s.collaborator_names) ? s.collaborator_names : [],
    type: s.type || 'Serviço',
    date: s.date || '',
    time: s.time || '',
    address: s.address || '',
    status: s.status || 'PENDING',
    price: s.price || 0,
    paymentStatus: s.payment_status || undefined,
    paymentMethod: s.payment_method || undefined,
    signalAmount: s.signal_amount != null ? Number(s.signal_amount) : undefined,
    signalStatus: s.signal_status ?? null,
    signalSentAt: s.signal_sent_at ?? null,
    signalError: s.signal_error ?? null,
    notes: s.notes || '',
    duration: s.duration || 4, // Default 4h if missing
    collab_payment_id: s.collab_payment_id ?? null,
    createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now()
  });

  const mapDbDefToApp = (d: any): ServiceDefinition => ({
    id: d.id,
    name: d.name,
    description: d.description || '',
    icon: d.icon || 'sparkles',
    pricingModel: (d.pricing_model as PricingModel) || 'ROOMS',
    basePrice: d.base_price || 0,
    pricePerUnit: d.price_per_unit || 0,
    pricePerBath: d.price_per_bath || 0,
    active: d.active !== false,
    extras: Array.isArray(d.extras) ? d.extras : [],
    pricingTiers: Array.isArray(d.pricing_tiers) ? d.pricing_tiers : [],
    imageUrl: undefined 
  });

  // --- FETCH DATA (parallel + stale-while-revalidate) ---
  const fetchData = async () => {
    // Revisor: nada de clientes, colaboradoras, serviços ou finanças — só o necessário para a tela do WhatsApp.
    if (localStorage.getItem('auth_reviewer') === 'true') {
      const { data: sd } = await supabase.from('platform_settings').select('working_hours_enabled, working_hours_start, working_hours_end, working_hours_days, away_message, follow_up_enabled, follow_up_hours, follow_up_hours_2, follow_up_steps, template_welcome, template_proposal, template_confirmation').eq('id', 1).single();
      if (sd) {
        setPlatformSettings(prev => ({
          ...prev,
          workingHoursEnabled: sd.working_hours_enabled || false,
          workingHoursStart: sd.working_hours_start || '08:00',
          workingHoursEnd: sd.working_hours_end || '18:00',
          workingHoursDays: sd.working_hours_days || '1,2,3,4,5,6',
          awayMessage: sd.away_message || undefined,
          followUpEnabled: sd.follow_up_enabled || false,
          followUpChatHours: sd.follow_up_hours ?? 2,
          followUpChatHours2: sd.follow_up_hours_2 ?? 26,
          templateWelcome: sd.template_welcome || undefined,
          templateProposal: sd.template_proposal || undefined,
          templateConfirmation: sd.template_confirmation || undefined,
        }));
      }
      setLoading(false);
      return;
    }

    // 1. Serve cached data immediately — zero perceived latency on repeat visits
    const cachedServices = getCached<Service[]>('services');
    const cachedClients = getCached<ClientUser[]>('clients');
    const cachedCollabs = getCached<CollaboratorUser[]>('collabs');
    if (cachedServices) setServices(cachedServices);
    if (cachedClients) setClients(cachedClients);
    if (cachedCollabs) setCollaborators(cachedCollabs);
    if (cachedServices || cachedClients) setLoading(false);

    setIsRefreshing(true);
    try {
        // 2. All 8 fetches in parallel — replaces 8 sequential round trips with 1
        const [sDefsRes, settingsRes, usersRes, addressesRes, srvsRes, trxsRes, qtsRes, tagsRes] = await Promise.all([
            supabase.from('service_definitions').select('*'),
            supabase.from('platform_settings').select('*').single(),
            supabase.from('app_users').select('*'),
            supabase.from('addresses').select('*'),
            supabase.from('services').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('transactions').select('*').order('created_at', { ascending: false }),
            supabase.from('quotes').select('*').order('created_at', { ascending: false }),
            supabase.from('crm_tags').select('*').order('name'),
        ]);

        if (sDefsRes.error) throw sDefsRes.error;

        if (sDefsRes.data && sDefsRes.data.length > 0) {
            setServiceDefinitions(sDefsRes.data.map(mapDbDefToApp));
        }

        if (settingsRes.data) {
            const sd = settingsRes.data;
            setPlatformSettings({
                hourlyRate: sd.hourly_rate,
                minDisplacement: sd.min_displacement,
                payouts: sd.payouts,
                botPrompt: sd.bot_prompt || undefined,
                contactPhone: sd.contact_phone || undefined,
                adminPhoto: sd.admin_photo || undefined,
                adminName: sd.admin_name || undefined,
                ninaEnabled: sd.nina_enabled !== false,
                workingHoursEnabled: sd.working_hours_enabled || false,
                workingHoursStart: sd.working_hours_start || '08:00',
                workingHoursEnd: sd.working_hours_end || '18:00',
                workingHoursDays: sd.working_hours_days || '1,2,3,4,5,6',
                awayMessage: sd.away_message || 'Olá! Nosso atendimento é de segunda a sábado, das 8h às 18h. Retornaremos em breve! 😊',
                followUpEnabled: sd.follow_up_enabled || false,
                followUpChatHours: sd.follow_up_hours ?? 2,
                followUpChatHours2: sd.follow_up_hours_2 ?? 26,
                followUpHumanDelays: (() => { try { const v = JSON.parse(sd.follow_up_steps || ''); if (Array.isArray(v) && v.every((n: unknown) => typeof n === 'number')) return v; } catch { /* ignore */ } return [24, 48]; })(),
                ninaTone: sd.nina_tone || 'casual',
                ninaSilenceHours: sd.nina_silence_hours ?? 24,
                templateWelcome: sd.template_welcome || undefined,
                templateProposal: sd.template_proposal || undefined,
                templateConfirmation: sd.template_confirmation || undefined,
            });
        }

        if (usersRes.data) {
            const addrs = addressesRes.data ?? [];
            const rawClients = usersRes.data.filter((u: any) => u.role === 'CLIENT');
            const rawCollabs = usersRes.data.filter((u: any) => u.role === 'COLLABORATOR');
            const mappedClients = rawClients.map((c: any) => mapDbUserToClient(c, addrs.filter((a: any) => a.user_id === c.id)));
            const mappedCollabs = rawCollabs.map(mapDbUserToCollab);
            setClients(mappedClients);
            setCollaborators(mappedCollabs);
            setCache('clients', mappedClients);
            setCache('collabs', mappedCollabs);
        }

        if (srvsRes.data) {
            const mapped = srvsRes.data.map(mapDbServiceToApp);
            setServices(mapped);
            setCache('services', mapped);
        }

        if (trxsRes.data) setTransactions(trxsRes.data.map((t: any) => ({
            id: t.id,
            type: t.type,
            serviceType: t.service_type || '',
            entity: t.entity || '',
            date: t.date || '',
            amount: t.amount || 0,
            status: t.status || 'PENDING',
            method: t.method || '',
            receipt: t.receipt || null,
        })));

        if (qtsRes.data) setQuotes(qtsRes.data.map((q: any) => ({
            id: q.id,
            name: q.name || '',
            email: q.email || '',
            whatsapp: q.whatsapp || '',
            cep: q.cep || '',
            propertyType: q.property_type || '',
            rooms: q.rooms || '',
            priorities: q.priorities || '',
            internalCleaning: q.internal_cleaning || '',
            renovation: q.renovation || '',
            serviceOption: q.service_option || '',
            status: q.status || 'NEW',
            chatSummary: q.chat_summary || '',
            tags: Array.isArray(q.tags) ? q.tags : [],
            crmNotes: q.crm_notes || '',
            estimatedValue: q.estimated_value || undefined,
            lastContactedAt: q.last_contacted_at || undefined,
            addressStreet: q.address_street || '',
            addressNumber: q.address_number || '',
            addressDistrict: q.address_district || '',
            addressCity: q.address_city || '',
            customFields: q.custom_fields || {},
            source: q.source || 'web',
            createdAt: q.created_at ? new Date(q.created_at).getTime() : Date.now()
        })));

        if (tagsRes.data) setCrmTags(tagsRes.data.map((t: any) => ({ id: t.id, name: t.name, color: t.color || '#6366f1' })));

    } catch (error) {
        console.warn("Modo Demonstração: Usando dados Mock (Supabase não configurado ou offline).");
        if (!cachedServices) {
            setClients(mockClients);
            setCollaborators(mockCollaborators);
            setServices(mockServices);
            setServiceDefinitions(mockServiceDefinitions);
            setNotifications([]);
        }
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  // Realtime events sent while the phone was asleep are lost; reload when the app comes back.
  useAoVoltar(() => fetchData(), 30_000);

  // Right after a login (any role): load that person's company data.
  useEffect(() => {
    const aoEntrar = () => fetchData();
    window.addEventListener('ndl-login', aoEntrar);
    return () => window.removeEventListener('ndl-login', aoEntrar);
  }, []);

  // Logins from before the secure login only have flags in localStorage, with no real session:
  // with per-company access rules they would see an empty system. Send them to log in once.
  useEffect(() => {
    const temFlag = localStorage.getItem('auth_admin') === 'true' || !!localStorage.getItem('auth_collab') || !!localStorage.getItem('auth_client');
    if (!temFlag) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) return;
      ['auth_admin', 'auth_reviewer', 'auth_collab', 'auth_client'].forEach(k => localStorage.removeItem(k));
      setAdminLoggedIn(false); setReviewerMode(false); setCurrentCollaborator(null); setCurrentUser(null);
      window.location.replace('/#/entrar');
    });
  }, []);

  useEffect(() => {
    fetchData();

    // Request browser notification permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const sendBrowserNotif = (title: string, body: string, url = '/admin/crm') => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (localStorage.getItem('auth_reviewer') === 'true') return;
      // Use Service Worker when available (works in background too)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION', title, body, url, tag: 'nl-realtime'
        });
      } else {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    };

    // Realtime subscriptions — keeps data fresh and fires browser notifications
    const servicesChannel = supabase
      .channel('realtime-services')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes' }, (payload) => {
        const name = (payload.new as any)?.name || 'Cliente';
        sendBrowserNotif('📋 Novo Lead!', `${name} chegou pelo WhatsApp.`);
        fetchData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_sessions' }, (payload) => {
        // Dispara evento customizado para o CRM ouvir em tempo real
        const phone = (payload.new as any)?.phone || '';
        const history = (payload.new as any)?.history || [];
        const lastMsg = history[history.length - 1];
        if (lastMsg?.role === 'user') {
          sendBrowserNotif('💬 Nova mensagem WhatsApp!', `Resposta de ${phone}`);
          window.dispatchEvent(new CustomEvent('whatsapp-session-updated', {
            detail: { phone, history }
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => fetchData())
      .subscribe();

    // Own channel: if any table in a channel isn't published for realtime, Supabase drops the
    // whole channel. Payment confirmations (webhook → services/transactions) must always arrive.
    const paymentsChannel = supabase
      .channel('realtime-payments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'services' }, (payload) => {
        const clientName = (payload.new as any)?.client_name || 'Cliente';
        const type = (payload.new as any)?.type || 'Serviço';
        sendBrowserNotif('🧹 Nova Solicitação!', `${clientName} pediu: ${type}`);
        fetchData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'services' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(servicesChannel); supabase.removeChannel(paymentsChannel); };
  }, []);

  const addNotificationInternal = async (notif: Omit<Notification, 'id' | 'read' | 'time'>) => {
    const newNotif = {
      id: Date.now().toString(),
      type: notif.type,
      title: notif.title,
      desc: notif.desc,
      time: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // --- ACTIONS: SERVICES ---
  const addService = async (service: Service) => {
    const estimatedDuration = service.duration || (service.price && service.price > 300 ? 8 : service.price && service.price > 180 ? 6 : 4);
    const enrichedService = { ...service, duration: estimatedDuration };

    setServices(prev => [enrichedService, ...prev]);
    await addNotificationInternal({
        type: 'NEW_REQUEST',
        title: 'Nova solicitação',
        desc: `${service.type} solicitada por ${service.clientName}.`
    });

    const dbService = {
        // id auto-generated by DB
        client_id: service.clientId,
        client_name: service.clientName,
        type: service.type,
        date: service.date,
        time: service.time,
        address: service.address,
        status: service.status,
        price: service.price,
        notes: service.notes,
        duration: estimatedDuration,
        collaborator_id: service.collaboratorId,
        collaborator_name: service.collaboratorName,
        collaborator_ids: service.collaboratorIds || [],
        collaborator_names: service.collaboratorNames || [],
    };

    const { data, error } = await supabase.from('services').insert(dbService).select();
    
    if (data && !error) {
        setServices(prev => [mapDbServiceToApp(data[0]), ...prev.filter(s => s.id !== service.id)]);
        clearCache();
        if (['SCHEDULED', 'CONFIRMED'].includes(service.status)) sendBookingConfirmation(data[0].id);
    } else {
        // A booking that only exists on screen can't be charged, reminded or seen by the team.
        setServices(prev => prev.filter(s => s.id !== service.id));
        console.error('[addService]', error);
        window.alert(`Não foi possível salvar o agendamento. Nada foi gravado.\n\nDetalhe: ${error?.message || 'sem resposta do servidor'}`);
    }
  };

  const updateServiceStatus = async (id: string, status: string, additionalData?: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status, ...additionalData } : s));

    const updates: any = { status };
    if (additionalData?.price) updates.price = additionalData.price;
    if (additionalData?.notes) updates.notes = additionalData.notes;
    if (additionalData?.paymentStatus) updates.payment_status = additionalData.paymentStatus;
    if (additionalData?.collaboratorId) {
        updates.collaborator_id = additionalData.collaboratorId;
        updates.collaborator_name = additionalData.collaboratorName;
    }
    if (additionalData?.photos) updates.photos = additionalData.photos;
    if ((additionalData as any)?.checkin_lat) updates.checkin_lat = (additionalData as any).checkin_lat;
    if ((additionalData as any)?.checkin_lng) updates.checkin_lng = (additionalData as any).checkin_lng;
    if ((additionalData as any)?.checkin_time) updates.checkin_time = (additionalData as any).checkin_time;
    if ((additionalData as any)?.checkout_notes) updates.checkout_notes = (additionalData as any).checkout_notes;

    await supabase.from('services').update(updates).eq('id', id);
    clearCache();
  };

  // --- ACTIONS: SERVICE DEFINITIONS ---
  const addServiceDefinition = async (def: ServiceDefinition) => {
    setServiceDefinitions(prev => [...prev, def]);
    
    const dbDef = {
        name: def.name,
        description: def.description,
        icon: def.icon,
        pricing_model: def.pricingModel,
        base_price: def.basePrice,
        price_per_unit: def.pricePerUnit,
        price_per_bath: def.pricePerBath,
        active: def.active,
        extras: def.extras,
        pricing_tiers: def.pricingTiers
    };
    
    const { error } = await supabase.from('service_definitions').insert(dbDef).select();
    if (error) console.warn("Fallback: Definição de serviço salva apenas localmente.");
  };

  const updateServiceDefinition = async (def: ServiceDefinition) => {
    setServiceDefinitions(prev => prev.map(s => s.id === def.id ? def : s));

    const dbDef = {
        name: def.name,
        description: def.description,
        icon: def.icon,
        pricing_model: def.pricingModel,
        base_price: def.basePrice,
        price_per_unit: def.pricePerUnit,
        price_per_bath: def.pricePerBath,
        active: def.active,
        extras: def.extras,
        pricing_tiers: def.pricingTiers
    };
    await supabase.from('service_definitions').update(dbDef).eq('id', def.id);
  };

  const deleteServiceDefinition = async (id: string) => {
    setServiceDefinitions(prev => prev.filter(s => s.id !== id));
    await supabase.from('service_definitions').delete().eq('id', id);
  };

  // --- ACTIONS: CLIENTS ---
  // Client records. From the admin panel: creates the record (and a login when a password is given)
  // without touching the admin's own session. From the public pages with a password: creates the client's
  // secure login and signs them in. Throws with a readable message on failure.
  const registerClient = async (client: ClientUser): Promise<ClientUser> => {
    const senha = client.password || '';
    const doPainel = localStorage.getItem('auth_admin') === 'true';

    if (doPainel && senha) {
        const r = await criarAcesso({ name: client.name, email: client.email, phone: client.phone, senha, role: 'CLIENT' });
        if (!r.ok) throw new Error(r.erro || 'Não foi possível criar o acesso.');
        const { data } = await supabase.from('app_users').select('*').eq('id', r.id).single();
        const novo = mapDbUserToClient(data, []);
        setClients(prev => [...prev, novo]);
        return novo;
    }

    if (!doPainel && senha) {
        const r = await cadastrarCliente({ name: client.name, email: client.email, phone: client.phone, address: client.address, senha });
        if (!r.ok) {
            // Same e-mail and same password: just sign in.
            const existente = await loginClient(client.email, senha);
            if (existente) return existente;
            throw new Error(r.erro || 'Não foi possível criar a conta.');
        }
        const logado = await loginClient(client.email, senha);
        if (!logado) throw new Error('Conta criada, mas não foi possível entrar. Tente fazer login.');
        setClients(prev => [...prev, logado]);
        return logado;
    }

    // Record only, no login.
    const { data: userData, error } = await supabase.from('app_users').insert({
        // No e-mail is stored as null: the e-mail column is unique and '' would block the next client without one.
        name: client.name, email: client.email?.trim() || null, phone: client.phone, address: client.address,
        role: 'CLIENT', type: client.type || 'NOVO',
        ddi: client.ddi || '55', documento: client.documento || null, tipo_documento: client.documento ? (client.tipoDocumento || 'CPF') : null,
        nascimento: client.nascimento || null, sexo: client.sexo || null, bloqueado: !!client.bloqueado, descricao: client.descricao || null,
    }).select().single();
    if (error || !userData) throw new Error(error?.message || 'Não foi possível salvar o cliente.');
    const finalClient = mapDbUserToClient(userData, []);
    setClients(prev => [...prev, finalClient]);
    if (!doPainel) {
        setCurrentUser(finalClient);
        guardarSessao('auth_client', finalClient);
    }
    return finalClient;
  };

  const updateClient = async (id: string, data: Partial<ClientUser>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentUser && currentUser.id === id) {
        const updatedUser = { ...currentUser, ...data };
        setCurrentUser(updatedUser);
        guardarSessao('auth_client', updatedUser);
    }

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.photo) updates.photo = data.photo;
    if (data.type !== undefined) updates.type = data.type;
    if (data.ddi !== undefined) updates.ddi = data.ddi || '55';
    if (data.documento !== undefined) updates.documento = data.documento || null;
    if (data.tipoDocumento !== undefined) updates.tipo_documento = data.tipoDocumento || null;
    if (data.nascimento !== undefined) updates.nascimento = data.nascimento || null;
    if (data.sexo !== undefined) updates.sexo = data.sexo || null;
    if (data.bloqueado !== undefined) updates.bloqueado = !!data.bloqueado;
    if (data.descricao !== undefined) updates.descricao = data.descricao || null;

    const { error } = await supabase.from('app_users').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
    if (currentUser?.id === id) logoutClient();
  };

  const aplicarLoginCliente = async (user: any): Promise<ClientUser> => {
    const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', user.id);
    const clientObj = mapDbUserToClient(user, addrs || []);
    setCurrentUser(clientObj);
    guardarSessao('auth_client', clientObj);
    return clientObj;
  };

  const loginClient = async (email: string, password: string): Promise<ClientUser | null> => {
    const { perfil: user } = await entrar(email, password, ['CLIENT']);
    return user ? aplicarLoginCliente(user) : null;
  };

  const logoutClient = () => {
      sair();
      setCurrentUser(null);
      localStorage.removeItem('auth_client');
  }

  // --- ACTIONS: CLIENT ADDRESSES ---
  const addClientAddress = async (clientId: string, address: Address) => {
    if (currentUser) {
        const updatedAddresses = [...currentUser.addresses, address];
        const updatedUser = { ...currentUser, addresses: updatedAddresses };
        setCurrentUser(updatedUser);
        guardarSessao('auth_client', updatedUser);
        setClients(prev => prev.map(c => c.id === currentUser.id ? updatedUser : c));
    }

    const dbAddress = {
        user_id: clientId,
        title: address.alias,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.district,
        city: address.city,
        state: address.state,
        zip: address.cep,
        type: address.type || 'HOUSE',
        is_main: !!address.isMain,
        notes: address.notes || null
    };
    setClients(prev => prev.map(c => c.id === clientId && !(currentUser && currentUser.id === clientId) ? { ...c, addresses: [...(c.addresses || []), address] } : c));
    const { error } = await supabase.from('addresses').insert({ ...dbAddress, id: String(address.id) });
    if (error) throw new Error(error.message);
  };

  const updateClientAddress = async (clientId: string, address: Address) => {
     if (currentUser) {
        const updatedAddresses = currentUser.addresses.map(a => a.id === address.id ? address : a);
        const updatedUser = { ...currentUser, addresses: updatedAddresses };
        setCurrentUser(updatedUser);
        guardarSessao('auth_client', updatedUser);
        setClients(prev => prev.map(c => c.id === currentUser.id ? updatedUser : c));
     }

     const dbAddress = {
        title: address.alias,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.district,
        city: address.city,
        state: address.state,
        zip: address.cep,
        type: address.type || 'HOUSE',
        is_main: !!address.isMain,
        notes: address.notes || null
    };
    await supabase.from('addresses').update(dbAddress).eq('id', address.id);
  };

  const deleteClientAddress = async (clientId: string, addressId: string | number) => {
    if (currentUser) {
        const updatedAddresses = currentUser.addresses.filter(a => a.id !== addressId);
        const updatedUser = { ...currentUser, addresses: updatedAddresses };
        setCurrentUser(updatedUser);
        guardarSessao('auth_client', updatedUser);
        setClients(prev => prev.map(c => c.id === currentUser.id ? updatedUser : c));
    }
    await supabase.from('addresses').delete().eq('id', addressId);
  };

  // --- ACTIONS: COLLABORATORS ---
  const registerCollaborator = async (collab: CollaboratorUser) => {
    const r = await criarAcesso({
        name: collab.name, email: collab.email, phone: collab.phone, photo: collab.photo,
        level: collab.level, senha: collab.password || '', role: 'COLLABORATOR',
    });
    if (!r.ok) { window.alert(r.erro || 'Não foi possível criar o acesso.'); return; }
    const { data } = await supabase.from('app_users').select('*').eq('id', r.id).single();
    if (data) setCollaborators(prev => [...prev, mapDbUserToCollab(data)]);
  };

  const updateCollaborator = async (id: string, data: Partial<CollaboratorUser>) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentCollaborator?.id === id) {
        const updatedCollab = { ...currentCollaborator, ...data };
        setCurrentCollaborator(updatedCollab);
        guardarSessao('auth_collab', updatedCollab);
    }

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.status) updates.status = data.status;
    if (data.photo) updates.photo = data.photo;
    if (data.level) updates.level = data.level;

    // Passwords live only in Supabase Auth now.
    if (data.password) await definirSenha({ id }, data.password);
    if (Object.keys(updates).length) await supabase.from('app_users').update(updates).eq('id', id);
  };

  const deleteCollaborator = async (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    await excluirAcesso(id);
  };

  const aplicarLoginColaboradora = (user: any) => {
    const collabObj = mapDbUserToCollab(user);
    setCurrentCollaborator(collabObj);
    guardarSessao('auth_collab', collabObj);
  };

  const loginCollaborator = async (email: string, password: string): Promise<boolean> => {
    const { perfil: user } = await entrar(email, password, ['COLLABORATOR']);
    if (user) aplicarLoginColaboradora(user);
    return !!user;
  };

  const logoutCollaborator = () => {
      sair();
      setCurrentCollaborator(null);
      localStorage.removeItem('auth_collab');
  }

  // --- ADMIN ---
  const loginAdmin = async (user: string, pass: string): Promise<boolean> => {
    // Secure login (Supabase Auth); legacy passwords are migrated on the first login.
    const { perfil: dbUser } = await entrar(user, pass, ['ADMIN', 'REVIEWER']);
    if (dbUser) { aplicarLoginAdmin(dbUser); return true; }
    return false;
  };

  const aplicarLoginAdmin = (dbUser: any) => {
        const isReviewer = dbUser.role === 'REVIEWER';
        if (isReviewer) {
            localStorage.setItem('auth_reviewer', 'true');
            clearCache();
            setServices([]); setClients([]); setCollaborators([]); setTransactions([]); setQuotes([]); setNotifications([]);
        } else {
            localStorage.removeItem('auth_reviewer');
        }
        setReviewerMode(isReviewer);
        setAdminLoggedIn(true);
        localStorage.setItem('auth_admin', 'true');
        fetchData();
  };

  // Single login screen: signs in whoever it is and says where to go.
  const entrarUnico = async (email: string, senha: string): Promise<{ destino: string | null; erro?: string }> => {
    const { perfil, erro } = await entrar(email, senha, ['ADMIN', 'REVIEWER', 'COLLABORATOR', 'CLIENT']);
    if (!perfil) return { destino: null, erro };
    if (perfil.role === 'ADMIN' || perfil.role === 'REVIEWER') {
        aplicarLoginAdmin(perfil);
        return { destino: perfil.role === 'REVIEWER' ? '/admin/whatsapp' : '/admin/dashboard' };
    }
    if (perfil.role === 'COLLABORATOR') { aplicarLoginColaboradora(perfil); return { destino: '/collab/agenda' }; }
    await aplicarLoginCliente(perfil);
    return { destino: '/client/dashboard' };
  };
  const logoutAdmin = () => {
      sair();
      setAdminLoggedIn(false);
      setReviewerMode(false);
      localStorage.removeItem('auth_admin');
      localStorage.removeItem('auth_reviewer');
  }

  // --- MISC & SETTINGS ---
  const markAllNotificationsRead = async () => setNotifications(prev => prev.map(n => ({...n, read: true})));
  
  // Atualiza as configurações e grava no DB
  const updatePlatformSettings = async (s: PlatformSettings) => {
      setPlatformSettings(s);
      if (reviewerMode) return; // revisor só visualiza
      const { error } = await supabase.from('platform_settings').upsert({
          id: empresaId(),
          hourly_rate: s.hourlyRate,
          min_displacement: s.minDisplacement,
          payouts: s.payouts,
          bot_prompt: s.botPrompt ?? null,
          contact_phone: s.contactPhone ?? null,
          admin_photo: s.adminPhoto ?? null,
          admin_name: s.adminName ?? null,
          nina_enabled: s.ninaEnabled !== false,
          working_hours_enabled: s.workingHoursEnabled ?? false,
          working_hours_start: s.workingHoursStart ?? '08:00',
          working_hours_end: s.workingHoursEnd ?? '18:00',
          working_hours_days: s.workingHoursDays ?? '1,2,3,4,5,6',
          away_message: s.awayMessage ?? null,
          follow_up_enabled: s.followUpEnabled ?? false,
          follow_up_hours: s.followUpChatHours ?? 2,
          follow_up_hours_2: s.followUpChatHours2 ?? 26,
          follow_up_steps: JSON.stringify(s.followUpHumanDelays ?? [24, 48]),
          nina_tone: s.ninaTone ?? 'casual',
          nina_silence_hours: s.ninaSilenceHours ?? 24,
          template_welcome: s.templateWelcome ?? null,
          template_proposal: s.templateProposal ?? null,
          template_confirmation: s.templateConfirmation ?? null,
      });
      if (error) console.error("Erro ao salvar configurações:", error);
  };

  const markTransactionPaid = async (id: string) => {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'PAID' } : t));
      await supabase.from('transactions').update({ status: 'PAID' }).eq('id', id);
  };
  const deleteTransaction = async (id: string) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      await supabase.from('transactions').delete().eq('id', id);
  };

  // --- ACTIONS: QUOTES ---
  const addQuote = async (quoteData: Omit<Quote, 'id' | 'createdAt' | 'status'>): Promise<Quote> => {
    const localQuote: Quote = {
        ...quoteData,
        id: `quote_${Date.now()}`,
        status: 'NEW',
        createdAt: Date.now()
    };
    setQuotes(prev => [localQuote, ...prev]);
    await addNotificationInternal({ type: 'NEW_REQUEST', title: 'Novo Orçamento', desc: `${quoteData.name} solicitou orçamento via chat.` });

    const novoId = crypto.randomUUID();
    const { error } = await supabase.from('quotes').insert({
        id: novoId,
        name: quoteData.name,
        email: quoteData.email,
        whatsapp: quoteData.whatsapp,
        cep: quoteData.cep,
        property_type: quoteData.propertyType,
        rooms: quoteData.rooms,
        priorities: quoteData.priorities,
        internal_cleaning: quoteData.internalCleaning,
        renovation: quoteData.renovation,
        service_option: quoteData.serviceOption,
        address_street: quoteData.addressStreet || '',
        address_number: quoteData.addressNumber || '',
        address_district: quoteData.addressDistrict || '',
        address_city: quoteData.addressCity || '',
        status: 'NEW',
        source: quoteData.source || 'web_chat',
        chat_summary: quoteData.chatSummary || ''
    });

    if (!error) {
        const saved: Quote = { ...localQuote, id: novoId };
        setQuotes(prev => prev.map(q => q.id === localQuote.id ? saved : q));
        return saved;
    }
    return localQuote;
  };

  const updateQuote = async (id: string, data: Partial<Quote>) => {
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
      const dbData: any = {};
      if (data.status !== undefined) dbData.status = data.status;
      if (data.name !== undefined) dbData.name = data.name;
      if (data.email !== undefined) dbData.email = data.email;
      if (data.whatsapp !== undefined) dbData.whatsapp = data.whatsapp;
      if (data.tags !== undefined) dbData.tags = data.tags;
      if (data.crmNotes !== undefined) dbData.crm_notes = data.crmNotes;
      if (data.estimatedValue !== undefined) dbData.estimated_value = data.estimatedValue;
      if (data.lastContactedAt !== undefined) dbData.last_contacted_at = data.lastContactedAt;
      if (data.addressStreet !== undefined) dbData.address_street = data.addressStreet;
      if (data.addressNumber !== undefined) dbData.address_number = data.addressNumber;
      if (data.addressDistrict !== undefined) dbData.address_district = data.addressDistrict;
      if (data.addressCity !== undefined) dbData.address_city = data.addressCity;
      if (data.customFields !== undefined) dbData.custom_fields = data.customFields;
      if (data.propertyType !== undefined) dbData.property_type = data.propertyType;
      if (data.rooms !== undefined) dbData.rooms = data.rooms;
      if (data.priorities !== undefined) dbData.priorities = data.priorities;
      if (data.serviceOption !== undefined) dbData.service_option = data.serviceOption;
      if (Object.keys(dbData).length > 0) {
          await supabase.from('quotes').update(dbData).eq('id', id);
      }
  };

  const updateQuoteStatus = async (id: string, status: Quote['status']) => {
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      await supabase.from('quotes').update({ status }).eq('id', id);
  };

  const addCrmTag = async (tag: Omit<CrmTag, 'id'>): Promise<CrmTag> => {
      const local: CrmTag = { ...tag, id: `tag_${Date.now()}` };
      setCrmTags(prev => [...prev, local]);
      const { data, error } = await supabase.from('crm_tags').insert({ name: tag.name, color: tag.color }).select().single();
      if (data && !error) {
          const saved: CrmTag = { id: data.id, name: data.name, color: data.color };
          setCrmTags(prev => prev.map(t => t.id === local.id ? saved : t));
          return saved;
      }
      return local;
  };

  const deleteCrmTag = async (id: string) => {
      setCrmTags(prev => prev.filter(t => t.id !== id));
      await supabase.from('crm_tags').delete().eq('id', id);
  };

  const deleteQuote = async (id: string) => {
      setQuotes(prev => prev.filter(q => q.id !== id));
      await supabase.from('quotes').delete().eq('id', id);
  };

  return (
    <DataContext.Provider value={{ 
      services, clients, collaborators, notifications, serviceDefinitions, transactions, platformSettings,
      currentUser, currentCollaborator, adminLoggedIn, reviewerMode, loading, isRefreshing,
      addService, updateServiceStatus, 
      addServiceDefinition, updateServiceDefinition, deleteServiceDefinition,
      registerClient, updateClient, deleteClient, loginClient, logoutClient,
      addClientAddress, updateClientAddress, deleteClientAddress,
      registerCollaborator, updateCollaborator, deleteCollaborator, loginCollaborator, logoutCollaborator,
      loginAdmin, entrarUnico, logoutAdmin, markAllNotificationsRead, updatePlatformSettings, markTransactionPaid, deleteTransaction,
      quotes, addQuote, updateQuote, updateQuoteStatus, deleteQuote,
      crmTags, addCrmTag, deleteCrmTag
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};