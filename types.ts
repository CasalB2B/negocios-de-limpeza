export enum UserRole {
  CLIENT = 'CLIENT',
  COLLABORATOR = 'COLLABORATOR',
  ADMIN = 'ADMIN'
}

export enum ServiceStatus {
  PENDING = 'PENDING', // Solicitado pelo cliente
  BUDGET_READY = 'BUDGET_READY', // Orçamento enviado pelo Admin
  WAITING_SIGNAL = 'WAITING_SIGNAL', // Orçamento aprovado, aguardando pagamento do sinal (Pré-agendado)
  SCHEDULED = 'SCHEDULED', // Sinal pago, confirmado na agenda (Aparece para colaboradora)
  IN_PROGRESS = 'IN_PROGRESS', // Em execução
  COMPLETED = 'COMPLETED', // Finalizado
  CANCELED = 'CANCELED' // Cancelado
}

export enum CollabStep {
  CHECK_IN = 'CHECK_IN',
  CHECKLIST = 'CHECKLIST',
  PHOTOS = 'PHOTOS',
  CHECK_OUT = 'CHECK_OUT',
  FINISHED = 'FINISHED'
}

export interface Address {
  id: number | string;
  alias: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  cep: string;
  type: 'HOUSE' | 'APARTMENT' | 'COMMERCIAL';
  reference?: string;
  notes?: string;
  pets?: boolean;
  intercom?: string;
  keyLocation?: string;
  isMain?: boolean;
}

export interface ServiceRequest {
  id: string;
  clientName: string;
  serviceType: string;
  date: string;
  status: ServiceStatus;
  address: string;
  value?: number;
}

export interface CollaboratorTask {
  id: string;
  label: string;
  completed: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  status: 'AVAILABLE' | 'ON_SERVICE' | 'OFFLINE' | 'PENDING';
  rating: number;
  servicesCount: number;
  photo: string;
  location: string;
}