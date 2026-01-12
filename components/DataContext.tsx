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

export interface PayoutMatrix {
  hours4: number;
  hours6: number;
  hours8: number;
}

export interface PlatformSettings {
  payouts: {
    junior: PayoutMatrix;
    senior: PayoutMatrix;
    master: PayoutMatrix;
  };
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
  duration: string | number; // Alterado para aceitar '2h' e números 
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

// --- DADOS MOCK (FALLBACK) ---
const mockServiceDefinitions: ServiceDefinition[] = [
  { id: 'srv_1', name: 'Limpeza Residencial', description: 'Manutenção semanal.', icon: 'sparkles', pricingModel: 'ROOMS', basePrice: 150.00, pricePerUnit: 40.00, pricePerBath: 30.00, extras: [], active: true }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);

  const [services, setServices] = useState<Service[]>([]);
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>(mockServiceDefinitions);

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

  // --- MAPPERS (CONVERT DB SNAKE_CASE TO APP CAMELCASE) ---
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
    paymentStatus: (s.payment_status as any) || 'PENDING',
    price: s.price || 0,
    notes: s.notes || '',
    duration: s.duration || 4,
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
    imageUrl: d.image_url
  });

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Definitions
      const { data: sDefs } = await supabase.from('service_definitions').select('*');
      if (sDefs && sDefs.length > 0) setServiceDefinitions(sDefs.map(mapDbDefToApp));

      // Settings
      const { data: settingsData } = await supabase.from('platform_settings').select('*').single();
      if (settingsData) {
        setPlatformSettings({
          hourlyRate: settingsData.hourly_rate || 60,
          minDisplacement: settingsData.min_displacement || 20,
          payouts: settingsData.payouts || platformSettings.payouts
        });
      }

      // Users
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

      // Services
      const { data: srvs } = await supabase.from('services').select('*').order('created_at', { ascending: false });
      if (srvs) setServices(srvs.map(mapDbServiceToApp));

      // Transactions
      const { data: trxs } = await supabase.from('transactions').select('*');
      if (trxs) setTransactions(trxs as any);

    } catch (error) {
      console.warn("Offline ou erro de conexão:", error);
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
    // Estimativa de duração
    const estimatedDuration = service.duration || (service.price && service.price > 300 ? 8 : service.price && service.price > 180 ? 6 : 4);
    const enrichedService = { ...service, duration: estimatedDuration };

    // Update Local
    setServices(prev => [enrichedService, ...prev]);
    await addNotificationInternal({
      type: 'NEW_REQUEST',
      title: 'Nova solicitação',
      desc: `${service.type} solicitada por ${service.clientName}.`
    });

    // DB Insert
    const dbService = {
      id: service.id,
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
      created_at: new Date(service.createdAt).toISOString()
    };

    const { data } = await supabase.from('services').insert(dbService).select();
    if (data) setServices(prev => [mapDbServiceToApp(data[0]), ...prev.filter(s => s.id !== service.id)]);
  };

  const updateServiceStatus = async (id: string, status: string, additionalData?: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status, ...additionalData } : s));

    const updates: any = { status };
    if (additionalData?.price !== undefined) updates.price = additionalData.price;
    if (additionalData?.notes !== undefined) updates.notes = additionalData.notes;
    if (additionalData?.paymentStatus !== undefined) updates.payment_status = additionalData.paymentStatus;
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
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      pricing_model: def.pricingModel,
      base_price: def.basePrice,
      price_per_unit: def.pricePerUnit,
      price_per_bath: def.pricePerBath,
      active: def.active,
      extras: def.extras,
      pricing_tiers: def.pricingTiers,
      image_url: def.imageUrl
    };

    await supabase.from('service_definitions').insert(dbDef);
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
      pricing_tiers: def.pricingTiers,
      image_url: def.imageUrl
    };
    await supabase.from('service_definitions').update(dbDef).eq('id', def.id);
  };

  const deleteServiceDefinition = async (id: string) => {
    setServiceDefinitions(prev => prev.filter(s => s.id !== id));
    await supabase.from('service_definitions').delete().eq('id', id);
  };

  // --- ACTIONS: CLIENTS ---
  const registerClient = async (client: ClientUser) => {
    setClients(prev => [...prev, client]);
    // Auto-login se for cadastro proprio
    if (client.id.startsWith('user_') || client.id.startsWith('manual')) {
      setCurrentUser(client);
      localStorage.setItem('auth_client', JSON.stringify(client));
    }

    const { data: userData } = await supabase.from('app_users').insert({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      role: 'CLIENT',
      type: client.type
    }).select().single();

    if (userData) {
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
      // Re-fetch to ensure sync
      fetchData();
    }
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

    await supabase.from('app_users').update(updates).eq('id', id);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
    if (currentUser?.id === id) logoutClient();
  };

  const loginClient = async (email: string): Promise<boolean> => {
    // 1. Try Local State (Fast)
    const localUser = clients.find(c => c.email === email);
    if (localUser) {
      setCurrentUser(localUser);
      localStorage.setItem('auth_client', JSON.stringify(localUser));
      return true;
    }
    // 2. Try DB (Slow but accurate)
    const { data: user } = await supabase.from('app_users').select('*').eq('email', email).eq('role', 'CLIENT').single();
    if (user) {
      const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', user.id);
      const clientObj = mapDbUserToClient(user, addrs || []);
      setCurrentUser(clientObj);
      localStorage.setItem('auth_client', JSON.stringify(clientObj));
      return true;
    }
    return false;
  };

  const logoutClient = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_client');
  }

  // --- ACTIONS: CLIENT ADDRESSES ---
  const addClientAddress = async (clientId: string, address: Address) => {
    // Optimistic Update
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
    await supabase.from('addresses').insert(dbAddress);
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

    const { data } = await supabase.from('app_users').insert({
      id: collab.id,
      name: collab.name,
      email: collab.email,
      phone: collab.phone,
      role: 'COLLABORATOR',
      status: 'AVAILABLE',
      photo: collab.photo,
      password: collab.password,
      level: collab.level
    }).select().single();

    if (data) {
      setCollaborators(prev => prev.map(c => c.id === collab.id ? mapDbUserToCollab(data) : c));
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
    // 1. Hardcoded fallback (for instant access)
    if (user === 'admin' && pass === 'admin') {
      setAdminLoggedIn(true);
      localStorage.setItem('auth_admin', 'true');
      return true;
    }
    // 2. DB Check
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
  const markAllNotificationsRead = async () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const updatePlatformSettings = async (s: PlatformSettings) => {
    setPlatformSettings(s);
    await supabase.from('platform_settings').upsert({
      id: 1,
      hourly_rate: s.hourlyRate,
      min_displacement: s.minDisplacement,
      payouts: s.payouts
    });
  };

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