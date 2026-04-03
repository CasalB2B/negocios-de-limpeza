import React, { useState, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Search, UserPlus, Edit, Trash2, Lock, Camera, Star, DollarSign } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const AdminCollaborators: React.FC = () => {
  const { collaborators, transactions, registerCollaborator, updateCollaborator, deleteCollaborator } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewCollab, setViewCollab] = useState<any | null>(null);
  const [showPayments, setShowPayments] = useState<any | null>(null);
  const [filterText, setFilterText] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // Add/Edit State
  const generatePassword = () => Math.random().toString(36).slice(2, 8).toUpperCase() + Math.floor(10 + Math.random() * 90);

  const [collabData, setCollabData] = useState({
      name: '',
      email: '',
      phone: '',
      password: generatePassword(),
      photo: '',
      level: 'JUNIOR' as 'JUNIOR' | 'SENIOR' | 'MASTER'
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="success">Disponível</Badge>;
      case 'ON_SERVICE': return <Badge variant="default">Em Serviço</Badge>;
      case 'OFFLINE': return <Badge variant="neutral">Offline</Badge>;
      case 'BUSY': return <Badge variant="warning">Ocupado</Badge>;
      case 'PENDING': return <Badge variant="warning">Pendente</Badge>;
      default: return null;
    }
  };

  const getLevelBadge = (level: string) => {
      switch (level) {
          case 'JUNIOR': return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Star size={10} /> Junior</span>;
          case 'SENIOR': return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Star size={10} fill="currentColor" /> Senior</span>;
          case 'MASTER': return <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Star size={10} fill="currentColor" /> Mestre</span>;
          default: return null;
      }
  };

  const handleDelete = (e: React.MouseEvent | null, id: string) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (window.confirm("Tem certeza que deseja excluir esta colaboradora? O acesso dela será revogado imediatamente.")) {
        deleteCollaborator(id);
        setViewCollab(null);
    }
  };

  const handlePhotoSelect = (file: File, isEdit: boolean) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (isEdit) setViewCollab((prev: any) => ({ ...prev, photo: dataUrl }));
      else setCollabData(prev => ({ ...prev, photo: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = () => {
     if (collabData.name && collabData.email && collabData.password) {
        registerCollaborator({
            id: `collab_${Date.now()}`,
            name: collabData.name,
            email: collabData.email,
            phone: collabData.phone,
            password: collabData.password,
            photo: collabData.photo || undefined,
            status: 'AVAILABLE',
            level: collabData.level
        });
        setShowAddModal(false);
        setCollabData({ name: '', email: '', phone: '', password: generatePassword(), photo: '', level: 'JUNIOR' });
     } else {
         alert("Nome, Email e Senha são obrigatórios.");
     }
  };

  const handleUpdate = () => {
      if (viewCollab) {
          updateCollaborator(viewCollab.id, {
              name: viewCollab.name,
              email: viewCollab.email,
              phone: viewCollab.phone,
              level: viewCollab.level,
              photo: viewCollab.photo,
          });
          setViewCollab(null);
      }
  };

  const filteredCollaborators = collaborators.filter(c => 
    c.name.toLowerCase().includes(filterText.toLowerCase()) || 
    c.email.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Colaboradoras</h1>
              <p className="text-lightText dark:text-darkTextSecondary mt-1">Gerencie e acompanhe o status da sua equipe em tempo real.</p>
           </div>
           <Button icon={<UserPlus size={18} />} onClick={() => { setShowAddModal(true); setCollabData({ name: '', email: '', phone: '', password: generatePassword(), photo: '', level: 'JUNIOR' }); }}>Adicionar Colaboradora</Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
           <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome, avaliação ou bairro..." 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
           </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-200 dark:border-darkBorder overflow-hidden shadow-sm">
           <table className="w-full text-left">
              <thead className="bg-gray-50/50 dark:bg-darkBg/50 border-b border-gray-100 dark:border-darkBorder">
                 <tr>
                    <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Colaboradora</th>
                    <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Classificação</th>
                    <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Contato</th>
                    <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider">Status Atual</th>
                    <th className="p-5 text-xs font-bold text-lightText dark:text-darkTextSecondary uppercase tracking-wider text-right">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-darkBorder">
                 {filteredCollaborators.map((collab) => (
                    <tr key={collab.id} className="hover:bg-gray-50/50 dark:hover:bg-darkBg/30 transition-colors cursor-pointer" onClick={() => { setViewCollab(collab); }}>
                       <td className="p-5">
                          <div className="flex items-center gap-4">
                             <img src={collab.photo || `https://i.pravatar.cc/150?u=${collab.id}`} alt={collab.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                             <div>
                                <p className="font-bold text-darkText dark:text-darkTextPrimary">{collab.name}</p>
                                <p className="text-xs text-lightText dark:text-darkTextSecondary">ID: {collab.id}</p>
                             </div>
                          </div>
                       </td>
                       <td className="p-5">
                          {getLevelBadge(collab.level || 'JUNIOR')}
                       </td>
                       <td className="p-5">
                          <p className="text-sm text-darkText dark:text-darkTextPrimary">{collab.email}</p>
                          <p className="text-xs text-lightText dark:text-darkTextSecondary">{collab.phone}</p>
                       </td>
                       <td className="p-5">
                          {getStatusBadge(collab.status)}
                       </td>
                       <td className="p-5 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                             <button
                                onClick={() => setShowPayments(collab)}
                                className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-lightText hover:text-green-600 transition-colors"
                                title="Ver pagamentos"
                             >
                                <DollarSign size={18} />
                             </button>
                             <button
                                onClick={() => { setViewCollab(collab); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-darkBorder rounded-lg text-lightText hover:text-primary transition-colors"
                             >
                                <Edit size={18} />
                             </button>
                             <button
                                onClick={(e) => handleDelete(e, collab.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-lightText hover:text-red-500 transition-colors"
                             >
                                <Trash2 size={18} />
                             </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Modal: Ver/Editar Colaboradora */}
        <Modal
            isOpen={!!viewCollab}
            onClose={() => setViewCollab(null)}
            title="Detalhes da Profissional"
            footer={
                <>
                    <button onClick={() => handleDelete(null, viewCollab?.id)} className="mr-auto px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                       <Trash2 size={16} /> Excluir Conta
                    </button>
                    <button onClick={handleUpdate} className="px-6 py-3 font-bold text-white bg-primary hover:bg-primaryHover rounded-xl transition-colors">Salvar Alterações</button>
                </>
            }
        >
            {viewCollab && (
                <div className="space-y-6">
                    {/* Header Profile */}
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                       <div className="relative group cursor-pointer" onClick={() => editPhotoInputRef.current?.click()}>
                          <img src={viewCollab.photo || `https://i.pravatar.cc/150?u=${viewCollab.id}`} alt={viewCollab.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={20} />
                          </div>
                          <input ref={editPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0], true)} />
                       </div>
                       <div className="text-center md:text-left flex-1">
                          <div className="flex flex-col md:flex-row items-center gap-3 mb-1">
                             <h3 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{viewCollab.name}</h3>
                             {getStatusBadge(viewCollab.status)}
                          </div>
                          <p className="text-sm text-lightText dark:text-darkTextSecondary mb-2">Senha: {viewCollab.password}</p>
                          {getLevelBadge(viewCollab.level || 'JUNIOR')}
                       </div>
                    </div>

                    {/* Change Classification */}
                    <div className="bg-gray-50 dark:bg-darkBg p-4 rounded-xl border border-gray-100 dark:border-darkBorder">
                        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Classificação (Nível)</label>
                        <p className="text-xs text-lightText dark:text-darkTextSecondary mb-3">Alterar o nível muda o valor do repasse automaticamente.</p>
                        <div className="grid grid-cols-3 gap-2">
                            {['JUNIOR', 'SENIOR', 'MASTER'].map(lvl => (
                                <button 
                                    key={lvl}
                                    onClick={() => setViewCollab({...viewCollab, level: lvl})}
                                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${viewCollab.level === lvl ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-darkSurface border-gray-200 dark:border-darkBorder text-lightText'}`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <Input label="Telefone" defaultValue={viewCollab.phone} disabled />
                       <Input label="E-mail" defaultValue={viewCollab.email} disabled />
                    </div>
                </div>
            )}
        </Modal>

        {/* Modal: Adicionar Colaboradora */}
        <Modal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title="Nova Colaboradora"
            footer={
                <>
                   <button onClick={() => setShowAddModal(false)} className="px-6 py-3 font-bold text-lightText hover:text-darkText hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                   <Button onClick={handleRegister}>Cadastrar</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Input label="Nome Completo" placeholder="Nome da profissional" value={collabData.name} onChange={e => setCollabData({...collabData, name: e.target.value})}/>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Telefone / WhatsApp" placeholder="(00) 00000-0000" value={collabData.phone} onChange={e => setCollabData({...collabData, phone: e.target.value})}/>
                    <Input label="E-mail" placeholder="email@exemplo.com" value={collabData.email} onChange={e => setCollabData({...collabData, email: e.target.value})}/>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Nível Inicial</label>
                    <select 
                        className="w-full p-3.5 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                        value={collabData.level}
                        onChange={(e) => setCollabData({...collabData, level: e.target.value as any})}
                    >
                        <option value="JUNIOR">Junior (Iniciante)</option>
                        <option value="SENIOR">Senior (Experiente)</option>
                        <option value="MASTER">Mestre (Especialista)</option>
                    </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Senha de Acesso</label>
                  <div className="flex gap-2">
                    <Input containerClassName="flex-1" icon={<Lock size={16}/>} type="text" value={collabData.password} onChange={e => setCollabData({...collabData, password: e.target.value})}/>
                    <button type="button" onClick={() => setCollabData(p => ({...p, password: generatePassword()}))} className="px-3 py-2 bg-gray-100 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl text-xs font-bold text-lightText hover:text-primary transition-colors whitespace-nowrap">🔄 Gerar</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Foto (Opcional)</label>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0], false)} />
                  <div className="flex items-center gap-4">
                    {collabData.photo && <img src={collabData.photo} alt="preview" className="w-14 h-14 rounded-full object-cover border-2 border-primary" />}
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-darkBorder rounded-xl text-sm font-bold text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkBorder transition-colors">
                      <Camera size={16} /> {collabData.photo ? 'Trocar foto' : 'Selecionar foto'}
                    </button>
                  </div>
                </div>
            </div>
        </Modal>
      </div>

      {/* Modal: Pagamentos da Colaboradora */}
      <Modal
        isOpen={!!showPayments}
        onClose={() => setShowPayments(null)}
        title={`Pagamentos — ${showPayments?.name}`}
      >
        {showPayments && (() => {
          const collabTxs = transactions.filter(t => t.entity === showPayments.name);
          const total = collabTxs.filter(t => t.status === 'PAID').reduce((s, t) => s + t.amount, 0);
          const pending = collabTxs.filter(t => t.status === 'PENDING').reduce((s, t) => s + t.amount, 0);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 font-bold mb-1">Total Pago</p>
                  <p className="text-xl font-bold text-green-700">R$ {total.toFixed(2)}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-orange-600 font-bold mb-1">Pendente</p>
                  <p className="text-xl font-bold text-orange-700">R$ {pending.toFixed(2)}</p>
                </div>
              </div>
              {collabTxs.length === 0 ? (
                <p className="text-center text-sm text-lightText dark:text-darkTextSecondary py-6">Nenhum pagamento registrado.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {collabTxs.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-darkBg rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">{t.serviceType}</p>
                        <p className="text-xs text-lightText dark:text-darkTextSecondary">{t.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-darkText dark:text-darkTextPrimary">R$ {t.amount.toFixed(2)}</p>
                        <span className={`text-xs font-bold ${t.status === 'PAID' ? 'text-green-600' : 'text-orange-500'}`}>{t.status === 'PAID' ? 'Pago' : 'Pendente'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </Layout>
  );
};