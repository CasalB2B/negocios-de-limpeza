import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { DollarSign, Clock, Download, Calendar, Eye, FileText, X } from 'lucide-react';
import { useData } from '../../components/DataContext'; // Import DataContext

export const CollaboratorFinance: React.FC = () => {
  const { services, currentCollaborator } = useData();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [viewingService, setViewingService] = useState<any | null>(null);

  // Filtrar apenas serviços desta colaboradora
  const myFinanceData = services
    .filter(s => s.collaboratorId === currentCollaborator?.id)
    .map(s => {
       // Lógica simples de simulação de pagamento: Se completado, está PAGO ou PENDENTE dependendo de uma regra fictícia (ex: data)
       // Para simplificar: COMPLETED = PAGO, outros status (mas com valor) = PENDENTE
       const isPaid = s.status === 'COMPLETED';
       const hasValue = s.price && s.price > 0;
       
       return {
          id: s.id,
          date: s.date,
          client: s.clientName,
          type: s.type,
          hours: 'N/A', // Poderia calcular baseado em time ou type
          value: s.price || 0,
          status: isPaid ? 'PAID' : (hasValue ? 'PENDING' : 'OPEN'),
          fullStatus: s.status
       };
    })
    .filter(item => item.status !== 'OPEN'); // Mostra apenas o que tem valor definido

  const filteredData = myFinanceData.filter(item => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return item.status === 'PENDING';
    if (activeTab === 'PAID') return item.status === 'PAID';
    return true;
  });

  // KPI Calculations
  const totalServices = myFinanceData.length;
  // Assumindo que o "Total a Receber" são os pendentes e "Total Recebido" não está no card mas calculado internamente
  const totalPendingValue = myFinanceData.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.value, 0);
  const totalHours = myFinanceData.length * 4; // Estimativa simples 4h/serviço

  const handleExportPDF = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Extrato Financeiro</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
          h1 { color: #a163ff; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
          .summary { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th { background: #f5f5f5; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .status-paid { color: green; font-weight: bold; }
          .status-pending { color: orange; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Extrato de Repasses</h1>
        <p>Colaboradora: ${currentCollaborator?.name}</p>
        <p>Gerado em: ${new Date().toLocaleDateString()}</p>
        
        <div class="summary">
          <div>
            <strong>Total Serviços:</strong> ${filteredData.length}
          </div>
          <div>
            <strong>Total Valor:</strong> R$ ${filteredData.reduce((acc, curr) => acc + curr.value, 0).toFixed(2)}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(t => `
              <tr>
                <td>${t.date}</td>
                <td>${t.client}</td>
                <td>R$ ${t.value.toFixed(2)}</td>
                <td class="${t.status === 'PAID' ? 'status-paid' : 'status-pending'}">
                  ${t.status === 'PAID' ? 'PAGO' : 'PENDENTE'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const element = document.createElement("a");
    const file = new Blob([htmlContent], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `meus_ganhos_${Date.now()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
           <div>
              <h1 className="text-3xl font-display font-bold text-darkText">Meu Financeiro</h1>
              <p className="text-lightText">Acompanhe seus ganhos, horas trabalhadas e status de pagamentos.</p>
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
                 <p className="text-sm text-lightText">Total de Horas (Est.)</p>
                 <div className="text-primary"><Clock size={20}/></div>
              </div>
              <h2 className="text-4xl font-bold text-darkText mb-1">{totalHours}h</h2>
              <p className="text-xs text-lightText">Baseado em serviços concluídos</p>
           </div>

           <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-lg shadow-primary/5">
              <div className="flex justify-between items-start mb-4">
                 <p className="text-sm text-lightText">A Receber (Pendente)</p>
                 <div className="text-primary"><DollarSign size={20}/></div>
              </div>
              <h2 className="text-3xl font-bold text-primary mb-1">R$ {totalPendingValue.toFixed(2)}</h2>
              <p className="text-xs text-lightText">Liberação após conclusão</p>
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
                       <th className="p-6">Valor</th>
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
                        <td colSpan={5} className="p-12 text-center text-lightText">
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
                          <span className="text-lightText">Cliente</span>
                          <span className="font-bold text-darkText text-right">{viewingService.client}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-lightText">Tipo</span>
                          <span className="font-bold text-darkText">{viewingService.type}</span>
                       </div>
                    </div>

                    <div className="text-xs text-lightText text-center px-4">
                       O pagamento é liberado após a confirmação de conclusão do serviço.
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