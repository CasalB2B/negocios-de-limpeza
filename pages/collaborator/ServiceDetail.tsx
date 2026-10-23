import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Clock, Play, CheckSquare, Camera, AlertCircle, DollarSign } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { CollabLayout } from '../../components/CollabLayout';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'AGENDADO', CONFIRMED: 'CONFIRMADO', WAITING_SIGNAL: 'AGUARDANDO SINAL',
  IN_PROGRESS: 'EM ANDAMENTO', COMPLETED: 'CONCLUÍDO', CANCELLED: 'CANCELADO',
};

const STATUS_STYLE: Record<string, string> = {
  SCHEDULED: 'bg-violet-100 text-violet-700',
  CONFIRMED: 'bg-violet-100 text-violet-700',
  WAITING_SIGNAL: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export const ServiceDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { services } = useData();

  const service = services.find(s => s.id === id);

  if (!service) {
    return (
      <CollabLayout title="Serviço" showBack backTo="/collab/agenda">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-bold text-gray-700">Serviço não encontrado</p>
          <button onClick={() => navigate('/collab/agenda')} className="mt-4 text-violet-600 font-semibold text-sm">
            Voltar para agenda
          </button>
        </div>
      </CollabLayout>
    );
  }

  const addressQuery = encodeURIComponent(service.address || '');
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`;
  const isActive = ['SCHEDULED','CONFIRMED','WAITING_SIGNAL'].includes(service.status);
  const isInProgress = service.status === 'IN_PROGRESS';
  const isCompleted = service.status === 'COMPLETED';

  return (
    <CollabLayout title="Detalhes do Serviço" showBack backTo="/collab/agenda">
      <div className="max-w-lg mx-auto space-y-4 pb-6">

        {/* Status + type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLE[service.status] || STATUS_STYLE.SCHEDULED}`}>
              {STATUS_LABEL[service.status] || service.status}
            </span>
            {service.price != null && (
              <span className="flex items-center gap-1 font-bold text-gray-900">
                <DollarSign size={14} className="text-green-600" />
                R$ {service.price.toFixed(2)}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900">{service.type}</h2>
          {service.duration && (
            <p className="text-xs text-gray-400 mt-0.5">{service.duration}h estimadas</p>
          )}
        </div>

        {/* Date + Time */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Data e horário</p>
            <p className="font-bold text-gray-900 text-sm">{service.date}{service.time ? ` às ${service.time}` : ''}</p>
          </div>
        </div>

        {/* Address + Maps link */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 shrink-0">
              <MapPin size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Endereço</p>
              <p className="font-bold text-gray-900 text-sm leading-snug">{service.address || 'Endereço não informado'}</p>
            </div>
          </div>
          {service.address && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <MapPin size={15} /> Abrir rota no Google Maps
            </a>
          )}
        </div>

        {/* Client */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 shrink-0 font-bold text-base">
            {service.clientName?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Cliente</p>
            <p className="font-bold text-gray-900 text-sm">{service.clientName}</p>
          </div>
        </div>

        {/* Notes */}
        {service.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Observações</p>
              <p className="text-sm text-gray-700">{service.notes}</p>
            </div>
          </div>
        )}

        {/* Photos if completed */}
        {isCompleted && (service as any).photos && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={16} className="text-violet-600" />
              <p className="font-bold text-gray-900 text-sm">Fotos registradas</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[...((service as any).photos?.before || []), ...((service as any).photos?.after || [])].map((src: string, i: number) => (
                <img key={i} src={src} alt="foto" className="w-20 h-20 rounded-xl object-cover border border-gray-100 shrink-0" />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {isActive && (
          <button
            onClick={() => navigate(`/collab/service/${id}/checkin`)}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg shadow-violet-200 active:scale-[0.97] transition-all"
          >
            <Play size={18} fill="white" /> Fazer Check-in
          </button>
        )}

        {isInProgress && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/collab/service/${id}/checklist`)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-200 active:scale-[0.97] transition-all"
            >
              <CheckSquare size={16} /> Checklist
            </button>
            <button
              onClick={() => navigate(`/collab/service/${id}/photos`)}
              className="bg-white border-2 border-orange-400 text-orange-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-[0.97] transition-all"
            >
              <Camera size={16} /> Fotos
            </button>
          </div>
        )}

        {isInProgress && (
          <button
            onClick={() => navigate(`/collab/service/${id}/checkout`)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base shadow-lg shadow-green-200 active:scale-[0.97] transition-all"
          >
            Finalizar Serviço ✓
          </button>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-2 bg-green-50 text-green-700 font-bold py-4 rounded-2xl border border-green-100">
            ✓ Serviço concluído
          </div>
        )}
      </div>
    </CollabLayout>
  );
};
