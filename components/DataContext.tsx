import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ServiceStatus, Address } from '../types';

// --- TYPES (Mantendo os originais para não quebrar componentes) ---
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

export interface Service {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  date: string;
  time: string;
  address: string;
  status: ServiceStatus | string;
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
  address: string;
  addresses: Address[];
  type: 'FIXO' | 'AVULSO';
  createdAt: number;
}

export interface CollaboratorUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  photo?: string;
  status: 'AVAILABLE' | 'BUSY';
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
  currentUser: ClientUser | null;
  currentCollaborator: CollaboratorUser | null;
  adminLoggedIn: boolean;

  addService: (service: Service) => void;
  updateServiceStatus: (id: string, status: string, additionalData?: Partial<Service>) => void;

  addServiceDefinition: (def: ServiceDefinition) => void;
  updateServiceDefinition: (def: ServiceDefinition) => void;
  deleteServiceDefinition: (id: string) => void;

  registerClient: (client: ClientUser) => void;
  updateClient: (id: string, data: Partial<ClientUser>) => void;
  deleteClient: (id: string) => void;
  loginClient: (email: string) => Promise<boolean>; // Mudou para Promise
  logoutClient: () => void;

  addClientAddress: (clientId: string, address: Address) => void;
  updateClientAddress: (clientId: string, address: Address) => void;
  deleteClientAddress: (clientId: string, addressId: string | number) => void;

  registerCollaborator: (collab: CollaboratorUser) => void;
  updateCollaborator: (id: string, data: Partial<CollaboratorUser>) => void;
  deleteCollaborator: (id: string) => void;
  loginCollaborator: (email: string, password: string) => Promise<boolean>; // Mudou para Promise
  logoutCollaborator: () => void;

  loginAdmin: (user: string, pass: string) => boolean;
  logoutAdmin: () => void;
  markAllNotificationsRead: () => void;

  markTransactionPaid: (id: string) => void;
  deleteTransaction: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- MAPPERS (Snake Case DB <-> Camel Case App) ---
const mapDefFromDB = (db: any): ServiceDefinition => ({
  id: db.id,
  name: db.name,
  description: db.description,
  icon: db.icon,
  pricingModel: db.pricing_model as PricingModel,
  basePrice: db.base_price,
  pricePerUnit: db.price_per_unit,
  pricePerBath: db.price_per_bath,
  extras: db.extras || [],
  pricingTiers: db.pricing_tiers || [],
  active: db.active
});

const mapServiceFromDB = (db: any): Service => ({
  id: db.id,
  clientId: db.client_id,
  clientName: db.client_name,
  type: db.type,
  date: db.date,
  time: db.time,
  address: db.address,
  status: db.status,
  price: db.price,
  notes: db.notes,
  collaboratorId: db.collaborator_id,
  collaboratorName: db.collaborator_name,
  createdAt: new Date(db.created_at).getTime()
});

const mapUserFromDB = (db: any): ClientUser => ({
  id: db.id,
  name: db.name,
  email: db.email,
  phone: db.phone,
  address: db.address,
  addresses: [], // Carregar separado se precisar
  type: 'FIXO', // Padrão
  createdAt: new Date(db.created_at).getTime()
});

const mapCollabFromDB = (db: any): CollaboratorUser => ({
  id: db.id,
  name: db.name,
  email: db.email,
  phone: db.phone,
  photo: db.photo,
  status: db.status as 'AVAILABLE' | 'BUSY'
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- STATES ---
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>([]);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorUser | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // 1. Service Definitions
    const { data: defs } = await supabase.from('service_definitions').select('*');
    if (defs) setServiceDefinitions(defs.map(mapDefFromDB));

    // 2. Services
    const { data: srvs } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    if (srvs) setServices(srvs.map(mapServiceFromDB));

    // 3. Users (Separar Clientes de Colaboradores)
    const { data: users } = await supabase.from('app_users').select('*');
    if (users) {
      setClients(users.filter(u => u.role === 'CLIENT').map(mapUserFromDB));
      setCollaborators(users.filter(u => u.role === 'COLLABORATOR').map(mapCollabFromDB));
    }

    // 4. Transactions
    const { data: trans } = await supabase.from('transactions').select('*');
    if (trans) setTransactions(trans.map((t: any) => ({ ...t, createdAt: new Date(t.created_at).getTime() })));
  };

  // --- ACTIONS ---

  const addService = async (service: Service) => {
    // Optimistic Update
    setServices(prev => [service, ...prev]);

    // DB Insert
    const { data, error } = await supabase.from('services').insert({
      client_id: service.clientId,
      client_name: service.clientName,
      type: service.type,
      date: service.date,
      time: service.time,
      address: service.address,
      status: service.status,
      price: service.price,
      notes: service.notes,
      collaborator_id: service.collaboratorId
    }).select().single();

    if (data) {
      // Replace optimistic item with real one (with ID)
      setServices(prev => prev.map(s => s.id === service.id ? mapServiceFromDB(data) : s));
    } else if (error) {
      console.error("Erro ao criar serviço:", error);
    }
  };

  const updateServiceStatus = async (id: string, status: string, additionalData?: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status, ...additionalData } : s));

    await supabase.from('services').update({
      status,
      collaborator_id: additionalData?.collaboratorId,
      collaborator_name: additionalData?.collaboratorName
    }).eq('id', id);
  };

  // --- DEFINITIONS ---
  const addServiceDefinition = async (def: ServiceDefinition) => {
    setServiceDefinitions(prev => [...prev, def]);
    await supabase.from('service_definitions').insert({
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
    });
  };

  const updateServiceDefinition = async (def: ServiceDefinition) => {
    setServiceDefinitions(prev => prev.map(s => s.id === def.id ? def : s));
    // TODO: Update no Banco
  };

  const deleteServiceDefinition = async (id: string) => {
    setServiceDefinitions(prev => prev.filter(s => s.id !== id));
    await supabase.from('service_definitions').delete().eq('id', id);
  };

  // --- CLIENTS ---
  const registerClient = async (client: ClientUser) => {
    setClients(prev => [...prev, client]);
    if (!currentUser) setCurrentUser(client);

    await supabase.from('app_users').insert({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      role: 'CLIENT'
    });
  };

  const updateClient = async (id: string, data: Partial<ClientUser>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    // Simplificado para update
    await supabase.from('app_users').update({
      name: data.name,
      phone: data.phone,
      address: data.address
    }).eq('id', id);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
  };

  const loginClient = async (email: string) => {
    // Busca REAL no banco
    const { data } = await supabase.from('app_users')
      .select('*')
      .eq('email', email)
      .eq('role', 'CLIENT')
      .single();

    if (data) {
      setCurrentUser(mapUserFromDB(data));
      return true;
    }
    return false;
  };

  const logoutClient = () => setCurrentUser(null);

  // --- ADDRESSES ---
  const addClientAddress = async (clientId: string, address: Address) => {
    // TODO: Implementar tabela addresses separada no Supabase
    // Por enquanto mantemos no state local do App (mas não salva no DB pq a estrutura mudou)
    // Para simplicidade, vamos pular a persistência de endereços extras agora
  };
  const updateClientAddress = (clientId: string, address: Address) => { };
  const deleteClientAddress = (clientId: string, addressId: string | number) => { };

  // --- COLLABORATORS ---
  const registerCollaborator = async (collab: CollaboratorUser) => {
    setCollaborators(prev => [...prev, collab]);
    await supabase.from('app_users').insert({
      name: collab.name,
      email: collab.email,
      phone: collab.phone,
      role: 'COLLABORATOR',
      status: 'AVAILABLE'
      // password não estamos salvando em plain text por segurança, ideal usar Auth
    });
  };

  const updateCollaborator = (id: string, data: Partial<CollaboratorUser>) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteCollaborator = (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
  };

  const loginCollaborator = async (email: string, password: string) => {
    // Login insecurity check (apenas email por enquanto pois não temos senha no DB profile)
    const { data } = await supabase.from('app_users')
      .select('*')
      .eq('email', email)
      .eq('role', 'COLLABORATOR')
      .single();

    if (data) {
      setCurrentCollaborator(mapCollabFromDB(data));
      return true;
    }
    return false;
  };

  const logoutCollaborator = () => setCurrentCollaborator(null);

  // --- ADMIN ---
  const loginAdmin = (user: string, pass: string) => {
    if (user === 'admin' && pass === 'admin') {
      setAdminLoggedIn(true);
      return true;
    }
    return false;
  };
  const logoutAdmin = () => setAdminLoggedIn(false);

  // --- OTHERS ---
  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markTransactionPaid = async (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'PAID' } : t));
    await supabase.from('transactions').update({ status: 'PAID' }).eq('id', id);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return (
    <DataContext.Provider value={{
      services, clients, collaborators, notifications, serviceDefinitions, transactions,
      currentUser, currentCollaborator, adminLoggedIn,
      addService, updateServiceStatus,
      addServiceDefinition, updateServiceDefinition, deleteServiceDefinition,
      registerClient, updateClient, deleteClient, loginClient, logoutClient,
      addClientAddress, updateClientAddress, deleteClientAddress,
      registerCollaborator, updateCollaborator, deleteCollaborator, loginCollaborator, logoutCollaborator,
      loginAdmin, logoutAdmin,
      markAllNotificationsRead, markTransactionPaid, deleteTransaction
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