import React from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../components/DataContext';

export const ServiceCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { updateServiceStatus } = useData();

  const handleFinishService = () => {
    if (id) {
      updateServiceStatus(id, 'COMPLETED');
      alert("Serviço concluído! O financeiro foi atualizado.");
    }
    navigate('/collab/finance'); // Redireciona para o financeiro para ver o saldo
  };

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        
        <div className="w-full text-left mb-8 flex items-center gap-2 text-sm text-lightText">
           <ArrowLeft size={16} className="cursor-pointer" onClick={() => navigate(`/collab/service/${id}/photos`)} />
           <span>Serviços Ativos / Finalizar Serviço</span>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full text-center">
           <h1 className="text-3xl font-display font-bold text-darkText mb-2">Finalizar Atendimento</h1>
           <p className="text-lightText mb-8 max-w-md mx-auto">Deseja relatar algo sobre a limpeza? O preenchimento abaixo é opcional.</p>

           <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 mb-8 text-left">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-primary">
                 <Clock size={24} />
              </div>
              <div>
                 <p className="text-xs font-bold text-lightText uppercase">SERVIÇO</p>
                 <p className="font-bold text-darkText">Limpeza Residencial</p>
              </div>
           </div>

           <div className="text-left mb-6">
              <label className="block text-sm font-bold text-darkText mb-2">Ocorrências/observações (opcional)</label>
              <textarea className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-primary h-32 text-sm bg-white" placeholder="Descreva aqui qualquer imprevisto..." />
           </div>

           <Button 
              fullWidth 
              className="h-14 shadow-lg shadow-primary/30 text-lg mb-6" 
              icon={<CheckCircle size={22} />}
              onClick={handleFinishService}
           >
              Finalizar serviço
           </Button>

           <button onClick={() => navigate('/collab/agenda')} className="text-lightText text-sm hover:text-red-500 font-medium">
              Cancelar e voltar
           </button>
        </div>
      </div>
    </Layout>
  );
};