import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Plus, Calendar as CalendarIcon, X, Clock, MapPin, User, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { useData } from '../../components/DataContext';

export const AdminCalendar: React.FC = () => {
    const { services, clients, collaborators, addService, updateServiceStatus } = useData();
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // State for Assigning Collaborator
    const [assignCollabId, setAssignCollabId] = useState('');

    // New Appointment State
    const [newAppt, setNewAppt] = useState({
        clientId: '',
        collaboratorId: '',
        type: 'Limpeza Residencial',
        date: '',
        time: '08:00',
        price: ''
    });

    const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00'];
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeWeek = (days: number) => {
        const next = new Date(currentDate);
        next.setDate(currentDate.getDate() + days);
        setCurrentDate(next);
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentDate);
        d.setDate(currentDate.getDate() + i);
        return {
            name: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0] + ' ' + d.getDate(),
            fullDate: d.toLocaleDateString('pt-BR'),
            isToday: i === 0,
        }
    });

    const events = services.map(s => ({
        id: s.id,
        time: s.time,
        fullDate: s.date,
        client: s.clientName,
        address: s.address,
        collabId: s.collaboratorId,
        collab: s.collaboratorName || 'A Definir',
        type: s.type,
        color: s.status === 'COMPLETED' ? 'green' : s.status === 'IN_PROGRESS' ? 'orange' : s.status === 'CONFIRMED' || s.status === 'SCHEDULED' ? 'blue' : 'yellow',
        status: s.status,
        notes: s.notes
    }));

    const getEventForSlot = (dayFullDate: string, time: string) => {
        return events.find(ev => ev.fullDate === dayFullDate && ev.time.startsWith(time.split(':')[0]));
    };

    const handleCreateAppointment = () => {
        if (!newAppt.clientId || !newAppt.date) return;
        const selectedClient = clients.find(c => c.id === newAppt.clientId);
        const selectedCollab = collaborators.find(c => c.id === newAppt.collaboratorId);
        const [y, m, d] = newAppt.date.split('-');
        const dateFormatted = `${d}/${m}/${y}`;

        addService({
            id: Math.floor(Math.random() * 10000).toString(),
            clientId: newAppt.clientId,
            clientName: selectedClient?.name || 'Cliente',
            collaboratorId: newAppt.collaboratorId,
            collaboratorName: selectedCollab?.name || '',
            type: newAppt.type,
            date: dateFormatted,
            time: newAppt.time,
            address: selectedClient?.address || 'Endereço Principal',
            status: newAppt.collaboratorId ? 'CONFIRMED' : 'WAITING_SIGNAL', // Se tem collab e cria manual, assume confirmado
            price: parseFloat(newAppt.price) || 0,
            duration: '2h', // Valor padrão re-adicionado
            createdAt: Date.now()
        });
        setShowModal(false);
        setNewAppt({ clientId: '', collaboratorId: '', type: 'Limpeza Residencial', date: '', time: '08:00', price: '' });
    };

    const handleAssignCollaborator = () => {
        if (selectedEvent && assignCollabId) {
            const collab = collaborators.find(c => c.id === assignCollabId);
            updateServiceStatus(selectedEvent.id, 'CONFIRMED', {
                collaboratorId: assignCollabId,
                collaboratorName: collab?.name
            });
            setShowDetailModal(false);
            setAssignCollabId('');
        }
    };

    const renderWeekView = () => (
        <div className="min-w-[800px] md:min-w-0"> {/* FORÇA SCROLL HORIZONTAL NO MOBILE */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-darkBorder sticky top-0 bg-white dark:bg-darkSurface z-10">
                <div className="p-3 md:p-4 border-r border-gray-200 dark:border-darkBorder text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase text-center bg-gray-50/50 dark:bg-darkBg/50">Horário</div>
                {weekDays.map((day, i) => (
                    <div key={i} className={`p-2 md:p-4 border-r border-gray-200 dark:border-darkBorder text-center ${i === 6 ? 'border-r-0' : ''} ${day.isToday ? 'bg-purple-50 dark:bg-primary/10' : ''}`}>
                        <span className={`text-xs md:text-sm font-bold capitalize block ${day.isToday ? 'text-primary' : 'text-darkText dark:text-darkTextPrimary'}`}>
                            {day.name}
                        </span>
                    </div>
                ))}
            </div>

            <div className="divide-y divide-gray-200 dark:divide-darkBorder">
                {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-7 min-h-[100px] md:min-h-[120px]">
                        <div className="p-2 md:p-4 border-r border-gray-200 dark:border-darkBorder flex items-center justify-center text-xs md:text-sm font-medium text-lightText dark:text-darkTextSecondary bg-gray-50/30 dark:bg-darkBg/30">
                            {time}
                        </div>
                        {weekDays.map((day, dIdx) => {
                            const event = getEventForSlot(day.fullDate, time);
                            return (
                                <div key={dIdx} className="border-r border-gray-200 dark:border-darkBorder p-1 md:p-2 relative group">
                                    {event ? (
                                        <div
                                            onClick={() => { setSelectedEvent(event); setShowDetailModal(true); setAssignCollabId(event.collabId || ''); }}
                                            className={`h-full w-full bg-${event.color}-50 dark:bg-${event.color}-900/20 border-l-4 border-${event.color}-500 rounded-r p-1.5 md:p-2 cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-between`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-1">
                                                    <p className={`text-[10px] md:text-xs font-bold text-${event.color}-900 dark:text-${event.color}-300 leading-tight`}>
                                                        {event.collab !== 'A Definir' ? event.collab.split(' ')[0] : '⚠ S/ Colab'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className={`hidden md:block text-[9px] text-${event.color}-700 dark:text-${event.color}-400 leading-tight mb-0.5 font-bold`}>{event.type}</p>
                                                <p className={`text-[9px] md:text-[10px] font-bold text-${event.color}-900 dark:text-${event.color}-300 truncate`}>{event.client.split(' ')[0]}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <Layout role={UserRole.ADMIN}>
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Calendário Geral</h1>
                        <p className="text-lightText dark:text-darkTextSecondary flex items-center gap-2 mt-1 text-sm md:text-base">
                            <CalendarIcon size={16} /> Visão Semanal
                        </p>
                    </div>
                    <div className="flex items-center w-full md:w-auto gap-2">
                        <div className="flex items-center bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl p-1 gap-1">
                            <button
                                onClick={() => changeWeek(-7)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg transition-colors text-lightText"
                                title="Semana Anterior"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg"
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => changeWeek(7)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg transition-colors text-lightText"
                                title="Próxima Semana"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                        <Button icon={<Plus size={18} />} className="text-sm px-4 w-full md:w-auto" onClick={() => setShowModal(true)}>
                            Criar agendamento
                        </Button>
                    </div>
                </div>

                {/* Calendar Grid Container with Scroll */}
                <div className="bg-white dark:bg-darkSurface rounded-2xl shadow-sm border border-gray-200 dark:border-darkBorder flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto flex-1 w-full">
                        {renderWeekView()}
                    </div>
                </div>

                {/* Modal: Novo Agendamento */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-darkSurface rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-darkBorder animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-100 dark:border-darkBorder flex justify-between items-center bg-purple-50 dark:bg-primary/10">
                                <h2 className="text-xl font-bold text-primary">Novo Agendamento</h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/50 rounded-full text-primary transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                {/* Select Client */}
                                <div>
                                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Cliente</label>
                                    <select
                                        className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                                        value={newAppt.clientId}
                                        onChange={(e) => setNewAppt({ ...newAppt, clientId: e.target.value })}
                                    >
                                        <option value="">Selecione um cliente...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Data" type="date" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} />
                                    <Input label="Horário" type="time" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-1.5">Tipo</label>
                                        <select
                                            className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                                            value={newAppt.type}
                                            onChange={(e) => setNewAppt({ ...newAppt, type: e.target.value })}
                                        >
                                            <option>Limpeza Residencial</option>
                                            <option>Pós-Obra</option>
                                            <option>Passadoria</option>
                                        </select>
                                    </div>
                                    <Input label="Valor (R$)" type="number" value={newAppt.price} onChange={(e) => setNewAppt({ ...newAppt, price: e.target.value })} />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-darkBorder flex justify-end gap-3 bg-gray-50/50 dark:bg-darkBg/50 shrink-0">
                                <button onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-lightText hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors">Cancelar</button>
                                <Button onClick={handleCreateAppointment}>Agendar</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Detalhe do Serviço / Vincular Colaborador */}
                {showDetailModal && selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-darkSurface rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-darkBorder animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
                            <div className={`p-6 border-b border-gray-100 dark:border-darkBorder flex justify-between items-center bg-${selectedEvent.color}-50 dark:bg-${selectedEvent.color}-900/20 shrink-0`}>
                                <div>
                                    <h2 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Detalhes do Serviço</h2>
                                    <p className="text-xs text-lightText dark:text-darkTextSecondary font-bold uppercase tracking-wider">#{selectedEvent.id}</p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white dark:hover:bg-darkBg rounded-full text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 overflow-y-auto">
                                <div className="p-4 bg-gray-50 dark:bg-darkBg rounded-xl border border-gray-100 dark:border-darkBorder space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin size={18} className="text-lightText dark:text-darkTextSecondary mt-0.5" />
                                        <div>
                                            <p className="text-xs text-lightText dark:text-darkTextSecondary font-bold uppercase">ENDEREÇO</p>
                                            <p className="font-bold text-darkText dark:text-darkTextPrimary text-sm">{selectedEvent.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User size={18} className="text-lightText dark:text-darkTextSecondary" />
                                        <div>
                                            <p className="text-xs text-lightText dark:text-darkTextSecondary font-bold uppercase">CLIENTE</p>
                                            <p className="font-bold text-darkText dark:text-darkTextPrimary">{selectedEvent.client}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Área de Vinculação */}
                                <div className="border-t border-gray-100 dark:border-darkBorder pt-4">
                                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Profissional Responsável</label>
                                    {selectedEvent.collab !== 'A Definir' ? (
                                        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                                            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                                            <span className="font-bold text-green-700 dark:text-green-300">{selectedEvent.collab}</span>
                                            <button onClick={() => setAssignCollabId('')} className="ml-auto text-xs text-red-500 hover:underline">Trocar</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-xs font-bold">
                                                <AlertTriangle size={14} /> Este serviço precisa de um profissional.
                                            </div>
                                            <select
                                                className="w-full p-3 bg-white dark:bg-darkSurface border border-gray-300 dark:border-darkBorder rounded-xl outline-none"
                                                value={assignCollabId}
                                                onChange={(e) => setAssignCollabId(e.target.value)}
                                            >
                                                <option value="">Selecione um colaborador...</option>
                                                {collaborators.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                                                ))}
                                            </select>
                                            <Button size="sm" fullWidth onClick={handleAssignCollaborator} disabled={!assignCollabId}>Vincular Colaborador</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};