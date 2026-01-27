import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Settings, Shield, Bell, CreditCard, Building, Save, ToggleLeft, ToggleRight, DollarSign, Lock, Smartphone, List, Users, UserPlus, X, CheckSquare, Square, Trash2 } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const AdminSettings: React.FC = () => {
  const { platformSettings, updatePlatformSettings } = useData(); // Use Global Settings
  const [activeTab, setActiveTab] = useState('general');
  const [notifications, setNotifications] = useState({ email: true, sms: false, whatsapp: true });
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Local state for settings form
  const [localSettings, setLocalSettings] = useState({ ...platformSettings });

  useEffect(() => {
      setLocalSettings(platformSettings);
  }, [platformSettings]);

  // Estado para Edição/Criação de Usuário
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'Suporte', permissions: [] as string[], password: '', confirmPassword: '' });

  // Mock Users Data
  const [users, setUsers] = useState([
     { id: 1, name: 'Ricardo Silva', email: 'ricardo@admin.com', role: 'Super Admin', status: 'Ativo', permissions: ['all'] },
     { id: 2, name: 'Juliana Costa', email: 'juliana@suporte.com', role: 'Suporte', status: 'Ativo', permissions: ['clients', 'requests'] },
     { id: 3, name: 'Marcos Oliveira', email: 'marcos@financeiro.com', role: 'Financeiro', status: 'Ativo', permissions: ['payments'] },
  ]);

  const togglePermission = (perm: string) => {
     if (userFormData.permissions.includes(perm)) {
        setUserFormData({ ...userFormData, permissions: userFormData.permissions.filter(p => p !== perm) });
     } else {
        setUserFormData({ ...userFormData, permissions: [...userFormData.permissions, perm] });
     }
  };

  const handleOpenNewUser = () => {
     setEditingUser(null);
     setUserFormData({ name: '', email: '', role: 'Suporte', permissions: ['dashboard'], password: '', confirmPassword: '' });
     setShowUserModal(true);
  };

  const handleOpenEditUser = (user: any) => {
     setEditingUser(user);
     setUserFormData({ 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        permissions: user.permissions,
        password: '', 
        confirmPassword: '' 
     });
     setShowUserModal(true);
  };

  const handleSaveUser = () => {
     if (editingUser) {
        // Mock Update
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userFormData, permissions: userFormData.permissions } : u));
     } else {
        // Mock Create
        setUsers([...users, { id: users.length + 1, status: 'Ativo', ...userFormData }]);
     }
     setShowUserModal(false);
  };

  const handleDeleteUser = () => {
     if (editingUser) {
        setUsers(users.filter(u => u.id !== editingUser.id));
        setShowUserModal(false);
     }
  };

  const handleSavePlatformSettings = () => {
      updatePlatformSettings(localSettings);
      alert("Configurações financeiras atualizadas com sucesso!");
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
             <div>
                <h3 className="text-xl font-bold text-darkText mb-4">Informações da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Input label="Nome da Plataforma" defaultValue="Negócios de Limpeza" />
                   <Input label="E-mail de Suporte" defaultValue="suporte@negociosdelimpeza.com.br" />
                   <Input label="Telefone de Contato" defaultValue="(11) 99999-0000" />
                   <Input label="CNPJ" defaultValue="00.000.000/0001-99" />
                </div>
             </div>
             <div>
                <h3 className="text-xl font-bold text-darkText mb-4">Endereço Comercial</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <Input label="CEP" defaultValue="01311-200" containerClassName="md:col-span-1" />
                   <Input label="Endereço" defaultValue="Av. Paulista, 1000" containerClassName="md:col-span-2" />
                </div>
             </div>
             <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button icon={<Save size={18}/>}>Salvar Alterações</Button>
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
              
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText">E-mail</p>
                       <p className="text-sm text-lightText">Receber novos pedidos e alertas por e-mail.</p>
                    </div>
                    <button onClick={() => setNotifications({...notifications, email: !notifications.email})} className={`transition-colors ${notifications.email ? 'text-primary' : 'text-gray-300'}`}>
                       {notifications.email ? <ToggleRight size={40} fill="currentColor" className="text-primary/20" /> : <ToggleLeft size={40} />}
                    </button>
                 </div>
                 
                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText">WhatsApp (Bot)</p>
                       <p className="text-sm text-lightText">Alertas urgentes via WhatsApp Business API.</p>
                    </div>
                    <button onClick={() => setNotifications({...notifications, whatsapp: !notifications.whatsapp})} className={`transition-colors ${notifications.whatsapp ? 'text-primary' : 'text-gray-300'}`}>
                       {notifications.whatsapp ? <ToggleRight size={40} fill="currentColor" className="text-primary/20" /> : <ToggleLeft size={40} />}
                    </button>
                 </div>

                 <div className="p-4 flex items-center justify-between">
                    <div>
                       <p className="font-bold text-darkText">SMS</p>
                       <p className="text-sm text-lightText">Backup para quando não houver internet.</p>
                    </div>
                    <button onClick={() => setNotifications({...notifications, sms: !notifications.sms})} className={`transition-colors ${notifications.sms ? 'text-primary' : 'text-gray-300'}`}>
                       {notifications.sms ? <ToggleRight size={40} fill="currentColor" className="text-primary/20" /> : <ToggleLeft size={40} />}
                    </button>
                 </div>
              </div>
           </div>
        );
      case 'users':
         return (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-darkText flex items-center gap-2"><Users size={20}/> Gestão de Usuários</h3>
                  <Button size="sm" icon={<UserPlus size={16}/>} onClick={handleOpenNewUser}>Novo Usuário</Button>
               </div>

               <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-gray-50 text-xs font-bold text-lightText uppercase tracking-wider">
                        <tr>
                           <th className="p-4">Nome</th>
                           <th className="p-4">Função</th>
                           <th className="p-4">Permissões</th>
                           <th className="p-4 text-right">Ações</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {users.map(u => (
                           <tr key={u.id} className="hover:bg-gray-50/50">
                              <td className="p-4">
                                 <p className="font-bold text-darkText text-sm">{u.name}</p>
                                 <p className="text-xs text-lightText">{u.email}</p>
                              </td>
                              <td className="p-4">
                                 <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">{u.role}</span>
                              </td>
                              <td className="p-4 text-sm text-lightText">
                                 {u.permissions.includes('all') ? 'Acesso Total' : u.permissions.length + ' módulos'}
                              </td>
                              <td className="p-4 text-right">
                                 <button 
                                    onClick={() => handleOpenEditUser(u)}
                                    className="text-primary text-sm font-bold hover:underline"
                                 >
                                    Editar
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {/* Access Logs Summary */}
               <div className="mt-8">
                  <h4 className="text-sm font-bold text-darkText mb-3 flex items-center gap-2"><List size={16}/> Logs de Acesso Recente</h4>
                  <div className="bg-gray-50 rounded-xl p-4 text-xs text-lightText space-y-2 border border-gray-200">
                     <div className="flex justify-between">
                        <span>Ricardo Silva (Super Admin)</span>
                        <span>Hoje, 09:12 - Login via Web</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Juliana Costa (Suporte)</span>
                        <span>Hoje, 08:30 - Alteração em Cliente #442</span>
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

         {/* Modal: Novo/Editar Usuário */}
         {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl">
                     <h2 className="text-xl font-bold text-darkText">{editingUser ? 'Editar Usuário' : 'Criar Usuário Administrativo'}</h2>
                     <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-lightText hover:text-darkText transition-colors">
                        <X size={20} />
                     </button>
                  </div>
                  <div className="p-6 space-y-4 bg-white">
                     <Input 
                        label="Nome Completo" 
                        placeholder="Ex: João da Silva" 
                        value={userFormData.name} 
                        onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} 
                     />
                     <Input 
                        label="E-mail Corporativo" 
                        placeholder="joao@empresa.com" 
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                     />
                     <div className="grid grid-cols-2 gap-4">
                        <Input 
                           label="Senha" 
                           type="password" 
                           placeholder={editingUser ? "(Não alterar)" : "••••••••"} 
                           value={userFormData.password}
                           onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                        />
                        <Input 
                           label="Confirmar Senha" 
                           type="password" 
                           placeholder={editingUser ? "(Não alterar)" : "••••••••"}
                           value={userFormData.confirmPassword}
                           onChange={(e) => setUserFormData({...userFormData, confirmPassword: e.target.value})}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-darkText mb-2">Função / Cargo</label>
                        <select 
                           className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary text-darkText"
                           value={userFormData.role}
                           onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                        >
                           <option value="Suporte">Suporte</option>
                           <option value="Financeiro">Financeiro</option>
                           <option value="Super Admin">Super Admin</option>
                           <option value="Gerente">Gerente Operacional</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-darkText mb-2">Permissões de Acesso</label>
                        <div className="grid grid-cols-2 gap-3">
                           {['Financeiro', 'Clientes', 'Colaboradores', 'Configurações', 'Relatórios', 'Suporte'].map(perm => (
                              <label key={perm} className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 select-none">
                                 <input 
                                    type="checkbox" 
                                    checked={userFormData.permissions.includes(perm.toLowerCase()) || userFormData.permissions.includes('all')}
                                    onChange={() => togglePermission(perm.toLowerCase())}
                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" 
                                 />
                                 <span className="text-sm font-medium text-darkText">{perm}</span>
                              </label>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-3xl">
                     {editingUser && (
                        <button 
                           onClick={handleDeleteUser} 
                           className="mr-auto px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                        >
                           <Trash2 size={18} /> Excluir Acesso
                        </button>
                     )}
                     <button onClick={() => setShowUserModal(false)} className="px-6 py-3 font-bold text-lightText hover:text-darkText hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                     <Button onClick={handleSaveUser}>{editingUser ? 'Salvar Alterações' : 'Criar Usuário'}</Button>
                  </div>
               </div>
            </div>
         )}
      </div>
    </Layout>
  );
};