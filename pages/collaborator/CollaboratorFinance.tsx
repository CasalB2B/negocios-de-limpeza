import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { DollarSign, Clock, Download, Calendar, Eye, FileText, X, Star } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import DataContext

export const CollaboratorFinance: React.FC = () => {
  const { services, currentCollaborator, platformSettings } = useData();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [viewingService, setViewingService] = useState<any | null>(null);

  // Determina o valor fixo baseado no nível e nas horas
  const getPayoutValue = (duration: 4 | 6 | 8) => {
      const level = (currentCollaborator?.level || 'JUNIOR').toLowerCase() as 'junior' | 'senior' | 'master';
      const hoursKey = `hours${duration}` as 'hours4' | 'hours6' | 'hours8';
      
      // Fallback seguro caso a configuração ainda não exista
      if (platformSettings.payouts && platformSettings.payouts[level]) {
          return platformSettings.payouts[level][hoursKey];
      }
      return 0;
  };

  // Filtrar apenas serviços desta colaboradora
  const myFinanceData = services
    .filter(s => s.collaboratorId === currentCollaborator?.id)
    .map(s => {
       // Lógica de Pagamento
       const isPaid = s.status === 'COMPLETED';
       const hasValue = s.price && s.price > 0;
       
       // Duração Estimada (Se não vier do banco, infere pelo preço ou padrão 4h)
       // No DataContext atualizado, já garantimos que duration existe, mas por segurança:
       const duration = (s.duration === 4 || s.duration === 6 || s.duration === 8) ? s.duration : 4;

       // CÁLCULO DO REPASSE LÍQUIDO (Valor Fixo por Nível e Horas)
       const netValue = getPayoutValue(duration);
       
       return {
          id: s.id,
          date: s.date,
          client: s.clientName,
          type: s.type,
          hours: `${duration}h`, 
          value: netValue, // Valor líquido (Repasse Fixo)
          status: isPaid ? 'PAID' : (hasValue ? 'PENDING' : 'OPEN'),
          fullStatus: s.status
       };
    })
    .filter(item => item.status !== 'OPEN'); 

  const filteredData = myFinanceData.filter(item => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return item.status === 'PENDING';
    if (activeTab === 'PAID') return item.status === 'PAID';
    return true;
  });

  // KPI Calculations
  const totalServices = myFinanceData.length;
  const totalPendingValue = myFinanceData.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.value, 0);
  const totalHours = myFinanceData.reduce((acc, curr) => acc + parseInt(curr.hours), 0); 

  const handleExportPDF = () => {
    alert("Gerando relatório de repasses...");
  };

  const getLevelLabel = () => {
      const lvl = currentCollaborator?.level;
      if (lvl === 'SENIOR') return 'Sênior';
      if (lvl === 'MASTER') return 'Mestre';
      return 'Júnior';
  }

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
           <div>
              <h1 className="text-3xl font-display font-bold text-darkText">Meu Financeiro</h1>
              <div className="flex items-center gap-2 mt-1">
                  <p className="text-lightText">Nível: <strong>{getLevelLabel()}</strong></p>
              </div>
           </div>
           <div className="flex gap-4">
              <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-darkText hover:bg-gray-50">
                 <Calendar size={18} /> Este Mês
              </button>
              <Button onClick={handleExportPDF} icon={<Download size={18} />} className="text-sm">Exportar PDF</Button>
           </div>
        </header>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-sm text-lightText">Total de Limpezas</p>
                 <div className="text-primary"><FileText size={20}/></div>
              </div>
              <h2 className="text-4xl font-bold text-darkText mb-1">{totalServices}</h2>
              <p className="text-xs text-green-600 font-bold">Acumulado</p>
           </div>

           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-sm text-lightText">Total de Horas</p>
                 <div className="text-primary"><Clock size={20}/></div>
              </div>
              <h2 className="text-4xl font-bold text-darkText mb-1">{totalHours}h</h2>
              <p className="text-xs text-lightText">Calculado por serviço</p>
           </div>

           <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-lg shadow-primary/5">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-sm text-lightText">A Receber (Repasse)</p>
                 <div className="text-primary"><DollarSign size={20}/></div>
              </div>
              <h2 className="text-3xl font-bold text-primary mb-1">R$ {totalPendingValue.toFixed(2)}</h2>
              <p className="text-xs text-lightText">Baseado na sua tabela de horas</p>
           </div>

           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <p className="text-sm text-lightText">Status Geral</p>
                 <div className="text-yellow-500"><Clock size={20}/></div>
              </div>
              <h2 className="text-3xl font-bold text-darkText mb-2">{totalPendingValue > 0 ? 'Pendente' : 'Em dia'}</h2>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                 <div className={`h-full ${totalPendingValue > 0 ? 'bg-orange-400 w-2/3' : 'bg-green-500 w-full'}`}></div>
              </div>
           </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
           {/* Table Tabs */}
           <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveTab('ALL')}
                className={`px-8 py-4 text-sm font-bold transition-colors ${activeTab === 'ALL' ? 'text-primary border-b-2 border-primary' : 'text-lightText hover:text-darkText hover:bg-gray-50'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setActiveTab('PENDING')}
                className={`px-8 py-4 text-sm font-bold transition-colors ${activeTab === 'PENDING' ? 'text-primary border-b-2 border-primary' : 'text-lightText hover:text-darkText hover:bg-gray-50'}`}
              >
                Pendentes
              </button>
              <button 
                onClick={() => setActiveTab('PAID')}
                className={`px-8 py-4 text-sm font-bold transition-colors ${activeTab === 'PAID' ? 'text-primary border-b-2 border-primary' : 'text-lightText hover:text-darkText hover:bg-gray-50'}`}
              >
                Pagos
              </button>
           </div>

           {/* Table */}
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50 text-xs font-bold text-darkText uppercase">
                    <tr>
                       <th className="p-6">Data do Serviço</th>
                       <th className="p-6">Cliente/Tipo</th>
                       <th className="p-6">Duração</th>
                       <th className="p-6">Valor Repasse</th>
                       <th className="p-6">Status</th>
                       <th className="p-6 text-right">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {filteredData.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                         <td className="p-6 text-lightText text-sm">{item.date}</td>
                         <td className="p-6">
                            <p className="font-bold text-darkText text-sm">{item.client}</p>
                            <p className="text-xs text-lightText">{item.type}</p>
                         </td>
                         <td className="p-6">
                            <span className="bg-gray-100 text-darkText px-2 py-1 rounded text-xs font-bold">{item.hours}</span>
                         </td>
                         <td className="p-6 font-bold text-darkText text-sm">R$ {item.value.toFixed(2)}</td>
                         <td className="p-6">
                            {item.status === 'PENDING' ? (
                              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">Pendente</span>
                            ) : (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Pago</span>
                            )}
                         </td>
                         <td className="p-6 text-right">
                            <button 
                              onClick={() => setViewingService(item)}
                              className="text-primary hover:text-primaryHover hover:bg-primary/10 p-2 rounded-full transition-colors"
                            >
                              <Eye size={20} />
                            </button>
                         </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-lightText">
                          Nenhum registro encontrado. Realize serviços para visualizar seus ganhos.
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Modal: Detalhes do Serviço */}
        {viewingService && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-darkText">Detalhes do Repasse</h2>
                    <button onClick={() => setViewingService(null)} className="p-2 hover:bg-gray-100 rounded-full text-lightText hover:text-darkText transition-colors">
                       <X size={20} />
                    </button>
                 </div>
                 
                 <div className="p-6 space-y-6">
                    <div className="text-center">
                       <p className="text-sm text-lightText mb-1">Valor a Receber</p>
                       <h3 className="text-4xl font-bold text-primary">R$ {viewingService.value.toFixed(2)}</h3>
                       <div className="mt-3">
                          {viewingService.status === 'PENDING' ? (
                            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">AGUARDANDO PAGAMENTO</span>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">PAGO</span>
                          )}
                       </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-sm">
                       <div className="flex justify-between">
                          <span className="text-lightText">Serviço ID</span>
                          <span className="font-bold text-darkText">{viewingService.id}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-lightText">Data</span>
                          <span className="font-bold text-darkText">{viewingService.date}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-lightText">Duração</span>
                          <span className="font-bold text-darkText">{viewingService.hours}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-lightText">Cliente</span>
                          <span className="font-bold text-darkText text-right">{viewingService.client}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-lightText">Tipo</span>
                          <span className="font-bold text-darkText">{viewingService.type}</span>
                       </div>
                    </div>

                    <div className="text-xs text-lightText text-center px-4">
                       O pagamento é liberado após a confirmação de conclusão do serviço. Valor tabelado para {viewingService.hours} no nível {getLevelLabel()}.
                    </div>
                 </div>

                 <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-3xl">
                    <Button onClick={() => setViewingService(null)} fullWidth>Fechar</Button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </Layout>
  );
};