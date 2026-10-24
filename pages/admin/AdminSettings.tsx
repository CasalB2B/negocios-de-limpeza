import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Settings, Shield, Bell, CreditCard, Building, Save, ToggleLeft, ToggleRight, DollarSign, Users, Camera, Loader, Plug, MessageCircle, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useData } from '../../components/DataContext';
import { supabase } from '../../lib/supabase';

export const AdminSettings: React.FC = () => {
  const { platformSettings, updatePlatformSettings } = useData();
  const [activeTab, setActiveTab] = useState('general');
  const [notifications, setNotifications] = useState(() => ({
    email: localStorage.getItem('notif_email') !== 'false',
    whatsapp: localStorage.getItem('notif_whatsapp') !== 'false',
  }));

  const [waToken, setWaToken] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [ipKey, setIpKey] = useState('');
  const [integLoading, setIntegLoading] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [ipSaved, setIpSaved] = useState(false);

  useEffect(() => {
    if (activeTab !== 'integracoes') return;
    (async () => {
      setIntegLoading(true);
      try {
        const { data } = await supabase.from('platform_settings').select('whatsapp_token, whatsapp_phone_id, infinitepay_key').eq('id', 1).single();
        if (data) {
          if (data.whatsapp_token) setWaToken(data.whatsapp_token);
          if (data.whatsapp_phone_id) setWaPhoneId(data.whatsapp_phone_id);
          if (data.infinitepay_key) setIpKey(data.infinitepay_key);
        }
      } catch { /* columns may not exist yet */ }
      setIntegLoading(false);
    })();
  }, [activeTab]);

  const handleSaveWhatsApp = async () => {
    await supabase.from('platform_settings').upsert({ id: 1, whatsapp_token: waToken, whatsapp_phone_id: waPhoneId });
    setWaSaved(true);
    setTimeout(() => setWaSaved(false), 2000);
  };

  const handleSaveInfinityPay = async () => {
    await supabase.from('platform_settings').upsert({ id: 1, infinitepay_key: ipKey });
    setIpSaved(true);
    setTimeout(() => setIpSaved(false), 2000);
  };
  const [notifSaved, setNotifSaved] = useState(false);

  const handleSaveNotifications = () => {
    localStorage.setItem('notif_email', String(notifications.email));
    localStorage.setItem('notif_whatsapp', String(notifications.whatsapp));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };
  const [adminPhoto, setAdminPhoto] = useState<string>(() => platformSettings.adminPhoto || localStorage.getItem('admin_photo') || '');
  const [adminName, setAdminName] = useState<string>(() => platformSettings.adminName || localStorage.getItem('admin_name') || 'Administrador');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const adminPhotoRef = useRef<HTMLInputElement>(null);
  type LocalSettings = typeof platformSettings & { companyName: string; supportEmail: string };
  const [localSettings, setLocalSettings] = useState<LocalSettings>({
    ...platformSettings,
    companyName: localStorage.getItem('company_name') || 'Negócios de Limpeza',
    supportEmail: localStorage.getItem('support_email') || 'suporte@negociosdelimpeza.com.br',
  });

  useEffect(() => {
    setLocalSettings(prev => ({ ...platformSettings, companyName: prev.companyName, supportEmail: prev.supportEmail }));
    if (platformSettings.adminPhoto) setAdminPhoto(platformSettings.adminPhoto);
    if (platformSettings.adminName) setAdminName(platformSettings.adminName);
  }, [platformSettings]);


  const handleSavePlatformSettings = () => {
      updatePlatformSettings(localSettings);
      alert("Configurações financeiras atualizadas com sucesso!");
  };

  const handleSaveGeneralSettings = () => {
      const { companyName, supportEmail, ...settings } = localSettings;
      updatePlatformSettings({ ...settings, adminPhoto, adminName });
      localStorage.setItem('admin_name', adminName);
      localStorage.setItem('admin_photo', adminPhoto);
      localStorage.setItem('company_name', companyName);
      localStorage.setItem('support_email', supportEmail);
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
                                // Salva no Supabase para sincronizar entre dispositivos
                                await updatePlatformSettings({ ...platformSettings, adminPhoto: data.publicUrl, adminName });
                              } else {
                                // fallback: guarda dataURL localmente (sem Supabase Storage)
                                const reader = new FileReader();
                                reader.onload = ev => {
                                  const dataUrl = ev.target?.result as string;
                                  setAdminPhoto(dataUrl);
                                  localStorage.setItem('admin_photo', dataUrl);
                                  updatePlatformSettings({ ...platformSettings, adminPhoto: dataUrl, adminName });
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
                     value={localSettings.companyName}
                     onChange={e => setLocalSettings({ ...localSettings, companyName: e.target.value })}
                     placeholder="Ex: Negócios de Limpeza"
                   />
                   <Input
                     label="E-mail de Suporte"
                     value={localSettings.supportEmail}
                     onChange={e => setLocalSettings({ ...localSettings, supportEmail: e.target.value })}
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

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-bold mb-1">Como funcionam as notificações</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li><strong>WhatsApp:</strong> Quando um lead chega pela Nina, você recebe mensagem no número configurado em Geral → Telefone de Contato.</li>
                  <li><strong>Browser:</strong> Notificações aparecem no sino (🔔) quando há novos leads ou atualizações.</li>
                  <li><strong>E-mail:</strong> Em breve — requer integração com serviço de e-mail (Resend).</li>
                </ul>
              </div>

              <div className="bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl divide-y divide-gray-100 dark:divide-darkBorder">
                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText dark:text-darkTextPrimary">Notificações no Browser</p>
                       <p className="text-sm text-lightText dark:text-darkTextSecondary">Alertas no sino quando chegam novos leads (já ativo).</p>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">✓ Ativo</span>
                 </div>

                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText dark:text-darkTextPrimary">WhatsApp (para o admin)</p>
                       <p className="text-sm text-lightText dark:text-darkTextSecondary">Mensagem no seu WhatsApp quando chega novo orçamento pela Nina.</p>
                       <p className="text-xs text-primary mt-1">Número configurado em: Geral → Telefone de Contato</p>
                    </div>
                    <button onClick={() => setNotifications(n => ({ ...n, whatsapp: !n.whatsapp }))}
                      className={`transition-colors ${notifications.whatsapp ? 'text-primary' : 'text-gray-300'}`}>
                       {notifications.whatsapp ? <ToggleRight size={40} fill="currentColor" className="text-primary/20" /> : <ToggleLeft size={40} />}
                    </button>
                 </div>

                 <div className="p-4 flex items-center justify-between opacity-60">
                    <div>
                       <p className="font-bold text-darkText dark:text-darkTextPrimary">E-mail <span className="text-xs font-normal text-gray-400 ml-1">Em breve</span></p>
                       <p className="text-sm text-lightText dark:text-darkTextSecondary">Receber novos orçamentos por e-mail. Requer integração Resend.</p>
                    </div>
                    <button disabled className="text-gray-200 cursor-not-allowed">
                       <ToggleLeft size={40} />
                    </button>
                 </div>
              </div>

              <div className="flex justify-end pt-2">
                 <Button onClick={handleSaveNotifications} icon={<Save size={18}/>}>
                   {notifSaved ? '✓ Salvo!' : 'Salvar Preferências'}
                 </Button>
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
      case 'integracoes':
        return (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary">Integrações</h3>
              <p className="text-sm text-lightText dark:text-darkTextSecondary mt-1">Conecte serviços externos para automatizar cobranças, mensagens e agendamentos.</p>
            </div>

            {integLoading && (
              <div className="flex items-center gap-2 text-lightText text-sm py-2">
                <Loader size={16} className="animate-spin" /> Carregando configurações...
              </div>
            )}

            {/* WhatsApp Business */}
            <div className="bg-gray-50 dark:bg-darkBg rounded-2xl border border-gray-200 dark:border-darkBorder p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={22} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-darkText dark:text-darkTextPrimary text-base">WhatsApp Business API</h4>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">Mensagens automáticas via Meta Cloud API (oficial)</p>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${waToken && waPhoneId ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {waToken && waPhoneId ? '● Configurado' : '● Não configurado'}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-darkTextSecondary mb-1.5 uppercase tracking-wide">Access Token</label>
                  <input
                    type="password"
                    value={waToken}
                    onChange={e => setWaToken(e.target.value)}
                    placeholder="EAAxxxxxxxxx..."
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary focus:border-primary outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-darkTextSecondary mb-1.5 uppercase tracking-wide">Phone Number ID</label>
                  <input
                    type="password"
                    value={waPhoneId}
                    onChange={e => setWaPhoneId(e.target.value)}
                    placeholder="1234567890"
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary focus:border-primary outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-lightText dark:text-darkTextSecondary">
                  Obtenha em <span className="font-medium text-darkText dark:text-darkTextPrimary">Meta Business Manager → WhatsApp → Configurações de API</span>
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveWhatsApp} icon={waSaved ? <CheckCircle size={16}/> : <Save size={16}/>}>
                  {waSaved ? 'Salvo!' : 'Salvar'}
                </Button>
              </div>
            </div>

            {/* Google Calendar */}
            <div className="bg-gray-50 dark:bg-darkBg rounded-2xl border border-gray-200 dark:border-darkBorder p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Calendar size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-darkText dark:text-darkTextPrimary text-base">Google Calendar</h4>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">Sincronize OS confirmadas com sua agenda do Google</p>
                  </div>
                </div>
                <span className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  Em breve
                </span>
              </div>
              <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4">
                Autenticação via OAuth 2.0 — toda OS criada ou alterada aparece automaticamente na sua agenda.
              </p>
              <button
                onClick={() => alert('Integração com Google Calendar em desenvolvimento!\n\nEm breve você poderá conectar via OAuth e sincronizar todos os agendamentos automaticamente.')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder text-sm font-bold text-darkText dark:text-darkTextPrimary hover:border-blue-400 hover:text-blue-600 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Conectar com Google
              </button>
            </div>

            {/* InfinityPay */}
            <div className="bg-gray-50 dark:bg-darkBg rounded-2xl border border-gray-200 dark:border-darkBorder p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={22} className="text-violet-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-darkText dark:text-darkTextPrimary text-base">InfinityPay</h4>
                    <p className="text-xs text-lightText dark:text-darkTextSecondary">Cobranças PIX e cartão diretamente da plataforma</p>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${ipKey ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {ipKey ? '● Configurado' : '● Não configurado'}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-darkTextSecondary mb-1.5 uppercase tracking-wide">API Key</label>
                  <input
                    type="password"
                    value={ipKey}
                    onChange={e => setIpKey(e.target.value)}
                    placeholder="ip_live_xxxxxxxxx"
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-darkBorder bg-white dark:bg-darkSurface text-sm text-darkText dark:text-darkTextPrimary focus:border-primary outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-lightText dark:text-darkTextSecondary">
                  Obtenha em <span className="font-medium text-darkText dark:text-darkTextPrimary">Conta InfinityPay → Configurações → API</span>
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveInfinityPay} icon={ipSaved ? <CheckCircle size={16}/> : <Save size={16}/>}>
                  {ipSaved ? 'Salvo!' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        );
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
               <button
                  onClick={() => setActiveTab('integracoes')}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'integracoes' ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200' : 'text-lightText hover:bg-white hover:text-darkText'}`}
               >
                  <Plug size={18} /> Integrações
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