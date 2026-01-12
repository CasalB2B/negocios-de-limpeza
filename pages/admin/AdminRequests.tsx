import React, { useState, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Search, Download, X, Upload, DollarSign, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData, Service } from '../../components/DataContext'; 

export const AdminRequests: React.FC = () => {
  const navigate = useNavigate();
  const { services, updateServiceStatus } = useData(); 
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<Service | null>(null);
  
  // States for Budget Form
  const [budgetPrice, setBudgetPrice] = useState('');
  const [serviceSummary, setServiceSummary] = useState('');
  
  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Ordena por data de criação (mais recente primeiro) para garantir visibilidade
  const requestsData = services
    .filter(s => s.status === 'PENDING' || s.status === 'BUDGET_READY' || s.status === 'SOLICITADO')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const filteredRequests = requestsData.filter(req => {
     const matchesStatus = statusFilter === 'Todos' || req.status === statusFilter;
     const matchesSearch = req.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           req.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           req.id.toLowerCase().includes(searchTerm.toLowerCase());
     return matchesStatus && matchesSearch;
  });

  const getStatusVariant = (status: string) => {
     switch(status) {
        case 'PENDING': return 'warning';
        case 'SOLICITADO': return 'warning';
        case 'BUDGET_READY': return 'success';
        default: return 'neutral';
     }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
    }
  };

  const handleSendBudget = () => {
    if (selectedRequest && budgetPrice) {
        // Agora salva também o resumo (notes) e o preço
        updateServiceStatus(selectedRequest.id, 'BUDGET_READY', { 
            price: parseFloat(budgetPrice),
            notes: serviceSummary || selectedRequest.notes // Sobrescreve ou mantém notes antigos se vazio
        });
        setSelectedRequest(null);
        setBudgetPrice('');
        setServiceSummary('');
        setUploadedFileName(null);
    }
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
           <div>
              <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Solicitações</h1>
              <p className="text-lightText dark:text-darkTextSecondary mt-1">Gerencie e responda aos pedidos de orçamento pendentes.</p>
           </div>
        </div>

        {/* Filters Bar */}
        <Card className="!p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="w-full md:w-96">
              <Input 
                icon={<Search size={18} />}
                placeholder="Buscar por cliente, endereço ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="w-full"
                className="py-2.5"
              />
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
              <select 
                className="px-4 py-2 bg-gray-50 dark:bg-darkBg rounded-xl text-sm font-bold text-darkText dark:text-darkTextPrimary border-none outline-none cursor-pointer focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                 <option value="Todos">Status: Todos</option>
                 <option value="PENDING">Pendente</option>
                 <option value="BUDGET_READY">Orçamento Enviado</option>
              </select>
           </div>
        </Card>

        {/* Table */}
        <Card noPadding className="overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-gray-50/50 dark:bg-darkBg/50 border-b border-gray-100 dark:border-darkBorder text-xs uppercase text-lightText dark:text-darkTextSecondary font-bold tracking-wider">
                       <th className="p-6">Cliente</th>
                       <th className="p-6">Endereço</th>
                       <th className="p-6">Tipo de Serviço</th>
                       <th className="p-6">Data Solicitada</th>
                       <th className="p-6">Status</th>
                       <th className="p-6 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-darkBorder">
                    {filteredRequests.map((req) => (
                       <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-darkBg/30 transition-colors group">
                          <td className="p-6">
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-sm text-primary`}>
                                   {req.clientName.charAt(0)}
                                </div>
                                <div>
                                   <p className="font-bold text-darkText dark:text-darkTextPrimary text-sm">{req.clientName}</p>
                                   <p className="text-lightText dark:text-darkTextSecondary text-xs">ID: {req.id}</p>
                                </div>
                             </div>
                          </td>
                          <td className="p-6">
                             <p className="text-darkText dark:text-darkTextPrimary text-sm font-medium">{req.address}</p>
                          </td>
                          <td className="p-6">
                             <Badge variant="neutral">{req.type}</Badge>
                          </td>
                          <td className="p-6">
                             <p className="text-primary font-bold text-sm">{req.date}</p>
                          </td>
                          <td className="p-6">
                             <Badge variant={getStatusVariant(req.status)}>
                                {req.status === 'BUDGET_READY' ? 'Orçamento Pronto' : 'Pendente'}
                             </Badge>
                          </td>
                          <td className="p-6 text-right">
                             {req.status === 'PENDING' && (
                                <button 
                                    onClick={() => { setSelectedRequest(req); setUploadedFileName(null); setServiceSummary(req.notes || ''); }}
                                    className="bg-primary hover:bg-primaryHover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm shadow-primary/20 transition-all active:scale-95"
                                >
                                    Criar orçamento
                                </button>
                             )}
                          </td>
                       </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-8 text-center text-lightText dark:text-darkTextSecondary">
                                Nenhuma solicitação encontrada.
                            </td>
                        </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </Card>

        {/* Modal: Criar Orçamento */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-darkSurface rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-darkBorder animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-darkBorder flex justify-between items-center bg-gray-50/50 dark:bg-darkBg/50 shrink-0">
                   <div>
                      <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Novo Orçamento</h2>
                      <p className="text-sm text-lightText dark:text-darkTextSecondary">Para: {selectedRequest.clientName}</p>
                   </div>
                   <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-full text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary transition-colors">
                      <X size={20} />
                   </button>
                </div>
                
                <div className="p-8 overflow-y-auto">
                   <div className="grid grid-cols-2 gap-6 mb-6">
                      <Input 
                        label="Tipo de Serviço" 
                        defaultValue={selectedRequest.type} 
                        disabled
                      />
                      <Input 
                        label="Valor Final (R$)" 
                        icon={<DollarSign size={18} />} 
                        type="number" 
                        placeholder="0,00" 
                        value={budgetPrice}
                        onChange={(e) => setBudgetPrice(e.target.value)}
                      />
                   </div>

                   <div className="mb-6">
                      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Resumo do Serviço (Para o Cliente)</label>
                      <textarea 
                        className="w-full p-4 border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary h-32 text-sm bg-white dark:bg-darkBg text-darkText dark:text-darkTextPrimary" 
                        placeholder="Descreva o que está incluso no serviço, materiais, quantidade de profissionais..."
                        value={serviceSummary}
                        onChange={(e) => setServiceSummary(e.target.value)}
                      />
                   </div>

                   <div className="mb-6">
                      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Anexar Proposta (PDF) - Opcional</label>
                      <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group ${uploadedFileName ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-darkBorder/50'}`}
                      >
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${uploadedFileName ? 'bg-green-100 text-green-600' : 'bg-purple-50 dark:bg-primary/10 text-primary'}`}>
                            {uploadedFileName ? <Check size={24} /> : <Upload size={24} />}
                         </div>
                         <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">
                            {uploadedFileName ? uploadedFileName : "Clique para fazer upload"}
                         </p>
                      </div>
                   </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-darkBorder flex justify-end gap-3 bg-gray-50/50 dark:bg-darkBg/50 shrink-0">
                   <button onClick={() => setSelectedRequest(null)} className="px-6 py-3 font-bold text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors">Cancelar</button>
                   <Button onClick={handleSendBudget}>Enviar Orçamento</Button>
                </div>
             </div>
          </div>
        )}
      </div>
    </Layout>
  );
};