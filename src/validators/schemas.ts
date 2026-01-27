import { z } from 'zod';

// --- ELEMENTOS REUTILIZÁVEIS ---

export const EmailSchema = z.string().email('E-mail inválido');

export const PhoneSchema = z.string()
    .min(10, 'Telefone deve ter pelo menos 10 dígitos')
    .max(11, 'Telefone deve ter no máximo 11 dígitos')
    .regex(/^\d+$/, 'Telefone deve conter apenas números');

export const CEPSchema = z.string()
    .length(8, 'CEP deve ter 8 dígitos')
    .regex(/^\d+$/, 'CEP deve conter apenas números');

// --- SCHEMAS PRINCIPAIS ---

export const AddressSchema = z.object({
    alias: z.string().min(2, 'Nome do endereço é obrigatório (ex: Casa, Trabalho)'),
    street: z.string().min(5, 'Rua é obrigatória'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    district: z.string().min(2, 'Bairro é obrigatório'),
    city: z.string().min(2, 'Cidade é obrigatória'),
    state: z.string().length(2, 'Estado (UF) deve ter 2 letras'),
    cep: CEPSchema,
    type: z.enum(['HOUSE', 'APARTMENT', 'OFFICE']).default('HOUSE'),
    isMain: z.boolean().default(false)
});

export const ClientSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: EmailSchema,
    phone: PhoneSchema,
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    address: z.string().min(5, 'Endereço principal é obrigatório'),
    type: z.string().default('AVULSO')
});

export const CollaboratorSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: EmailSchema,
    phone: PhoneSchema,
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    level: z.enum(['JUNIOR', 'SENIOR', 'MASTER']).default('JUNIOR'),
    status: z.enum(['AVAILABLE', 'BUSY', 'ON_SERVICE', 'OFFLINE']).default('AVAILABLE')
});

export const ServiceSchema = z.object({
    type: z.string().min(2, 'Tipo de serviço é obrigatório'),
    date: z.string().min(10, 'Data inválida'),
    time: z.string().min(5, 'Hora inválida'),
    address: z.string().min(5, 'Endereço é obrigatório'),
    price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
    duration: z.number().min(1, 'Duração mínima de 1 hora').default(4),
    notes: z.string().optional()
});

export const TransactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    serviceType: z.string(),
    entity: z.string().min(2, 'Entidade é obrigatória'),
    amount: z.number().positive('O valor deve ser positivo'),
    method: z.string().min(2, 'Método de pagamento é obrigatório'),
    status: z.enum(['PAID', 'PENDING', 'FAILED']).default('PENDING')
});
