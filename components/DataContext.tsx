import React, { createContext, useContext, useState, useEffect } from 'react';
import { ServiceStatus, Address } from '../types';

// --- NOVOS TIPOS PARA SERVIÇOS DINÂMICOS ---
export type PricingModel = 'ROOMS' | 'HOURLY' | 'SQM' | 'FIXED';

export interface ServiceExtra {
  id: string;
  label: string;
  price: number;
}

export interface PricingTier {
  id: string;
  name: string; // Ex: "Pacote 4 Horas"
  value: number; // Ex: 4 (horas)
  price: number; // Ex: 120.00
}

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string; // Nova propriedade para foto real
  pricingModel: PricingModel;
  basePrice: number;
  pricePerUnit: number;
  pricePerBath?: number;
  extras: ServiceExtra[];
  pricingTiers?: PricingTier[]; // Nova propriedade para pacotes (ex: Passadoria)
  active: boolean;
}

// Tipos de Dados Globais
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
  
  // Actions Services
  addService: (service: Service) => void;
  updateServiceStatus: (id: string, status: string, additionalData?: Partial<Service>) => void;
  
  // Actions Service Definitions (Admin)
  addServiceDefinition: (def: ServiceDefinition) => void;
  updateServiceDefinition: (def: ServiceDefinition) => void;
  deleteServiceDefinition: (id: string) => void;

  // Actions Clients
  registerClient: (client: ClientUser) => void;
  updateClient: (id: string, data: Partial<ClientUser>) => void;
  deleteClient: (id: string) => void;
  loginClient: (email: string) => boolean;
  logoutClient: () => void;
  
  // Actions Client Addresses
  addClientAddress: (clientId: string, address: Address) => void;
  updateClientAddress: (clientId: string, address: Address) => void;
  deleteClientAddress: (clientId: string, addressId: string | number) => void;

  // Actions Collaborators
  registerCollaborator: (collab: CollaboratorUser) => void;
  updateCollaborator: (id: string, data: Partial<CollaboratorUser>) => void;
  deleteCollaborator: (id: string) => void;
  loginCollaborator: (email: string, password: string) => boolean;
  logoutCollaborator: () => void;
  
  // Actions Admin
  loginAdmin: (user: string, pass: string) => boolean;
  logoutAdmin: () => void;
  markAllNotificationsRead: () => void;
  
  // Actions Transactions
  markTransactionPaid: (id: string) => void;
  deleteTransaction: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- SISTEMA LIMPO (SEM DADOS FICTÍCIOS) ---
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
    pricePerUnit: 0, // Usa tiers
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
  // --- STATES ---
  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('app_services');
    return saved ? JSON.parse(saved) : []; // VAZIO
  });

  const [serviceDefinitions, setServiceDefinitions] = useState<ServiceDefinition[]>(() => {
    const saved = localStorage.getItem('app_service_definitions');
    return saved ? JSON.parse(saved) : initialServiceDefinitions;
  });

  const [clients, setClients] = useState<ClientUser[]>(() => {
    const saved = localStorage.getItem('app_clients');
    return saved ? JSON.parse(saved) : []; // VAZIO
  });

  const [collaborators, setCollaborators] = useState<CollaboratorUser[]>(() => {
    const saved = localStorage.getItem('app_collaborators');
    return saved ? JSON.parse(saved) : []; // VAZIO
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('app_transactions');
    return saved ? JSON.parse(saved) : []; // VAZIO
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('app_notifications');
    return saved ? JSON.parse(saved) : []; // VAZIO
  });

  const [currentUser, setCurrentUser] = useState<ClientUser | null>(() => {
    const saved = localStorage.getItem('app_current_user');
    return saved ? JSON.parse(saved) : null; 
  });

  const [currentCollaborator, setCurrentCollaborator] = useState<CollaboratorUser | null>(() => {
    const saved = localStorage.getItem('app_current_collab');
    return saved ? JSON.parse(saved) : null;
  });

  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('app_admin_logged') === 'true';
  });

  // --- PERSISTÊNCIA ---
  useEffect(() => { localStorage.setItem('app_services', JSON.stringify(services)); }, [services]);
  useEffect(() => { localStorage.setItem('app_service_definitions', JSON.stringify(serviceDefinitions)); }, [serviceDefinitions]);
  useEffect(() => { localStorage.setItem('app_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('app_collaborators', JSON.stringify(collaborators)); }, [collaborators]);
  useEffect(() => { localStorage.setItem('app_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('app_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('app_admin_logged', String(adminLoggedIn)); }, [adminLoggedIn]);
  
  useEffect(() => { 
    if (currentUser) localStorage.setItem('app_current_user', JSON.stringify(currentUser));
    else localStorage.removeItem('app_current_user');
  }, [currentUser]);

  useEffect(() => { 
    if (currentCollaborator) localStorage.setItem('app_current_collab', JSON.stringify(currentCollaborator));
    else localStorage.removeItem('app_current_collab');
  }, [currentCollaborator]);

  // --- HELPER: ADD NOTIFICATION ---
  const addNotificationInternal = (notif: Omit<Notification, 'id' | 'read' | 'time'>) => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      time: 'Agora',
      read: false,
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // --- ACTIONS: SERVICES ---
  const addServiceDefinition = (def: ServiceDefinition) => {
    setServiceDefinitions(prev => [...prev, def]);
  };

  const updateServiceDefinition = (def: ServiceDefinition) => {
    setServiceDefinitions(prev => prev.map(s => s.id === def.id ? def : s));
  };

  const deleteServiceDefinition = (id: string) => {
    setServiceDefinitions(prev => prev.filter(s => s.id !== id));
  };

  const addService = (service: Service) => {
    setServices(prev => [service, ...prev]);
    addNotificationInternal({
        type: 'NEW_REQUEST',
        title: 'Nova solicitação de serviço',
        desc: `${service.type} solicitada por ${service.clientName}.`
    });
  };

  const updateServiceStatus = (id: string, status: string, additionalData?: Partial<Service>) => {
    setServices(prev => prev.map(s => {
      if (s.id === id) {
          if (status === 'COMPLETED') {
             addNotificationInternal({ type: 'SUCCESS', title: 'Serviço Concluído', desc: `O serviço #${s.id} foi finalizado.` });
          }
          if (status === 'CONFIRMED') {
             addNotificationInternal({ type: 'INFO', title: 'Orçamento Aprovado', desc: `O cliente aprovou o orçamento #${s.id}.` });
          }
          return { ...s, status, ...additionalData };
      }
      return s;
    }));
  };

  // --- ACTIONS: CLIENTS ---
  const registerClient = (client: ClientUser) => {
    if (!client.addresses) client.addresses = [];
    setClients(prev => [...prev, client]);
    addNotificationInternal({
        type: 'NEW_CLIENT',
        title: 'Novo cliente cadastrado',
        desc: `${client.name} acabou de se registrar.`
    });
    if (!currentUser) setCurrentUser(client);
  };

  const updateClient = (id: string, data: Partial<ClientUser>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    if (currentUser?.id === id) logoutClient();
  };

  const loginClient = (email: string) => {
    const user = clients.find(c => c.email === email);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logoutClient = () => setCurrentUser(null);

  // --- ACTIONS: CLIENT ADDRESSES ---
  const addClientAddress = (clientId: string, address: Address) => {
    const updatedAddress = { ...address, id: Date.now() }; 
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const newAddresses = [...(client.addresses || []), updatedAddress];
      updateClient(clientId, { addresses: newAddresses });
    }
  };

  const updateClientAddress = (clientId: string, address: Address) => {
    const client = clients.find(c => c.id === clientId);
    if (client && client.addresses) {
      const newAddresses = client.addresses.map(addr => addr.id === address.id ? address : addr);
      updateClient(clientId, { addresses: newAddresses });
    }
  };

  const deleteClientAddress = (clientId: string, addressId: string | number) => {
    const client = clients.find(c => c.id === clientId);
    if (client && client.addresses) {
      const newAddresses = client.addresses.filter(addr => addr.id !== addressId);
      updateClient(clientId, { addresses: newAddresses });
    }
  };

  // --- ACTIONS: COLLABORATORS ---
  const registerCollaborator = (collab: CollaboratorUser) => {
    setCollaborators(prev => [...prev, collab]);
  };

  const updateCollaborator = (id: string, data: Partial<CollaboratorUser>) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (currentCollaborator && currentCollaborator.id === id) {
      setCurrentCollaborator(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const deleteCollaborator = (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
    if (currentCollaborator?.id === id) logoutCollaborator();
  };

  const loginCollaborator = (email: string, password: string) => {
    const user = collaborators.find(c => c.email === email && c.password === password);
    if (user) {
      setCurrentCollaborator(user);
      return true;
    }
    return false;
  };

  const logoutCollaborator = () => setCurrentCollaborator(null);

  // --- ACTIONS: ADMIN ---
  const loginAdmin = (user: string, pass: string) => {
    if (user === 'admin' && pass === 'admin') {
      setAdminLoggedIn(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setAdminLoggedIn(false);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // --- ACTIONS: TRANSACTIONS ---
  const markTransactionPaid = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'PAID' } : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return (
    <DataContext.Provider value={{ 
      services, 
      clients, 
      collaborators,
      notifications,
      serviceDefinitions,
      transactions,
      currentUser, 
      currentCollaborator,
      adminLoggedIn,
      addService, 
      updateServiceStatus, 
      addServiceDefinition,
      updateServiceDefinition,
      deleteServiceDefinition,
      registerClient, 
      updateClient,
      deleteClient,
      loginClient,
      logoutClient,
      addClientAddress,
      updateClientAddress,
      deleteClientAddress,
      registerCollaborator,
      updateCollaborator,
      deleteCollaborator,
      loginCollaborator,
      logoutCollaborator,
      loginAdmin,
      logoutAdmin,
      markAllNotificationsRead,
      markTransactionPaid,
      deleteTransaction
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};