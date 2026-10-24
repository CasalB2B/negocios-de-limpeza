import React, { useState, useRef, useEffect } from 'react';
import { CollabLayout } from '../../components/CollabLayout';
import { Button } from '../../components/Button';
import { User, Lock, Bell, LogOut, Save, ChevronRight, ChevronDown, Camera, History, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useData } from '../../components/DataContext';

export const CollaboratorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentCollaborator, updateCollaborator, logoutCollaborator, services } = useData();
  
  // Modals State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Forms State
  const [userData, setUserData] = useState({ name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentCollaborator) {
      setUserData({
        name: currentCollaborator.name,
        email: currentCollaborator.email,
        phone: currentCollaborator.phone
      });
    }
  }, [currentCollaborator]);

  const handleLogout = () => {
    logoutCollaborator();
    navigate('/');
  };

  const handleUpdatePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentCollaborator) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      updateCollaborator(currentCollaborator.id, { photo: imageUrl });
    }
  };

  const handleSaveProfile = () => {
    if (currentCollaborator) {
      updateCollaborator(currentCollaborator.id, {
        name: userData.name,
        email: userData.email,
        phone: userData.phone
      });
      setShowEditModal(false);
    }
  };

  const handleSavePassword = () => {
    if (!currentCollaborator) return;
    
    if (passwordData.current !== currentCollaborator.password) {
      alert("A senha atual está incorreta.");
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      alert("A nova senha e a confirmação não conferem.");
      return;
    }
    if (passwordData.new.length < 4) {
      alert("A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    updateCollaborator(currentCollaborator.id, { password: passwordData.new });
    alert("Senha alterada com sucesso!");
    setShowPasswordModal(false);
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  // Histórico Filtrado + agrupado por mês
  const historyServices = services.filter(s => s.collaboratorId === currentCollaborator?.id && s.status === 'COMPLETED');

  const servicesByMonth = historyServices.reduce((acc, s) => {
    const parts = (s.date || '').split('/');
    const key = parts.length === 3 ? `${parts[1]}/${parts[2]}` : 'Sem data';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, typeof historyServices>);

  const sortedMonths = Object.keys(servicesByMonth).sort((a, b) => {
    if (a === 'Sem data') return 1;
    if (b === 'Sem data') return -1;
    const [ma, ya] = a.split('/').map(Number);
    const [mb, yb] = b.split('/').map(Number);
    return ya !== yb ? yb - ya : mb - ma;
  });

  const monthLabel = (key: string) => {
    if (key === 'Sem data') return 'Sem data';
    const [m, y] = key.split('/').map(Number);
    const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${names[m - 1]} ${y}`;
  };

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([sortedMonths[0] || '']));

  if (!currentCollaborator) return null;

  return (
    <CollabLayout title="Perfil">
      <div className="flex flex-col items-center pt-2">
         <div className="w-full max-w-lg">

            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm text-center mb-6 relative overflow-hidden">
               <div className="relative inline-block mb-4 group">
                  <div className="w-28 h-28 rounded-full p-1 border-2 border-purple-100 mx-auto overflow-hidden relative">
                     <img 
                        src={currentCollaborator.photo || `https://i.pravatar.cc/150?u=${currentCollaborator.id}`} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover" 
                     />
                     <div 
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                     >
                        <Camera className="text-white" size={24} />
                     </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpdatePhoto} />
               </div>
               
               <h2 className="text-2xl font-bold text-darkText mb-1">{currentCollaborator.name}</h2>
               <p className="text-lightText text-sm mb-5 flex items-center justify-center gap-2">
                  <Mail size={14} /> {currentCollaborator.email}
               </p>

               <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Colaboradora Verificada
               </div>
            </div>

            <div className="space-y-3">
               <button 
                  onClick={() => setShowEditModal(true)}
                  className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-all group active:scale-[0.98]"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-purple-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <User size={22} />
                     </div>
                     <div className="text-left">
                        <p className="font-bold text-darkText text-sm">Dados Pessoais</p>
                        <p className="text-xs text-lightText">Altere seu nome e telefone</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </button>

               <button 
                  onClick={() => setShowHistoryModal(true)}
                  className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-all group active:scale-[0.98]"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-purple-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <History size={22} />
                     </div>
                     <div className="text-left">
                        <p className="font-bold text-darkText text-sm">Histórico de Serviços</p>
                        <p className="text-xs text-lightText">Veja seus atendimentos anteriores ({historyServices.length})</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </button>

               <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-all group active:scale-[0.98]"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-purple-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <Lock size={22} />
                     </div>
                     <div className="text-left">
                        <p className="font-bold text-darkText text-sm">Alterar senha</p>
                        <p className="text-xs text-lightText">Atualize suas credenciais de acesso</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </button>

               <button className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-all group active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-purple-50 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <Bell size={22} />
                     </div>
                     <div className="text-left">
                        <p className="font-bold text-darkText text-sm">Notificações</p>
                        <p className="text-xs text-lightText">Gerencie seus alertas e mensagens</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
               </button>
            </div>

            <button 
               onClick={handleLogout}
               className="w-full mt-8 bg-white border border-red-100 text-red-500 font-bold py-4 rounded-2xl hover:bg-red-50 flex items-center justify-center gap-2 transition-colors active:scale-[0.98] shadow-sm"
            >
               <LogOut size={20} /> Sair da Conta
            </button>

            <p className="text-center text-[10px] text-gray-300 mt-8 mb-8 uppercase tracking-[0.2em] font-bold">Negócios de Limpeza v2.4.0</p>
         </div>

         {/* Modal: Editar Dados Pessoais */}
         <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title="Editar Dados Pessoais"
            footer={
               <>
                  <button onClick={() => setShowEditModal(false)} className="px-6 py-3 font-bold text-lightText hover:text-darkText hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                  <Button onClick={handleSaveProfile} icon={<Save size={18} />}>Salvar</Button>
               </>
            }
         >
            <div className="space-y-4">
               <Input 
                  label="Nome Completo" 
                  value={userData.name} 
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
               />
               <Input
                  label="Telefone / WhatsApp"
                  value={userData.phone}
                  onChange={(e) => setUserData({...userData, phone: e.target.value})}
               />
               <div>
                  <label className="block text-xs font-bold text-lightText mb-1.5 uppercase tracking-wider">E-mail</label>
                  <div className="w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 text-sm text-gray-500 flex items-center gap-2">
                     <Mail size={14} className="text-gray-400 shrink-0" />
                     {userData.email}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">O e-mail é gerenciado pela empresa. Entre em contato com o admin para alterações.</p>
               </div>
               <p className="text-xs text-lightText bg-gray-50 p-3 rounded-lg border border-gray-100">
                  Para alterar dados como CPF ou dados bancários, entre em contato com a empresa.
               </p>
            </div>
         </Modal>

         {/* Modal: Alterar Senha */}
         <Modal
            isOpen={showPasswordModal}
            onClose={() => setShowPasswordModal(false)}
            title="Alterar Senha"
            footer={
               <>
                  <button onClick={() => setShowPasswordModal(false)} className="px-6 py-3 font-bold text-lightText hover:text-darkText hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                  <Button onClick={handleSavePassword} icon={<Save size={18} />}>Atualizar</Button>
               </>
            }
         >
            <div className="space-y-4">
               <Input 
                  label="Senha Atual" 
                  type="password"
                  value={passwordData.current} 
                  onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
               />
               <Input 
                  label="Nova Senha" 
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
               />
               <Input 
                  label="Confirmar Nova Senha" 
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
               />
            </div>
         </Modal>

         {/* Modal: Histórico */}
         <Modal
            isOpen={showHistoryModal}
            onClose={() => setShowHistoryModal(false)}
            title="Histórico de Serviços"
            maxWidth="md"
            footer={
               <Button onClick={() => setShowHistoryModal(false)}>Fechar</Button>
            }
         >
            <div className="space-y-3">
               {sortedMonths.length > 0 ? sortedMonths.map(monthKey => {
                  const isOpen = expandedMonths.has(monthKey);
                  const monthServices = servicesByMonth[monthKey];
                  return (
                     <div key={monthKey} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                           onClick={() => setExpandedMonths(prev => {
                              const next = new Set(prev);
                              next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
                              return next;
                           })}
                           className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                           <span className="font-bold text-sm text-darkText">{monthLabel(monthKey)}</span>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-lightText bg-white px-2 py-0.5 rounded-full border border-gray-200">{monthServices.length} serviço{monthServices.length !== 1 ? 's' : ''}</span>
                              <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                           </div>
                        </button>
                        {isOpen && (
                           <div className="divide-y divide-gray-50">
                              {monthServices.map(service => (
                                 <div key={service.id} className="px-4 py-3 flex justify-between items-center">
                                    <div>
                                       <p className="font-semibold text-sm text-darkText">{service.type}</p>
                                       <p className="text-xs text-lightText">{service.date} · {service.clientName}</p>
                                    </div>
                                    <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-lg">R$ {service.price?.toFixed(2) ?? '—'}</span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  );
               }) : (
                  <div className="text-center py-8 text-lightText">
                     Nenhum serviço concluído encontrado.
                  </div>
               )}
            </div>
         </Modal>
      </div>
    </CollabLayout>
  );
};