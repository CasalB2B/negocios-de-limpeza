import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole, CollabStep } from '../../types';
import { Button } from '../../components/Button';
import { MapPin, Clock, CheckSquare, Camera, LogOut, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export const ServiceExecution: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Service ID
  const [currentStep, setCurrentStep] = useState<CollabStep>(CollabStep.CHECK_IN);
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Limpar janelas', checked: false },
    { id: 2, text: 'Aspirar tapetes', checked: false },
    { id: 3, text: 'Higienizar banheiros', checked: false },
    { id: 4, text: 'Limpar cozinha', checked: false },
  ]);

  // Step 1: Service Details & Check-in
  const renderCheckIn = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-4">Detalhes do Serviço #{id}</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="text-secondary mt-1" />
            <div>
              <p className="font-bold text-darkText">Residência de Maria Silva</p>
              <p className="text-lightText">Rua das Flores, 123 - Centro</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="text-secondary mt-1" />
            <div>
              <p className="font-bold text-darkText">08:00 - 12:00</p>
              <p className="text-lightText">Limpeza Pesada</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl h-48 flex items-center justify-center text-lightText font-medium">
        [Mapa de Localização]
      </div>

      <Button 
        fullWidth 
        variant="secondary" 
        size="lg"
        onClick={() => setCurrentStep(CollabStep.CHECKLIST)}
        icon={<MapPin />}
      >
        Realizar Check-in
      </Button>
    </div>
  );

  // Step 2: Checklist
  const renderChecklist = () => {
    const allChecked = checklist.every(i => i.checked);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Checklist</h2>
          <span className="bg-secondary/10 text-secondary text-xs font-bold px-2 py-1 rounded">Em andamento</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {checklist.map(item => (
            <div key={item.id} className="p-4 border-b border-gray-100 flex items-center gap-4 hover:bg-gray-50 cursor-pointer" onClick={() => {
              const newChecklist = checklist.map(i => i.id === item.id ? {...i, checked: !i.checked} : i);
              setChecklist(newChecklist);
            }}>
              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-secondary border-secondary text-white' : 'border-gray-300'}`}>
                {item.checked && <CheckCircle size={14} />}
              </div>
              <span className={item.checked ? 'line-through text-lightText' : 'text-darkText'}>{item.text}</span>
            </div>
          ))}
        </div>

        <Button 
          fullWidth 
          variant="secondary"
          disabled={!allChecked}
          onClick={() => setCurrentStep(CollabStep.PHOTOS)}
        >
          Próxima Etapa: Fotos
        </Button>
      </div>
    );
  };

  // Step 3: Photos
  const renderPhotos = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Registro Fotográfico</h2>
      <p className="text-lightText mb-4">Adicione fotos do antes e depois para garantir a qualidade.</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="aspect-square bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-lightText hover:border-secondary hover:text-secondary cursor-pointer transition-colors">
          <Camera size={32} />
          <span className="text-xs font-bold mt-2">ANTES</span>
        </div>
        <div className="aspect-square bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-lightText hover:border-secondary hover:text-secondary cursor-pointer transition-colors">
          <Camera size={32} />
          <span className="text-xs font-bold mt-2">DEPOIS</span>
        </div>
      </div>

      <Button 
        fullWidth 
        variant="secondary"
        onClick={() => setCurrentStep(CollabStep.CHECK_OUT)}
      >
        Concluir Fotos
      </Button>
    </div>
  );

  // Step 4: Check-out
  const renderCheckout = () => (
    <div className="space-y-6 text-center pt-8">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={40} />
      </div>
      <h2 className="text-2xl font-bold">Serviço Finalizado!</h2>
      <p className="text-lightText">Obrigado pelo seu excelente trabalho.</p>

      <div className="bg-white p-6 rounded-2xl text-left border border-gray-100 mt-8">
        <h3 className="font-bold mb-2">Resumo</h3>
        <p className="text-sm text-lightText flex justify-between"><span>Tempo total:</span> <span>3h 45m</span></p>
        <p className="text-sm text-lightText flex justify-between mt-1"><span>Status:</span> <span className="text-green-600 font-bold">Concluído</span></p>
      </div>

      <Button 
        fullWidth 
        onClick={() => navigate('/collab/agenda')}
      >
        Voltar para Agenda
      </Button>
    </div>
  );

  return (
    <Layout role={UserRole.COLLABORATOR}>
      <div className="max-w-md mx-auto">
        {currentStep !== CollabStep.FINISHED && currentStep !== CollabStep.CHECK_IN && (
           <button onClick={() => setCurrentStep(CollabStep.CHECK_IN)} className="mb-4 text-lightText flex items-center gap-1"><ArrowLeft size={16}/> Voltar para Detalhes</button>
        )}
        
        {currentStep === CollabStep.CHECK_IN && renderCheckIn()}
        {currentStep === CollabStep.CHECKLIST && renderChecklist()}
        {currentStep === CollabStep.PHOTOS && renderPhotos()}
        {currentStep === CollabStep.CHECK_OUT && renderCheckout()}
      </div>
    </Layout>
  );
};