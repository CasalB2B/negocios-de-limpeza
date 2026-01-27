import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Search, Filter, Mail, Phone, MapPin, Edit, Trash2, UserPlus, Download, Check, DollarSign, X, Lock, Info, FileText, Camera } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { ClientSchema } from '../../src/validators/schemas';
import { toast } from 'react-toastify';

export const AdminClients: React.FC = () => {
    const { clients, deleteClient, registerClient, updateClient } = useData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [managingPaymentsClient, setManagingPaymentsClient] = useState<any | null>(null);
    const [viewingProof, setViewingProof] = useState<string | null>(null);
    const { services, updateServiceStatus } = useData();
    const [errors, setErrors] = useState<Record<string, string>>({});

    // State for Manual Registration
    const [newClientData, setNewClientData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        type: 'AVULSO'
    });

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getClientTypeBadge = (type: string) => {
        switch (type) {
            case 'FIXO':
                return <span className="bg-purple-100 text-primary border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Fixo (Contrato)</span>;
            case 'POS_OBRA':
                return <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pós-Obra</span>;
            case 'AVULSO':
                return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Avulso</span>;
            case 'PRIMEIRA_LIMPEZA':
                return <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Primeira Limpeza</span>;
            default:
                return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{type}</span>;
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Impede comportamentos padrão do botão
        e.stopPropagation(); // Impede propagação para a linha da tabela
        if (window.confirm("Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita.")) {
            deleteClient(id);
        }
    };

    const handleSaveNewClient = () => {
        setErrors({});

        // Mock password for manual registration if not provided
        const dataToValidate = {
            ...newClientData,
            password: 'manual_password_123',
            address: newClientData.address || 'Endereço não informado'
        };

        const result = ClientSchema.safeParse(dataToValidate);
        if (!result.success) {
            const fieldErrors: any = {};
            result.error.issues.forEach(err => {
                if (err.path[0]) fieldErrors[err.path[0]] = err.message;
            });
            setErrors(fieldErrors);
            toast.error("Verifique os campos obrigatórios.");
            return;
        }

        registerClient({
            id: `manual_user_${Date.now()}`,
            name: newClientData.name,
            email: newClientData.email,
            phone: newClientData.phone,
            address: newClientData.address,
            addresses: [],
            type: newClientData.type as any,
            createdAt: Date.now()
        });

        setShowAddModal(false);
        setNewClientData({ name: '', email: '', phone: '', address: '', type: 'AVULSO' });
        toast.success("Cliente cadastrado com sucesso!");
    };

    const handleUpdateClient = () => {
        if (editingClient) {
            setErrors({});
            const dataToValidate = {
                ...editingClient,
                password: editingClient.password || 'manual_password_123',
                address: editingClient.address || 'Endereço não informado'
            };

            const result = ClientSchema.safeParse(dataToValidate);
            if (!result.success) {
                const fieldErrors: any = {};
                result.error.issues.forEach(err => {
                    if (err.path[0]) fieldErrors[err.path[0]] = err.message;
                });
                setErrors(fieldErrors);
                toast.error("Erro na validação dos dados.");
                return;
            }

            updateClient(editingClient.id, editingClient);
            setEditingClient(null);
            toast.success("Dados do cliente atualizados.");
        }
    };

    return (
        <Layout role={UserRole.ADMIN}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Clientes</h1>
                        <p className="text-lightText dark:text-darkTextSecondary mt-1 text-sm md:text-base">Gerencie a base de clientes da plataforma.</p>
                    </div>
                    <div className="w-full md:w-auto">
                        <Button icon={<UserPlus size={18} />} onClick={() => setShowAddModal(true)} fullWidth>
                            Novo Cliente
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <Input
                            icon={<Search size={18} />}
                            placeholder="Buscar por nome, email ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Container with Overflow */}
                <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder overflow-hidden shadow-sm flex flex-col">
                    <div className="overflow-x-auto w-full">
                        <div className="min-w-[800px]"> {/* Min width forces scroll on small screens */}
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 dark:bg-darkBg/50 border-b border-gray-100 dark:border-darkBorder">
                                    <tr>
                                        <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Cliente</th>
                                        <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Contato</th>
                                        <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Endereço Principal</th>
                                        <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Tipo & Status</th>
                                        <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-darkBorder">
                                    {filteredClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-gray-50/50 dark:hover:bg-darkBg/30 transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                                                        {client.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-darkText dark:text-darkTextPrimary">{client.name}</p>
                                                        <p className="text-xs text-lightText dark:text-darkTextSecondary">ID: {client.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="text-sm space-y-1">
                                                    <p className="flex items-center gap-2 text-darkText dark:text-darkTextPrimary"><Mail size={14} className="text-gray-400" /> {client.email}</p>
                                                    <p className="flex items-center gap-2 text-lightText dark:text-darkTextSecondary"><Phone size={14} className="text-gray-400" /> {client.phone}</p>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <p className="flex items-center gap-2 text-sm text-darkText dark:text-darkTextPrimary truncate max-w-[200px]"><MapPin size={14} className="text-gray-400" /> {client.address}</p>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex flex-col items-start gap-1">
                                                    {getClientTypeBadge(client.type || 'AVULSO')}
                                                    <Badge variant="success">Ativo</Badge>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setManagingPaymentsClient(client)}
                                                        title="Ver Pagamentos"
                                                        className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-lightText hover:text-green-600 transition-colors"
                                                    >
                                                        <DollarSign size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const lastCompleted = services.filter(s => s.clientId === client.id && s.status === 'COMPLETED').sort((a, b) => b.createdAt - a.createdAt)[0];
                                                            if (lastCompleted) navigate(`/admin/service-photos/${lastCompleted.id}`);
                                                            else alert("Nenhum serviço concluído com fotos encontrado para este cliente.");
                                                        }}
                                                        title="Ver Fotos dos Serviços"
                                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-lightText hover:text-blue-600 transition-colors"
                                                    >
                                                        <Camera size={18} />
                                                    </button>
                                                    <button onClick={() => { setEditingClient({ ...client }); }} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg text-lightText hover:text-primary transition-colors">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={(e) => handleDelete(e, client.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-lightText hover:text-red-500 transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modal: Novo Cliente */}
                <Modal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Cadastrar Cliente"
                    footer={
                        <>
                            <button onClick={() => setShowAddModal(false)} className="px-6 py-3 font-bold text-lightText hover:text-darkText hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <Button onClick={handleSaveNewClient} icon={<Check size={18} />}>Salvar Cliente</Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <Input
                            label="Nome Completo"
                            placeholder="Ex: João da Silva"
                            value={newClientData.name}
                            onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                            error={errors.name}
                        />
                        <Input
                            label="E-mail"
                            placeholder="email@exemplo.com"
                            value={newClientData.email}
                            onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                            error={errors.email}
                        />
                        <Input
                            label="Telefone / Celular"
                            placeholder="(00) 00000-0000"
                            value={newClientData.phone}
                            onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                            error={errors.phone}
                        />
                        <Input
                            label="Endereço Principal"
                            placeholder="Rua, Número, Bairro, Cidade"
                            value={newClientData.address}
                            onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                            error={errors.address}
                        />
                        <div>
                            <label className="block text-sm font-bold text-darkText mb-1.5">Tipo de Cliente</label>
                            <select
                                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary text-darkText"
                                value={newClientData.type}
                                onChange={(e) => setNewClientData({ ...newClientData, type: e.target.value })}
                            >
                                <option value="AVULSO">Avulso</option>
                                <option value="PRIMEIRA_LIMPEZA">Primeira Limpeza</option>
                                <option value="FIXO">Fixo (Contrato)</option>
                                <option value="POS_OBRA">Pós-Obra</option>
                            </select>
                        </div>
                    </div>
                </Modal>

                {/* Modal: Editar Cliente */}
                <Modal
                    isOpen={!!editingClient}
                    onClose={() => setEditingClient(null)}
                    title="Editar Cliente"
                    footer={
                        <Button onClick={handleUpdateClient}>Salvar Alterações</Button>
                    }
                >
                    <div className="space-y-4">
                        <Input
                            label="Nome Completo"
                            defaultValue={editingClient?.name}
                            onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                            error={errors.name}
                        />
                        <Input
                            label="E-mail"
                            defaultValue={editingClient?.email}
                            onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                            error={errors.email}
                        />
                        <Input
                            label="Telefone"
                            defaultValue={editingClient?.phone}
                            onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                            error={errors.phone}
                        />
                        <Input
                            label="Endereço"
                            defaultValue={editingClient?.address}
                            onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                            error={errors.address}
                        />
                        <div>
                            <label className="block text-sm font-bold text-darkText mb-1.5">Tipo de Cliente</label>
                            <select
                                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary text-darkText"
                                value={editingClient?.type || 'AVULSO'}
                                onChange={(e) => setEditingClient({ ...editingClient, type: e.target.value })}
                            >
                                <option value="AVULSO">Avulso</option>
                                <option value="PRIMEIRA_LIMPEZA">Primeira Limpeza</option>
                                <option value="FIXO">Fixo (Contrato)</option>
                                <option value="POS_OBRA">Pós-Obra</option>
                            </select>
                        </div>
                    </div>
                </Modal>

                {/* Modal: Gerenciar Links de Pagamento */}
                <Modal
                    isOpen={!!managingPaymentsClient}
                    onClose={() => setManagingPaymentsClient(null)}
                    title={`Pagamentos: ${managingPaymentsClient?.name}`}
                    maxWidth="2xl"
                >
                    <div className="space-y-6">
                        <p className="text-sm text-lightText dark:text-darkTextSecondary">Configure links externos para sinal (50%) e valor final.</p>

                        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
                            {services.filter(s => s.clientId === managingPaymentsClient?.id).map(service => (
                                <div key={service.id} className="p-4 bg-gray-50 dark:bg-darkBg rounded-xl border border-gray-100 dark:border-darkBorder space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-primary uppercase">#{service.id} - {service.type}</span>
                                        <Badge variant="neutral">{service.status}</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-[10px] font-bold text-lightText uppercase">Sinal (50%)</label>
                                                {service.paymentStatus === 'SIGNAL_PAID' || service.paymentStatus === 'FULL_PAID' ? (
                                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><Check size={10} /> Confirmado</span>
                                                ) : service.proofSignal ? (
                                                    <button onClick={() => setViewingProof(service.proofSignal!)} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 animate-pulse">
                                                        <FileText size={10} /> Ver Comprovante
                                                    </button>
                                                ) : null}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Link de Pagamento"
                                                className="w-full p-2 text-xs bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-lg outline-none focus:border-primary"
                                                defaultValue={service.paymentLinkSignal}
                                                onBlur={(e) => updateServiceStatus(service.id, service.status, { paymentLinkSignal: e.target.value })}
                                            />
                                            {(service.paymentStatus === 'PENDING' || !service.paymentStatus) && (
                                                <div className="space-y-2">
                                                    {service.proofSignal && (
                                                        <button onClick={() => setViewingProof(service.proofSignal!)} className="w-full py-1 border border-primary text-primary text-[10px] font-bold rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
                                                            <FileText size={12} /> Ver Comprovante
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => updateServiceStatus(service.id, 'SCHEDULED', { paymentStatus: 'SIGNAL_PAID' })}
                                                        className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Check size={12} /> {service.proofSignal ? 'Validar Comprovante' : 'Confirmar manual (sem comprovante)'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-[10px] font-bold text-lightText uppercase">Final (50%)</label>
                                                {service.paymentStatus === 'FULL_PAID' ? (
                                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><Check size={10} /> Confirmado</span>
                                                ) : service.proofFinal ? (
                                                    <button onClick={() => setViewingProof(service.proofFinal!)} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 animate-pulse">
                                                        <FileText size={10} /> Ver Comprovante
                                                    </button>
                                                ) : null}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Link de Pagamento"
                                                className="w-full p-2 text-xs bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-lg outline-none focus:border-primary"
                                                defaultValue={service.paymentLinkFinal}
                                                onBlur={(e) => updateServiceStatus(service.id, service.status, { paymentLinkFinal: e.target.value })}
                                            />
                                            {service.paymentStatus === 'SIGNAL_PAID' && (
                                                <div className="space-y-2">
                                                    {service.proofFinal && (
                                                        <button onClick={() => setViewingProof(service.proofFinal!)} className="w-full py-1 border border-primary text-primary text-[10px] font-bold rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
                                                            <FileText size={12} /> Ver Comprovante
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => updateServiceStatus(service.id, service.status, { paymentStatus: 'FULL_PAID' })}
                                                        className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <Check size={12} /> {service.proofFinal ? 'Validar Comprovante' : 'Finalizar manual (sem comprovante)'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {services.filter(s => s.clientId === managingPaymentsClient?.id).length === 0 && (
                                <p className="text-center py-8 text-lightText italic">Nenhum serviço encontrado para este cliente.</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-darkBorder">
                            <Button onClick={() => setManagingPaymentsClient(null)} fullWidth>Fechar</Button>
                        </div>
                    </div>
                </Modal>

                {/* Modal: Visualizar Comprovante */}
                <Modal
                    isOpen={!!viewingProof}
                    onClose={() => setViewingProof(null)}
                    title="Comprovante de Pagamento"
                >
                    <div className="flex flex-col items-center gap-4">
                        <img src={viewingProof || ''} alt="Comprovante" className="max-w-full rounded-xl shadow-lg border" />
                        <Button onClick={() => setViewingProof(null)} fullWidth>Fechar</Button>
                    </div>
                </Modal>
            </div>
        </Layout>
    );
};