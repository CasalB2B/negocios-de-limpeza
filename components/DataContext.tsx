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

export interface PlatformSettings {
  commissionRate: number;
  hourlyRate: number;
  minDisplacement: number;
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
  createdAt: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string; // Endereço principal textual
  addresses: Address[]; // Lista completa de endereços
  type: 'FIXO' | 'AVULSO' | 'POS_OBRA' | 'PRIMEIRA_LIMPEZA' | string;
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
}

export interface Notification {
  id: string;
  type: 'NEW_CLIENT' | 'NEW_REQUEST' | 'ALERT' | 'SUCCESS' | 'INFO';
  title: string;
  desc: string;
  time: string;
  read: boolean;
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

  registerClient: (client: ClientUser) => Promise<void>;
  updateClient: (id: string, data: Partial<ClientUser>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  loginClient: (email: string) => Promise<boolean>;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Dados iniciais para seed (caso o banco esteja vazio ou inacessível)
const initialServiceDefinitions: ServiceDefinition[] = [
  {
    id: 'srv_1',
    name: 'Limpeza Padrão',
    description: 'Ideal para manutenção semanal.',
    icon: 'sparkles',
    pricingModel: 'ROOMS',
    basePrice: 120.00,
    pricePerUnit: 40.00,
    pricePerBath: 30.00,
    extras: [],
    pricingTiers: [],
    active: true
  },
  {
    id: 'srv_2',
    name: 'Passadoria',
    description: 'Roupas lavadas e passadas.',
    icon: 'shirt',
    pricingModel: 'HOURLY',
    basePrice: 0,
    pricePerUnit: 0,
    extras: [],
    pricingTiers: [
        { id: 'tier_1', name: 'Pacote 4 Horas', value: 4, price: 120.00 },
        { id: 'tier_2', name: 'Pacote 6 Horas', value: 6, price: 170.00 },
        { id: 'tier_3', name: 'Diária (8 Horas)', value: 8, price: 220.00 }
    ],
    active: true
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>(initialServiceDefinitions);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({ commissionRate: 30, hourlyRate: 50, minDisplacement: 20 });
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorUser | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(false);

  // --- MAPPERS (DB <-> APP) ---
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
    createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now()
  });

  const mapDbUserToCollab = (u: any): CollaboratorUser => ({
    id: u.id,
    name: u.name || 'Colaboradora',
    email: u.email || '',
    phone: u.phone || '',
    photo: u.photo,
    status: (u.status as any) || 'AVAILABLE'
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
        // 1. Service Definitions
        const { data: sDefs, error: sDefError } = await supabase.from('service_definitions').select('*');
        if (!sDefError && sDefs && sDefs.length > 0) {
            setServiceDefinitions(sDefs.map(mapDbDefToApp));
        }

        // 2. Users (Split into Clients & Collaborators)
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

        // 3. Services
        const { data: srvs } = await supabase.from('services').select('*').order('created_at', { ascending: false });
        if (srvs) setServices(srvs.map(mapDbServiceToApp));

        // 4. Transactions
        const { data: trxs } = await supabase.from('transactions').select('*');
        if (trxs) setTransactions(trxs as any);

    } catch (error) {
        console.error("Erro ao carregar dados (pode ser problema de conexão ou configuração do Supabase):", error);
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
        collaborator_id: service.collaboratorId,
        collaborator_name: service.collaboratorName
    };

    // Optimistic Update
    setServices(prev => [service, ...prev]);

    const { data, error } = await supabase.from('services').insert(dbService).select();
    
    if (data && !error) {
        // Replace optimistic with real data
        setServices(prev => [mapDbServiceToApp(data[0]), ...prev.filter(s => s.id !== service.id)]);
        
        await addNotificationInternal({
            type: 'NEW_REQUEST',
            title: 'Nova solicitação',
            desc: `${service.type} solicitada por ${service.clientName}.`
        });
    }
  };

  const updateServiceStatus = async (id: string, status: string, additionalData?: Partial<Service>) => {
    const updates: any = { status };
    if (additionalData?.price) updates.price = additionalData.price;
    if (additionalData?.notes) updates.notes = additionalData.notes;
    if (additionalData?.collaboratorId) {
        updates.collaborator_id = additionalData.collaboratorId;
        updates.collaborator_name = additionalData.collaboratorName;
    }

    // Optimistic Update
    setServices(prev => prev.map(s => s.id === id ? { ...s, status, ...additionalData } : s));

    await supabase.from('services').update(updates).eq('id', id);
  };

  const addServiceDefinition = async (def: ServiceDefinition) => {
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
    const { data } = await supabase.from('service_definitions').insert(dbDef).select();
    if (data) setServiceDefinitions(prev => [...prev, mapDbDefToApp(data[0])]);
  };

  const updateServiceDefinition = async (def: ServiceDefinition) => {
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
    setServiceDefinitions(prev => prev.map(s => s.id === def.id ? def : s));
  };

  const deleteServiceDefinition = async (id: string) => {
    setServiceDefinitions(prev => prev.filter(s => s.id !== id));
    await supabase.from('service_definitions').delete().eq('id', id);
  };

  // --- ACTIONS: CLIENTS ---
  const registerClient = async (client: ClientUser) => {
    // 1. Insert User
    const { data: userData, error } = await supabase.from('app_users').insert({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        role: 'CLIENT'
    }).select().single();

    if (error || !userData) {
        console.error("Erro ao registrar cliente:", error);
        return;
    }

    // 2. Insert Addresses (if any)
    if (client.addresses && client.addresses.length > 0) {
        const addressesToInsert = client.addresses.map(a => ({
            user_id: userData.id,
            title: a.alias,
            street: a.street,
            number: a.number,
            complement: a.complement,
            neighborhood: a.district,
            city: a.city,
            state: a.state,
            zip: a.cep
        }));
        await supabase.from('addresses').insert(addressesToInsert);
    }

    // Refresh Local
    const newClient = mapDbUserToClient(userData, client.addresses);
    setClients(prev => [...prev, newClient]);
    setCurrentUser(newClient);
  };

  const updateClient = async (id: string, data: Partial<ClientUser>) => {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    
    await supabase.from('app_users').update(updates).eq('id', id);
    
    // Atualiza estado local
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentUser && currentUser.id === id) {
        setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
    if (currentUser?.id === id) logoutClient();
  };

  const loginClient = async (email: string): Promise<boolean> => {
    const { data: user } = await supabase.from('app_users').select('*').eq('email', email).eq('role', 'CLIENT').single();
    if (user) {
        // Fetch addresses
        const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', user.id);
        const clientObj = mapDbUserToClient(user, addrs || []);
        setCurrentUser(clientObj);
        return true;
    }
    return false;
  };

  const logoutClient = () => setCurrentUser(null);

  // --- ACTIONS: CLIENT ADDRESSES ---
  const addClientAddress = async (clientId: string, address: Address) => {
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
    const { data } = await supabase.from('addresses').insert(dbAddress).select();
    if (data) {
        fetchData();
    }
  };

  const updateClientAddress = async (clientId: string, address: Address) => {
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
    fetchData();
  };

  const deleteClientAddress = async (clientId: string, addressId: string | number) => {
    await supabase.from('addresses').delete().eq('id', addressId);
    fetchData();
  };

  // --- ACTIONS: COLLABORATORS ---
  const registerCollaborator = async (collab: CollaboratorUser) => {
    const { data } = await supabase.from('app_users').insert({
        name: collab.name,
        email: collab.email,
        phone: collab.phone,
        role: 'COLLABORATOR',
        status: 'AVAILABLE',
        photo: collab.photo
    }).select().single();

    if (data) {
        setCollaborators(prev => [...prev, mapDbUserToCollab(data)]);
    }
  };

  const updateCollaborator = async (id: string, data: Partial<CollaboratorUser>) => {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.status) updates.status = data.status;
    if (data.photo) updates.photo = data.photo;

    await supabase.from('app_users').update(updates).eq('id', id);
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentCollaborator?.id === id) {
        setCurrentCollaborator(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const deleteCollaborator = async (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
  };

  const loginCollaborator = async (email: string, password: string): Promise<boolean> => {
    const { data: user } = await supabase.from('app_users').select('*').eq('email', email).eq('role', 'COLLABORATOR').single();
    if (user) {
        setCurrentCollaborator(mapDbUserToCollab(user));
        return true;
    }
    return false;
  };

  const logoutCollaborator = () => setCurrentCollaborator(null);

  // --- ADMIN ---
  const loginAdmin = async (user: string, pass: string): Promise<boolean> => {
    if (user === 'admin' && pass === 'admin') {
        setAdminLoggedIn(true);
        return true;
    }
    return false;
  };
  const logoutAdmin = () => setAdminLoggedIn(false);

  // --- MISC ---
  const markAllNotificationsRead = async () => setNotifications(prev => prev.map(n => ({...n, read: true})));
  const updatePlatformSettings = async (s: PlatformSettings) => setPlatformSettings(s);
  const markTransactionPaid = async (id: string) => {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'PAID' } : t));
      await supabase.from('transactions').update({ status: 'PAID' }).eq('id', id);
  };
  const deleteTransaction = async (id: string) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      await supabase.from('transactions').delete().eq('id', id);
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
      loginAdmin, logoutAdmin, markAllNotificationsRead, updatePlatformSettings, markTransactionPaid, deleteTransaction
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