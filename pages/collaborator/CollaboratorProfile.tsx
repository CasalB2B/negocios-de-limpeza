import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { User, Settings, Lock, Bell, LogOut, X, Save, Phone, ChevronRight, Camera, History, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal'; // Usando o Modal reutilizável
import { useData } from '../../components/DataContext'; // Usando dados reais

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

   // Histórico Filtrado
   const historyServices = services.filter(s => s.collaboratorId === currentCollaborator?.id && s.status === 'COMPLETED');

   const calculatePayout = (service: any) => {
      const settings = useData().platformSettings;
      if (!currentCollaborator || !settings) return 0;
      const level = (currentCollaborator.level || 'JUNIOR').toLowerCase() as 'junior' | 'senior' | 'master';

      // Tentativa de pegar a duração real se existir
      const durationStr = String(service.duration || '4h');
      const hours = parseInt(durationStr.replace('h', '')) || 4;

      const matrix = settings.payouts[level];
      if (hours <= 4) return matrix.hours4;
      if (hours <= 6) return matrix.hours6;
      return matrix.hours8;
   };

   if (!currentCollaborator) return null;

   return (
      <Layout role={UserRole.COLLABORATOR}>
         <div className="h-full flex flex-col items-center justify-start pt-6">
            <div className="w-full max-w-lg">

               <div className="flex justify-between items-center mb-8 px-2">
                  <h1 className="text-3xl font-display font-bold text-darkText">Perfil</h1>
                  <Settings className="text-lightText cursor-pointer hover:text-darkText transition-colors" />
               </div>

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
                           <p className="text-xs text-lightText">Edite seu nome, e-mail e endereço</p>
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
                     onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  />
                  <Input
                     label="Telefone / WhatsApp"
                     value={userData.phone}
                     onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  />
                  <Input
                     label="E-mail"
                     type="email"
                     value={userData.email}
                     onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  />
                  <p className="text-xs text-lightText bg-gray-50 p-3 rounded-lg border border-gray-100">
                     Para alterar dados sensíveis como CPF ou Endereço Bancário, entre em contato com o suporte.
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
                     onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  />
                  <Input
                     label="Nova Senha"
                     type="password"
                     value={passwordData.new}
                     onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  />
                  <Input
                     label="Confirmar Nova Senha"
                     type="password"
                     value={passwordData.confirm}
                     onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
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
               <div className="space-y-4">
                  {historyServices.length > 0 ? historyServices.map(service => (
                     <div key={service.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div>
                           <p className="font-bold text-darkText">{service.type}</p>
                           <p className="text-xs text-lightText">{service.date} - {service.clientName}</p>
                        </div>
                        <div className="text-right">
                           <span className="text-green-600 font-bold text-sm bg-green-100 px-2 py-1 rounded">R$ {calculatePayout(service).toFixed(2)}</span>
                        </div>
                     </div>
                  )) : (
                     <div className="text-center py-8 text-lightText">
                        Nenhum serviço concluído encontrado.
                     </div>
                  )}
               </div>
            </Modal>
         </div>
      </Layout>
   );
};