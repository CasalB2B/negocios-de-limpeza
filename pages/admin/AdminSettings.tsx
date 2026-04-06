import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Settings, Shield, Bell, CreditCard, Building, Save, ToggleLeft, ToggleRight, DollarSign, Users, Camera, Loader } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';

export const AdminSettings: React.FC = () => {
  const { platformSettings, updatePlatformSettings } = useData();
  const [activeTab, setActiveTab] = useState('general');
  const [notifications, setNotifications] = useState({ email: true, whatsapp: true });
  const [adminPhoto, setAdminPhoto] = useState<string>(() => localStorage.getItem('admin_photo') || '');
  const [adminName, setAdminName] = useState<string>(() => localStorage.getItem('admin_name') || 'Administrador');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const adminPhotoRef = useRef<HTMLInputElement>(null);
  const [localSettings, setLocalSettings] = useState({ ...platformSettings, companyName: (platformSettings as any).companyName || 'Negócios de Limpeza', supportEmail: (platformSettings as any).supportEmail || 'suporte@negociosdelimpeza.com.br' });

  useEffect(() => {
      setLocalSettings(platformSettings);
  }, [platformSettings]);


  const handleSavePlatformSettings = () => {
      updatePlatformSettings(localSettings);
      alert("Configurações financeiras atualizadas com sucesso!");
  };

  const handleSaveGeneralSettings = () => {
      updatePlatformSettings(localSettings as any);
      localStorage.setItem('admin_name', adminName);
      alert("Informações da empresa salvas com sucesso!");
  };

  // Helper para atualizar matriz de valores
  const updatePayout = (level: 'junior' | 'senior' | 'master', hours: 'hours4' | 'hours6' | 'hours8', value: number) => {
      setLocalSettings(prev => ({
          ...prev,
          payouts: {
              ...prev.payouts,
              [level]: {
                  ...prev.payouts[level],
                  [hours]: value
              }
          }
      }));
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'general':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
             {/* Admin Profile Photo */}
             <div>
                <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-4">Perfil do Administrador</h3>
                <div className="flex items-center gap-6">
                   <div className="relative group cursor-pointer" onClick={() => !uploadingPhoto && adminPhotoRef.current?.click()}>
                      <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                         {adminPhoto
                           ? <img src={adminPhoto} alt="Admin" className="w-full h-full object-cover" />
                           : <span className="text-3xl">👤</span>}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         {uploadingPhoto ? <Loader className="text-white animate-spin" size={20} /> : <Camera className="text-white" size={20} />}
                      </div>
                      <input
                         type="file"
                         ref={adminPhotoRef}
                         className="hidden"
                         accept="image/*"
                         onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            // Preview imediato
                            const preview = URL.createObjectURL(file);
                            setAdminPhoto(preview);
                            setUploadingPhoto(true);
                            try {
                              const path = `admin/profile_${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
                              const { error } = await supabase.storage.from('admin-assets').upload(path, file, { upsert: true });
                              if (!error) {
                                const { data } = supabase.storage.from('admin-assets').getPublicUrl(path);
                                setAdminPhoto(data.publicUrl);
                                localStorage.setItem('admin_photo', data.publicUrl);
                              } else {
                                // fallback: guarda dataURL localmente
                                const reader = new FileReader();
                                reader.onload = ev => {
                                  const dataUrl = ev.target?.result as string;
                                  setAdminPhoto(dataUrl);
                                  localStorage.setItem('admin_photo', dataUrl);
                                };
                                reader.readAsDataURL(file);
                              }
                            } finally {
                              setUploadingPhoto(false);
                            }
                         }}
                      />
                   </div>
                   <div className="flex-1">
                      <input
                        className="font-bold text-darkText dark:text-darkTextPrimary bg-transparent border-b border-gray-200 dark:border-darkBorder focus:border-primary outline-none w-full mb-1 text-sm"
                        value={adminName}
                        onChange={e => setAdminName(e.target.value)}
                        placeholder="Seu nome"
                      />
                      <p className="text-sm text-lightText dark:text-darkTextSecondary">Super Admin</p>
                      <button onClick={() => adminPhotoRef.current?.click()} className="text-xs text-primary font-bold mt-1 hover:underline">Alterar foto</button>
                   </div>
                </div>
             </div>

             <div className="border-t border-gray-100 dark:border-darkBorder pt-6">
                <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-4">Informações da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Input
                     label="Nome da Empresa"
                     value={(localSettings as any).companyName || ''}
                     onChange={e => setLocalSettings({ ...localSettings, companyName: e.target.value } as any)}
                     placeholder="Ex: Negócios de Limpeza"
                   />
                   <Input
                     label="E-mail de Suporte"
                     value={(localSettings as any).supportEmail || ''}
                     onChange={e => setLocalSettings({ ...localSettings, supportEmail: e.target.value } as any)}
                     placeholder="suporte@suaempresa.com.br"
                   />
                   <Input
                     label="Telefone de Contato (notificações WhatsApp)"
                     value={localSettings.contactPhone ?? ''}
                     onChange={e => setLocalSettings({ ...localSettings, contactPhone: e.target.value })}
                     placeholder="(27) 99980-8013"
                   />
                   <Input label="CNPJ" defaultValue="00.000.000/0001-99" />
                </div>
             </div>
             <div>
                <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-4">Endereço Comercial</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <Input label="CEP" defaultValue="29200-000" containerClassName="md:col-span-1" />
                   <Input label="Endereço" defaultValue="Guarapari, ES" containerClassName="md:col-span-2" />
                </div>
             </div>
             <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-darkBorder">
                <Button onClick={handleSaveGeneralSettings} icon={<Save size={18}/>}>Salvar Alterações</Button>
             </div>
          </div>
        );
      case 'services':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-6">
                <p className="text-sm text-primary font-bold flex items-center gap-2">
                   <DollarSign size={16} /> Defina os valores fixos de repasse para cada nível de experiência e duração do serviço.
                </p>
             </div>
             
             <div>
                <h3 className="text-xl font-bold text-darkText mb-4">Tabela de Repasse (Matriz por Horas)</h3>
                
                {/* Matriz de Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* JUNIOR COL */}
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">JUNIOR</span>
                        </div>
                        <Input 
                            label="Valor para 4 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.junior.hours4}
                            onChange={e => updatePayout('junior', 'hours4', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                            label="Valor para 6 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.junior.hours6}
                            onChange={e => updatePayout('junior', 'hours6', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                            label="Valor para 8 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.junior.hours8}
                            onChange={e => updatePayout('junior', 'hours8', parseFloat(e.target.value) || 0)}
                        />
                    </div>

                    {/* SENIOR COL */}
                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">SENIOR</span>
                        </div>
                        <Input 
                            label="Valor para 4 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.senior.hours4}
                            onChange={e => updatePayout('senior', 'hours4', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                            label="Valor para 6 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.senior.hours6}
                            onChange={e => updatePayout('senior', 'hours6', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                            label="Valor para 8 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.senior.hours8}
                            onChange={e => updatePayout('senior', 'hours8', parseFloat(e.target.value) || 0)}
                        />
                    </div>

                    {/* MASTER COL */}
                    <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold uppercase">MESTRE</span>
                        </div>
                        <Input 
                            label="Valor para 4 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.master.hours4}
                            onChange={e => updatePayout('master', 'hours4', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                            label="Valor para 6 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.master.hours6}
                            onChange={e => updatePayout('master', 'hours6', parseFloat(e.target.value) || 0)}
                        />
                        <Input 
                            label="Valor para 8 Horas" 
                            icon={<span className="text-xs font-bold text-gray-500">R$</span>}
                            type="number"
                            value={localSettings.payouts.master.hours8}
                            onChange={e => updatePayout('master', 'hours8', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </div>
             </div>

             <div className="border-t border-gray-100 pt-6">
                <h3 className="text-xl font-bold text-darkText mb-4">Taxas Operacionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Input 
                      label="Valor Hora Base (Referência Cliente)" 
                      value={localSettings.hourlyRate}
                      onChange={e => setLocalSettings({...localSettings, hourlyRate: parseFloat(e.target.value) || 0})}
                      icon={<span className="text-xs font-bold">R$</span>} 
                   />
                   <Input 
                      label="Taxa Mínima de Deslocamento" 
                      value={localSettings.minDisplacement}
                      onChange={e => setLocalSettings({...localSettings, minDisplacement: parseFloat(e.target.value) || 0})}
                      icon={<span className="text-xs font-bold">R$</span>} 
                   />
                </div>
             </div>

             <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={handleSavePlatformSettings} icon={<Save size={18}/>}>Atualizar Taxas</Button>
             </div>
          </div>
        );
      case 'notifications':
        return (
           <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-darkText mb-4">Preferências de Notificação</h3>
              
              <div className="bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl divide-y divide-gray-100 dark:divide-darkBorder">
                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText dark:text-darkTextPrimary">E-mail</p>
                       <p className="text-sm text-lightText dark:text-darkTextSecondary">Receber novos orçamentos e alertas por e-mail.</p>
                    </div>
                    <button onClick={() => setNotifications({...notifications, email: !notifications.email})} className={`transition-colors ${notifications.email ? 'text-primary' : 'text-gray-300'}`}>
                       {notifications.email ? <ToggleRight size={40} fill="currentColor" className="text-primary/20" /> : <ToggleLeft size={40} />}
                    </button>
                 </div>

                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText dark:text-darkTextPrimary">WhatsApp</p>
                       <p className="text-sm text-lightText dark:text-darkTextSecondary">Notificações de novos orçamentos via WhatsApp.</p>
                    </div>
                    <button onClick={() => setNotifications({...notifications, whatsapp: !notifications.whatsapp})} className={`transition-colors ${notifications.whatsapp ? 'text-primary' : 'text-gray-300'}`}>
                       {notifications.whatsapp ? <ToggleRight size={40} fill="currentColor" className="text-primary/20" /> : <ToggleLeft size={40} />}
                    </button>
                 </div>
              </div>
           </div>
        );
      case 'users':
         return (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="mb-2">
                  <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary flex items-center gap-2"><Users size={20}/> Visualizar como Usuário</h3>
                  <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Acesse os portais de cliente e colaboradora para testar o fluxo completo.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a href="#/client/dashboard" target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-4 p-5 bg-purple-50 dark:bg-primary/10 border border-purple-200 dark:border-primary/30 rounded-2xl hover:shadow-md transition-all group">
                     <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white text-xl">👤</div>
                     <div>
                        <p className="font-bold text-darkText dark:text-darkTextPrimary group-hover:text-primary transition-colors">Portal do Cliente</p>
                        <p className="text-xs text-lightText dark:text-darkTextSecondary">Ver tela como cliente logado</p>
                     </div>
                  </a>
                  <a href="#/collab/agenda" target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-4 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl hover:shadow-md transition-all group">
                     <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">🧹</div>
                     <div>
                        <p className="font-bold text-darkText dark:text-darkTextPrimary group-hover:text-blue-600 transition-colors">Portal da Colaboradora</p>
                        <p className="text-xs text-lightText dark:text-darkTextSecondary">Ver tela como colaboradora logada</p>
                     </div>
                  </a>
               </div>

               <div className="border-t border-gray-100 dark:border-darkBorder pt-6">
                  <h4 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-3 flex items-center gap-2"><Shield size={16}/> Acesso Admin</h4>
                  <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-4 border border-gray-200 dark:border-darkBorder">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="font-bold text-darkText dark:text-darkTextPrimary text-sm">Administrador</p>
                           <p className="text-xs text-lightText dark:text-darkTextSecondary">Super Admin • Acesso via e-mail cadastrado</p>
                        </div>
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded">Ativo</span>
                     </div>
                  </div>
               </div>
            </div>
         );
      default:
        return null;
    }
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-6xl mx-auto">
         <h1 className="text-3xl font-display font-bold text-darkText mb-2">Configurações</h1>
         <p className="text-lightText mb-8">Gerencie os parâmetros globais do sistema.</p>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="md:col-span-1 space-y-2">
               <button 
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'general' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-lightText hover:bg-white hover:text-darkText'}`}
               >
                  <Building size={18} /> Geral
               </button>
               <button 
                  onClick={() => setActiveTab('services')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'services' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-lightText hover:bg-white hover:text-darkText'}`}
               >
                  <CreditCard size={18} /> Financeiro & Taxas
               </button>
               <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'notifications' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-lightText hover:bg-white hover:text-darkText'}`}
               >
                  <Bell size={18} /> Notificações
               </button>
               <button 
                  onClick={() => setActiveTab('users')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'users' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-lightText hover:bg-white hover:text-darkText'}`}
               >
                  <Users size={18} /> Usuários & Permissões
               </button>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3">
               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 min-h-[500px]">
                  {renderContent()}
               </div>
            </div>
         </div>

      </div>
    </Layout>
  );
};