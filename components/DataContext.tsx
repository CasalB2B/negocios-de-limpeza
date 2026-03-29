import React, { createContext, useContext, useState, useEffect } from 'react';
import { ServiceStatus, Address } from '../types';
import { supabase } from '../lib/supabase';

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
  price?: number;
  notes?: string;
  photos?: { before: string[], after: string[] };
  collaboratorId?: string;
  collaboratorName?: string;
  duration: 4 | 6 | 8; // Duração estimada para cálculo de repasse
  createdAt: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addresses: Address[];
  type: 'FIXO' | 'AVULSO' | 'POS_OBRA' | 'PRIMEIRA_LIMPEZA' | string;
  password?: string;
  photo?: string;
  createdAt: number;
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
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'LOST';
  chatSummary?: string;
  clientPhotos?: string[];
  createdAt: number;
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
  loading: boolean;
  
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
  logoutAdmin: () => void;
  markAllNotificationsRead: () => Promise<void>;
  updatePlatformSettings: (settings: PlatformSettings) => Promise<void>;
  
  markTransactionPaid: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  quotes: Quote[];
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'status'>) => Promise<Quote>;
  updateQuoteStatus: (id: string, status: Quote['status']) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- DADOS MOCK PARA DEMONSTRAÇÃO (SEED) ---
// Estes dados só aparecem se a conexão com o Supabase falhar
const mockServiceDefinitions: ServiceDefinition[] = [
  {
    id: 'srv_1',
    name: 'Primeira Limpeza',
    description: 'Limpeza profunda e completa. Foco nas suas prioridades. 1 ou 2 colaboradoras.',
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
      { id: 'tier_grande', name: '2 Colaboradoras (3+ quartos ou banheiros)', value: 3, price: 520 }
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
      minDisplacement: 20 
  });

  const [clients, setClients] = useState<ClientUser[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // --- PERSISTÊNCIA DE SESSÃO (INIT) ---
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(() => {
    const saved = localStorage.getItem('auth_client');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorUser | null>(() => {
    const saved = localStorage.getItem('auth_collab');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('auth_admin') === 'true';
  });

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
        type: 'HOUSE', 
        isMain: false
    })) : [],
    type: u.type || 'AVULSO',
    photo: u.photo || undefined,
    password: u.password || undefined,
    createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now()
  });

  const mapDbUserToCollab = (u: any): CollaboratorUser => ({
    id: u.id,
    name: u.name || 'Colaboradora',
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
    type: s.type || 'Serviço',
    date: s.date || '',
    time: s.time || '',
    address: s.address || '',
    status: s.status || 'PENDING',
    price: s.price || 0,
    notes: s.notes || '',
    duration: s.duration || 4, // Default 4h if missing
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

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
        // Tenta conectar ao Supabase e buscar configurações
        const { data: sDefs, error: sDefError } = await supabase.from('service_definitions').select('*');
        if (sDefError) throw sDefError; // Força cair no catch se der erro (modo offline)

        if (sDefs && sDefs.length > 0) {
            setServiceDefinitions(sDefs.map(mapDbDefToApp));
        }

        // Fetch Settings
        const { data: settingsData } = await supabase.from('platform_settings').select('*').single();
        if (settingsData) {
            setPlatformSettings({
                hourlyRate: settingsData.hourly_rate,
                minDisplacement: settingsData.min_displacement,
                payouts: settingsData.payouts,
                botPrompt: settingsData.bot_prompt || undefined,
            });
        }

        const { data: users } = await supabase.from('app_users').select('*');
        const { data: addresses } = await supabase.from('addresses').select('*');
        
        if (users) {
            const rawClients = users.filter(u => u.role === 'CLIENT');
            const rawCollabs = users.filter(u => u.role === 'COLLABORATOR');

            const mappedClients = rawClients.map(c => {
                const userAddresses = addresses ? addresses.filter(a => a.user_id === c.id) : [];
                return mapDbUserToClient(c, userAddresses);
            });

            setClients(mappedClients);
            setCollaborators(rawCollabs.map(mapDbUserToCollab));
        }

        const { data: srvs } = await supabase.from('services').select('*').order('created_at', { ascending: false });
        if (srvs) setServices(srvs.map(mapDbServiceToApp));

        const { data: trxs } = await supabase.from('transactions').select('*');
        if (trxs) setTransactions(trxs.map((t: any) => ({
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

        const { data: qts } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
        if (qts) setQuotes(qts.map((q: any) => ({
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
            createdAt: q.created_at ? new Date(q.created_at).getTime() : Date.now()
        })));

    } catch (error) {
        console.warn("Modo Demonstração: Usando dados Mock (Supabase não configurado ou offline).");
        // Carrega Mock Data se falhar
        setClients(mockClients);
        setCollaborators(mockCollaborators);
        setServices(mockServices);
        setServiceDefinitions(mockServiceDefinitions);
        setNotifications([]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        collaborator_name: service.collaboratorName
    };

    const { data, error } = await supabase.from('services').insert(dbService).select();
    
    if (data && !error) {
        setServices(prev => [mapDbServiceToApp(data[0]), ...prev.filter(s => s.id !== service.id)]);
    } else {
        console.warn("Fallback: Serviço salvo apenas localmente.");
    }
  };

  const updateServiceStatus = async (id: string, status: string, additionalData?: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status, ...additionalData } : s));

    const updates: any = { status };
    if (additionalData?.price) updates.price = additionalData.price;
    if (additionalData?.notes) updates.notes = additionalData.notes;
    if (additionalData?.paymentStatus) updates.paymentStatus = additionalData.paymentStatus;
    if (additionalData?.collaboratorId) {
        updates.collaborator_id = additionalData.collaboratorId;
        updates.collaborator_name = additionalData.collaboratorName;
    }

    await supabase.from('services').update(updates).eq('id', id);
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
  const registerClient = async (client: ClientUser): Promise<ClientUser> => {
    const { data: userData, error } = await supabase.from('app_users').insert({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        role: 'CLIENT',
        password: client.password,
        type: 'AVULSO',
    }).select().single();

    if (!error && userData) {
        const finalClient = mapDbUserToClient(userData, []);
        setClients(prev => [...prev, finalClient]);
        setCurrentUser(finalClient);
        localStorage.setItem('auth_client', JSON.stringify(finalClient));
        return finalClient;
    }

    // If insert failed (duplicate email), find and return existing user
    const { data: existing } = await supabase.from('app_users')
        .select('*').eq('email', client.email).single();
    if (existing) {
        const existingClient = mapDbUserToClient(existing, []);
        setCurrentUser(existingClient);
        localStorage.setItem('auth_client', JSON.stringify(existingClient));
        return existingClient;
    }

    // Fallback: save locally only
    setClients(prev => [...prev, client]);
    setCurrentUser(client);
    localStorage.setItem('auth_client', JSON.stringify(client));
    return client;
  };

  const updateClient = async (id: string, data: Partial<ClientUser>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentUser && currentUser.id === id) {
        const updatedUser = { ...currentUser, ...data };
        setCurrentUser(updatedUser);
        localStorage.setItem('auth_client', JSON.stringify(updatedUser));
    }

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.photo) updates.photo = data.photo;

    await supabase.from('app_users').update(updates).eq('id', id);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
    if (currentUser?.id === id) logoutClient();
  };

  const loginClient = async (email: string, password: string): Promise<ClientUser | null> => {
    const localUser = clients.find(c => c.email === email && c.password === password);
    if (localUser) {
        setCurrentUser(localUser);
        localStorage.setItem('auth_client', JSON.stringify(localUser));
        return localUser;
    }
    const { data: user } = await supabase.from('app_users').select('*').eq('email', email).eq('role', 'CLIENT').single();
    if (user && user.password === password) {
        const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', user.id);
        const clientObj = mapDbUserToClient(user, addrs || []);
        setCurrentUser(clientObj);
        localStorage.setItem('auth_client', JSON.stringify(clientObj));
        return clientObj;
    }
    return null;
  };

  const logoutClient = () => {
      setCurrentUser(null);
      localStorage.removeItem('auth_client');
  }

  // --- ACTIONS: CLIENT ADDRESSES ---
  const addClientAddress = async (clientId: string, address: Address) => {
    if (currentUser) {
        const updatedAddresses = [...currentUser.addresses, address];
        const updatedUser = { ...currentUser, addresses: updatedAddresses };
        setCurrentUser(updatedUser);
        localStorage.setItem('auth_client', JSON.stringify(updatedUser));
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
        zip: address.cep
    };
    await supabase.from('addresses').insert(dbAddress).select();
  };

  const updateClientAddress = async (clientId: string, address: Address) => {
     if (currentUser) {
        const updatedAddresses = currentUser.addresses.map(a => a.id === address.id ? address : a);
        const updatedUser = { ...currentUser, addresses: updatedAddresses };
        setCurrentUser(updatedUser);
        localStorage.setItem('auth_client', JSON.stringify(updatedUser));
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
        zip: address.cep
    };
    await supabase.from('addresses').update(dbAddress).eq('id', address.id);
  };

  const deleteClientAddress = async (clientId: string, addressId: string | number) => {
    if (currentUser) {
        const updatedAddresses = currentUser.addresses.filter(a => a.id !== addressId);
        const updatedUser = { ...currentUser, addresses: updatedAddresses };
        setCurrentUser(updatedUser);
        localStorage.setItem('auth_client', JSON.stringify(updatedUser));
        setClients(prev => prev.map(c => c.id === currentUser.id ? updatedUser : c));
    }
    await supabase.from('addresses').delete().eq('id', addressId);
  };

  // --- ACTIONS: COLLABORATORS ---
  const registerCollaborator = async (collab: CollaboratorUser) => {
    setCollaborators(prev => [...prev, collab]);

    const { data, error } = await supabase.from('app_users').insert({
        name: collab.name,
        email: collab.email,
        phone: collab.phone,
        role: 'COLLABORATOR',
        status: 'AVAILABLE',
        photo: collab.photo,
        password: collab.password,
        level: collab.level 
    }).select().single();

    if (data && !error) {
        setCollaborators(prev => prev.map(c => c.id === collab.id ? mapDbUserToCollab(data) : c));
    } else {
        console.warn("Fallback: Colaborador salvo localmente.");
    }
  };

  const updateCollaborator = async (id: string, data: Partial<CollaboratorUser>) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentCollaborator?.id === id) {
        const updatedCollab = { ...currentCollaborator, ...data };
        setCurrentCollaborator(updatedCollab);
        localStorage.setItem('auth_collab', JSON.stringify(updatedCollab));
    }

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.status) updates.status = data.status;
    if (data.photo) updates.photo = data.photo;
    if (data.password) updates.password = data.password;
    if (data.level) updates.level = data.level;

    await supabase.from('app_users').update(updates).eq('id', id);
  };

  const deleteCollaborator = async (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
  };

  const loginCollaborator = async (email: string, password: string): Promise<boolean> => {
    const localUser = collaborators.find(c => c.email === email && c.password === password);
    if (localUser) {
        setCurrentCollaborator(localUser);
        localStorage.setItem('auth_collab', JSON.stringify(localUser));
        return true;
    }
    const { data: user } = await supabase.from('app_users').select('*').eq('email', email).eq('role', 'COLLABORATOR').single();
    if (user && user.password === password) {
        const collabObj = mapDbUserToCollab(user);
        setCurrentCollaborator(collabObj);
        localStorage.setItem('auth_collab', JSON.stringify(collabObj));
        return true;
    }
    return false;
  };

  const logoutCollaborator = () => {
      setCurrentCollaborator(null);
      localStorage.removeItem('auth_collab');
  }

  // --- ADMIN ---
  const loginAdmin = async (user: string, pass: string): Promise<boolean> => {
    if (user === 'admin' && pass === 'admin') {
        setAdminLoggedIn(true);
        localStorage.setItem('auth_admin', 'true');
        return true;
    }
    // Check DB for Admin user (for scalability)
    const { data: dbUser } = await supabase.from('app_users').select('*').eq('email', user).eq('role', 'ADMIN').single();
    if (dbUser && dbUser.password === pass) {
        setAdminLoggedIn(true);
        localStorage.setItem('auth_admin', 'true');
        return true;
    }
    return false;
  };
  const logoutAdmin = () => {
      setAdminLoggedIn(false);
      localStorage.removeItem('auth_admin');
  }

  // --- MISC & SETTINGS ---
  const markAllNotificationsRead = async () => setNotifications(prev => prev.map(n => ({...n, read: true})));
  
  // Atualiza as configurações e grava no DB
  const updatePlatformSettings = async (s: PlatformSettings) => {
      setPlatformSettings(s);
      const { error } = await supabase.from('platform_settings').upsert({
          id: 1,
          hourly_rate: s.hourlyRate,
          min_displacement: s.minDisplacement,
          payouts: s.payouts,
          bot_prompt: s.botPrompt ?? null,
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

    const { data, error } = await supabase.from('quotes').insert({
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
        status: 'NEW',
        chat_summary: quoteData.chatSummary || ''
    }).select().single();

    if (data && !error) {
        const saved: Quote = { ...localQuote, id: data.id, createdAt: new Date(data.created_at).getTime() };
        setQuotes(prev => prev.map(q => q.id === localQuote.id ? saved : q));
        return saved;
    }
    return localQuote;
  };

  const updateQuoteStatus = async (id: string, status: Quote['status']) => {
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      await supabase.from('quotes').update({ status }).eq('id', id);
  };

  const deleteQuote = async (id: string) => {
      setQuotes(prev => prev.filter(q => q.id !== id));
      await supabase.from('quotes').delete().eq('id', id);
  };

  return (
    <DataContext.Provider value={{ 
      services, clients, collaborators, notifications, serviceDefinitions, transactions, platformSettings,
      currentUser, currentCollaborator, adminLoggedIn, loading,
      addService, updateServiceStatus, 
      addServiceDefinition, updateServiceDefinition, deleteServiceDefinition,
      registerClient, updateClient, deleteClient, loginClient, logoutClient,
      addClientAddress, updateClientAddress, deleteClientAddress,
      registerCollaborator, updateCollaborator, deleteCollaborator, loginCollaborator, logoutCollaborator,
      loginAdmin, logoutAdmin, markAllNotificationsRead, updatePlatformSettings, markTransactionPaid, deleteTransaction,
      quotes, addQuote, updateQuoteStatus, deleteQuote
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