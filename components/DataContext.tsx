import React, { createContext, useContext, useState, useEffect } from 'react';
// VERSION: 1.0.1 - FIXED PASSWORD TYPE 
import { ServiceStatus, Address } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import bcrypt from 'bcryptjs';

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
  duration?: string | number;
  collaboratorId?: string;
  collaboratorName?: string;
  paymentLinkSignal?: string;
  paymentLinkFinal?: string;
  proofSignal?: string;
  proofFinal?: string;
  checkedInAt?: string;
  photosBefore?: string[];
  photosAfter?: string[];
  createdAt: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  password?: string; // Adicionado para correção do build
  phone: string;
  photo?: string;
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

  token: string | null;
  refreshToken: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- DADOS MOCK (REMOVIDOS PARA USAR BANCO REAL) ---
const mockServiceDefinitions: ServiceDefinition[] = [];

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

  const [token, setToken] = useState<string | null>(localStorage.getItem('session_token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('refresh_token'));

  useEffect(() => {
    if (token) localStorage.setItem('session_token', token);
    else localStorage.removeItem('session_token');

    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    else localStorage.removeItem('refresh_token');
  }, [token, refreshToken]);

  // --- MAPPERS (CONVERT DB SNAKE_CASE TO APP CAMELCASE) ---
  const mapDbUserToClient = (u: any, addresses: any[] = []): ClientUser => ({
    id: u.id,
    name: u.name || 'Cliente Sem Nome',
    email: u.email || '',
    phone: u.phone || '',
    photo: u.photo || '',
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
      type: a.type || 'HOUSE',
      isMain: a.is_main || false
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
    paymentLinkSignal: s.payment_link_signal || '',
    paymentLinkFinal: s.payment_link_final || '',
    proofSignal: s.proof_signal || '',
    proofFinal: s.proof_final || '',
    checkedInAt: s.checked_in_at || undefined,
    photosBefore: Array.isArray(s.photos_before) ? s.photos_before : [],
    photosAfter: Array.isArray(s.photos_after) ? s.photos_after : [],
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

  // Sync currentUser with latest data from clients list
  useEffect(() => {
    if (currentUser) {
      const updatedClient = clients.find(c => c.id === currentUser.id);
      if (updatedClient && JSON.stringify(updatedClient) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedClient);
        localStorage.setItem('auth_client', JSON.stringify(updatedClient));
      }
    }
  }, [clients, currentUser?.id]);

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
    try {
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

      const { data, error } = await supabase.from('services').insert(dbService).select();

      if (error) throw error;

      if (data) setServices(prev => [mapDbServiceToApp(data[0]), ...prev.filter(s => s.id !== service.id)]);
      toast.success('Solicitação enviada com sucesso!');
    } catch (err: any) {
      console.error("Erro ao salvar serviço:", err);
      toast.error(`Erro ao salvar solicitação: ${err.message || 'Erro de conexão'}`);
      setServices(prev => prev.filter(s => s.id !== service.id));
    }
  };

  const updateServiceStatus = async (id: string, status: string, additionalData?: Partial<Service>) => {
    const currentService = services.find(s => s.id === id);
    if (!currentService) return;

    setServices(prev => prev.map(s => s.id === id ? { ...s, status, ...additionalData } : s));

    const updates: any = { status };
    if (additionalData?.price !== undefined) updates.price = additionalData.price;
    if (additionalData?.notes !== undefined) updates.notes = additionalData.notes;
    if (additionalData?.paymentStatus !== undefined) updates.payment_status = additionalData.paymentStatus;
    if (additionalData?.paymentLinkSignal !== undefined) updates.payment_link_signal = additionalData.paymentLinkSignal;
    if (additionalData?.paymentLinkFinal !== undefined) updates.payment_link_final = additionalData.paymentLinkFinal;
    if (additionalData?.proofSignal !== undefined) updates.proof_signal = additionalData.proofSignal;
    if (additionalData?.proofFinal !== undefined) updates.proof_final = additionalData.proofFinal;
    if (additionalData?.checkedInAt !== undefined) updates.checked_in_at = additionalData.checkedInAt;
    if (additionalData?.photosBefore !== undefined) updates.photos_before = additionalData.photosBefore;
    if (additionalData?.photosAfter !== undefined) updates.photos_after = additionalData.photosAfter;
    if (additionalData?.collaboratorId) {
      updates.collaborator_id = additionalData.collaboratorId;
      updates.collaborator_name = additionalData.collaboratorName;
    }

    await supabase.from('services').update(updates).eq('id', id);

    // --- AUTOMAÇÃO FINANCEIRA ---

    // 1. Receita: Pagamento de Sinal (50%)
    if (additionalData?.paymentStatus === 'SIGNAL_PAID' && currentService.paymentStatus !== 'SIGNAL_PAID') {
      const amount = (additionalData.price || currentService.price || 0) / 2;
      if (amount > 0) {
        await createTransaction({
          type: 'INCOME',
          entity: currentService.clientName,
          serviceType: currentService.type,
          amount: amount,
          method: 'PIX/Link',
          status: 'PAID'
        });
      }
    }

    // 2. Receita: Pagamento Final (50%)
    if (additionalData?.paymentStatus === 'FULL_PAID' && currentService.paymentStatus !== 'FULL_PAID') {
      const amount = (additionalData.price || currentService.price || 0) / 2;
      if (amount > 0) {
        await createTransaction({
          type: 'INCOME',
          entity: currentService.clientName,
          serviceType: currentService.type,
          amount: amount,
          method: 'PIX/Link',
          status: 'PAID'
        });
      }
    }

    // 3. Repasse: Conclusão do Serviço
    if (status === 'COMPLETED' && currentService.status !== 'COMPLETED') {
      const collabId = additionalData?.collaboratorId || currentService.collaboratorId;
      const collab = collaborators.find(c => c.id === collabId);

      if (collab) {
        // Cálculo básico de repasse baseado no nível (mock da lógica dos settings)
        const level = collab.level.toLowerCase();
        const duration = parseInt(String(currentService.duration)) || 4;
        const payoutMap: any = platformSettings.payouts;
        const hoursKey = duration <= 4 ? 'hours4' : duration <= 6 ? 'hours6' : 'hours8';
        const payoutAmount = payoutMap[level]?.[hoursKey] || 80;

        await createTransaction({
          type: 'EXPENSE',
          entity: collab.name,
          serviceType: `Repasse: ${currentService.type}`,
          amount: payoutAmount,
          method: 'Transferência',
          status: 'PENDING'
        });
      }
    }
  };

  const createTransaction = async (trx: Omit<Transaction, 'id' | 'date'>) => {
    const newTrx = {
      id: `trx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: new Date().toLocaleDateString('pt-BR'),
      ...trx
    };

    setTransactions(prev => [newTrx, ...prev]);

    await supabase.from('transactions').insert({
      id: newTrx.id,
      type: newTrx.type,
      entity: newTrx.entity,
      service_type: newTrx.serviceType,
      amount: newTrx.amount,
      date: newTrx.date,
      status: newTrx.status,
      method: newTrx.method
    });
  };

  // --- ACTIONS: SERVICE DEFINITIONS ---
  const addServiceDefinition = async (def: ServiceDefinition) => {
    try {
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

      const { error } = await supabase.from('service_definitions').insert(dbDef);
      if (error) throw error;
      toast.success('Serviço criado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao salvar serviço:", error);
      toast.error(`Erro ao salvar no banco: ${error.message}`);
      setServiceDefinitions(prev => prev.filter(s => s.id !== def.id));
    }
  };

  const updateServiceDefinition = async (def: ServiceDefinition) => {
    try {
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
      const { error } = await supabase.from('service_definitions').update(dbDef).eq('id', def.id);
      if (error) throw error;
      toast.success('Configurações atualizadas!');
    } catch (error: any) {
      console.error("Erro ao atualizar serviço:", error);
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  };

  const deleteServiceDefinition = async (id: string) => {
    try {
      setServiceDefinitions(prev => prev.filter(s => s.id !== id));
      const { error } = await supabase.from('service_definitions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Serviço removido.');
    } catch (error: any) {
      console.error("Erro ao deletar serviço:", error);
      toast.error('Erro ao excluir serviço.');
      fetchData(); // Reset local state
    }
  };

  // --- ACTIONS: CLIENTS ---
  const registerClient = async (client: ClientUser) => {
    try {
      setClients(prev => [...prev, client]);
      if (client.id.startsWith('user_') || client.id.startsWith('manual')) {
        setCurrentUser(client);
        localStorage.setItem('auth_client', JSON.stringify(client));
      }

      const hashedPassword = (client as any).password ? bcrypt.hashSync((client as any).password, 10) : undefined;

      const { data: userData, error: userError } = await supabase.from('app_users').insert({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        role: 'CLIENT',
        type: client.type,
        password: hashedPassword,
        photo: client.photo
      }).select().single();

      if (userError) throw userError;

      if (userData && client.addresses && client.addresses.length > 0) {
        const addressesToInsert = client.addresses.map(a => ({
          user_id: userData.id,
          title: a.alias,
          street: a.street,
          number: a.number,
          complement: a.complement,
          neighborhood: a.district,
          city: a.city,
          state: a.state,
          zip: a.cep,
          type: a.type || 'HOUSE',
          is_main: a.isMain || false
        }));
        await supabase.from('addresses').insert(addressesToInsert);
      }

      toast.success('Cadastro realizado com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error("Erro ao registrar cliente:", error);
      toast.error(`Falha no cadastro: ${error.message || 'Verifique sua conexão.'}`);
      // Rollback local state if needed
      setClients(prev => prev.filter(c => c.id !== client.id));
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
    if (data.photo) updates.photo = data.photo;

    await supabase.from('app_users').update(updates).eq('id', id);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await supabase.from('app_users').delete().eq('id', id);
    if (currentUser?.id === id) logoutClient();
  };

  const loginClient = async (email: string, password?: string): Promise<boolean> => {
    try {
      const { data: user } = await supabase.from('app_users')
        .select('*')
        .eq('email', email)
        .eq('role', 'CLIENT')
        .single();

      if (user) {
        if (password && !bcrypt.compareSync(password, user.password)) {
          toast.error('Senha incorreta.');
          return false;
        }

        const { data: addrs } = await supabase.from('addresses').select('*').eq('user_id', user.id);
        const clientObj = mapDbUserToClient(user, addrs || []);
        setCurrentUser(clientObj);
        localStorage.setItem('auth_client', JSON.stringify(clientObj));

        // Token simulation
        const fakeToken = `ey.client.${user.id}.${Date.now()}`;
        const fakeRefresh = `refresh.${user.id}.${Date.now()}`;
        setToken(fakeToken);
        setRefreshToken(fakeRefresh);

        toast.success(`Bem-vindo(a), ${clientObj.name}!`);
        return true;
      }

      toast.error('E-mail não encontrado.');
      return false;
    } catch (err) {
      console.error(err);
      toast.error('Erro ao realizar login.');
      return false;
    }
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
      zip: address.cep,
      type: address.type || 'HOUSE',
      is_main: address.isMain || false
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
    try {
      setCollaborators(prev => [...prev, collab]);
      const hashedPassword = collab.password ? bcrypt.hashSync(collab.password, 10) : undefined;

      const { data, error } = await supabase.from('app_users').insert({
        id: collab.id,
        name: collab.name,
        email: collab.email,
        phone: collab.phone,
        role: 'COLLABORATOR',
        status: 'AVAILABLE',
        photo: collab.photo,
        password: hashedPassword,
        level: collab.level
      }).select().single();

      if (error) throw error;

      if (data) {
        setCollaborators(prev => prev.map(c => c.id === collab.id ? mapDbUserToCollab(data) : c));
      }
      toast.success('Profissional cadastrada!');
    } catch (error: any) {
      console.error("Erro ao registrar colaboradora:", error);
      toast.error(`Erro ao cadastrar profissional: ${error.message}`);
      setCollaborators(prev => prev.filter(c => c.id !== collab.id));
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
    try {
      const { data: user, error } = await supabase.from('app_users')
        .select('*')
        .eq('email', email)
        .eq('role', 'COLLABORATOR')
        .single();

      if (user && bcrypt.compareSync(password, user.password)) {
        const collabObj = mapDbUserToCollab(user);
        setCurrentCollaborator(collabObj);
        localStorage.setItem('auth_collab', JSON.stringify(collabObj));

        const fakeToken = `ey.collab.${user.id}.${Date.now()}`;
        const fakeRefresh = `refresh.${user.id}.${Date.now()}`;
        setToken(fakeToken);
        setRefreshToken(fakeRefresh);

        toast.success(`Bem-vindo(a), ${collabObj.name}!`);
        return true;
      }

      toast.error('Credenciais inválidas.');
      return false;
    } catch (err) {
      toast.error('Erro ao acessar o sistema.');
      return false;
    }
  };

  const logoutCollaborator = () => {
    setCurrentCollaborator(null);
    localStorage.removeItem('auth_collab');
  }

  // --- ADMIN ---
  const loginAdmin = async (userEmail: string, pass: string): Promise<boolean> => {
    try {
      // 1. Hardcoded fallback (pode ser removido após criar o primeiro admin no banco)
      if (userEmail === 'admin@negociosdelimpeza.com' && pass === 'admin123') {
        setAdminLoggedIn(true);
        localStorage.setItem('auth_admin', 'true');
        toast.success('Acesso Administrativo Iniciado');
        return true;
      }

      // 2. DB Check
      const { data: dbUser } = await supabase.from('app_users')
        .select('*')
        .eq('email', userEmail)
        .eq('role', 'ADMIN')
        .single();

      if (dbUser && bcrypt.compareSync(pass, dbUser.password)) {
        setAdminLoggedIn(true);
        localStorage.setItem('auth_admin', 'true');

        const fakeToken = `ey.admin.${dbUser.id}.${Date.now()}`;
        const fakeRefresh = `refresh.${dbUser.id}.${Date.now()}`;
        setToken(fakeToken);
        setRefreshToken(fakeRefresh);

        toast.success('Acesso Administrativo Iniciado');
        return true;
      }

      toast.error('Credenciais administrativas inválidas.');
      return false;
    } catch (err) {
      toast.error('Erro de autenticação.');
      return false;
    }
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
      token, refreshToken,
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