import React, { useState, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal'; 
import { Plus, Edit, Trash2, X, Sparkles, Shirt, HardHat, Save, Upload, Clock } from 'lucide-react';
import { useData, ServiceDefinition, ServiceExtra, PricingTier } from '../../components/DataContext';

export const AdminServices: React.FC = () => {
  const { serviceDefinitions, addServiceDefinition, updateServiceDefinition, deleteServiceDefinition } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDefinition | null>(null);
  
  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ServiceDefinition>>({
    name: '',
    description: '',
    icon: 'sparkles',
    imageUrl: '',
    pricingModel: 'ROOMS',
    basePrice: 0,
    pricePerUnit: 0,
    pricePerBath: 0,
    extras: [],
    pricingTiers: [],
    active: true
  });

  const [newExtra, setNewExtra] = useState({ label: '', price: '' });
  const [newTier, setNewTier] = useState({ name: '', value: '', price: '' });

  const getIcon = (service: ServiceDefinition) => {
    if (service.imageUrl) {
        return <img src={service.imageUrl} alt={service.name} className="w-12 h-12 rounded-xl object-cover" />;
    }
    
    let iconEl;
    switch(service.icon) {
      case 'sparkles': iconEl = <Sparkles size={24} />; break;
      case 'shirt': iconEl = <Shirt size={24} />; break;
      case 'hardhat': iconEl = <HardHat size={24} />; break;
      default: iconEl = <Sparkles size={24} />;
    }
    
    return (
        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-primary/20 text-primary flex items-center justify-center">
            {iconEl}
        </div>
    );
  };

  const handleOpenModal = (service?: ServiceDefinition) => {
    if (service) {
      setEditingService(service);
      setFormData({ ...service });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        icon: 'sparkles',
        imageUrl: '',
        pricingModel: 'ROOMS',
        basePrice: 0,
        pricePerUnit: 0,
        pricePerBath: 0,
        extras: [],
        pricingTiers: [],
        active: true
      });
    }
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const url = URL.createObjectURL(e.target.files[0]);
          setFormData(prev => ({ ...prev, imageUrl: url }));
      }
  };

  const handleAddExtra = () => {
    if (newExtra.label && newExtra.price) {
      const extra: ServiceExtra = {
        id: `ext_${Date.now()}`,
        label: newExtra.label,
        price: parseFloat(newExtra.price)
      };
      setFormData(prev => ({ ...prev, extras: [...(prev.extras || []), extra] }));
      setNewExtra({ label: '', price: '' });
    }
  };

  const handleRemoveExtra = (id: string) => {
    setFormData(prev => ({ ...prev, extras: prev.extras?.filter(e => e.id !== id) }));
  };

  const handleAddTier = () => {
      if (newTier.name && newTier.value && newTier.price) {
          const tier: PricingTier = {
              id: `tier_${Date.now()}`,
              name: newTier.name,
              value: parseFloat(newTier.value),
              price: parseFloat(newTier.price)
          };
          setFormData(prev => ({ ...prev, pricingTiers: [...(prev.pricingTiers || []), tier] }));
          setNewTier({ name: '', value: '', price: '' });
      }
  };

  const handleRemoveTier = (id: string) => {
      setFormData(prev => ({ ...prev, pricingTiers: prev.pricingTiers?.filter(t => t.id !== id) }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.pricingModel) return;

    // Garante que a ID é gerada aqui para consistência no estado local
    const finalService: ServiceDefinition = {
      id: editingService ? editingService.id : `srv_${Date.now()}`,
      name: formData.name!,
      description: formData.description || '',
      icon: formData.icon || 'sparkles',
      imageUrl: formData.imageUrl || '',
      pricingModel: formData.pricingModel || 'ROOMS',
      basePrice: Number(formData.basePrice) || 0,
      pricePerUnit: Number(formData.pricePerUnit) || 0,
      pricePerBath: Number(formData.pricePerBath) || 0,
      extras: formData.extras || [],
      pricingTiers: formData.pricingTiers || [],
      active: formData.active ?? true
    };

    if (editingService) {
      updateServiceDefinition(finalService);
    } else {
      addServiceDefinition(finalService);
    }
    setShowModal(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("ATENÇÃO: Tem certeza que deseja excluir este serviço?")) {
      deleteServiceDefinition(id);
    }
  };

  return (
    <Layout role={UserRole.ADMIN}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
           <div>
              <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Gestão de Serviços</h1>
              <p className="text-lightText dark:text-darkTextSecondary mt-1">Configure os tipos de limpeza, preços e regras de cálculo.</p>
           </div>
           <Button icon={<Plus size={18} />} onClick={() => handleOpenModal()}>Novo Serviço</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {serviceDefinitions.map(service => (
              <div key={service.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder p-6 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between">
                 <div>
                    <div className="flex justify-between items-start mb-4">
                        {getIcon(service)}
                        <Badge variant={service.active ? 'success' : 'neutral'}>{service.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    
                    <h3 className="text-xl font-bold text-darkText dark:text-darkTextPrimary mb-2">{service.name}</h3>
                    <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4 h-10 overflow-hidden text-ellipsis line-clamp-2">{service.description}</p>
                    
                    <div className="bg-gray-50 dark:bg-darkBg rounded-xl p-3 mb-4 space-y-2 text-sm border border-gray-100 dark:border-darkBorder">
                        <div className="flex justify-between">
                            <span className="text-lightText dark:text-darkTextSecondary">Modelo</span>
                            <span className="font-bold text-darkText dark:text-darkTextPrimary">{service.pricingModel === 'ROOMS' ? 'Por Cômodo' : service.pricingModel === 'HOURLY' ? 'Por Hora' : 'Por m²'}</span>
                        </div>
                        {service.pricingTiers && service.pricingTiers.length > 0 ? (
                            <div className="flex justify-between">
                                <span className="text-lightText dark:text-darkTextSecondary">Pacotes</span>
                                <span className="font-bold text-darkText dark:text-darkTextPrimary">{service.pricingTiers.length} opções</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                <span className="text-lightText dark:text-darkTextSecondary">Base</span>
                                <span className="font-bold text-darkText dark:text-darkTextPrimary">R$ {service.basePrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                <span className="text-lightText dark:text-darkTextSecondary">Variável</span>
                                <span className="font-bold text-darkText dark:text-darkTextPrimary">R$ {service.pricePerUnit.toFixed(2)} / un</span>
                                </div>
                            </>
                        )}
                    </div>
                 </div>

                 <div className="flex gap-2 mt-2">
                    <button 
                        onClick={() => handleOpenModal(service)} 
                        className="flex-1 py-2 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-lg text-sm font-bold text-darkText dark:text-darkTextPrimary hover:bg-gray-50 dark:hover:bg-darkBg transition-colors flex items-center justify-center gap-2"
                    >
                       <Edit size={16} /> Editar
                    </button>
                    <button 
                        onClick={(e) => handleDelete(e, service.id)} 
                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/30"
                        title="Excluir Serviço"
                    >
                       <Trash2 size={16} />
                    </button>
                 </div>
              </div>
           ))}
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingService ? 'Editar Serviço' : 'Criar Novo Serviço'}
          maxWidth="2xl"
          footer={
            <>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-lightText dark:text-darkTextSecondary hover:text-darkText dark:hover:text-darkTextPrimary hover:bg-gray-100 dark:hover:bg-darkBorder rounded-xl transition-colors">Cancelar</button>
              <Button onClick={handleSave} icon={<Save size={18}/>}>Salvar Serviço</Button>
            </>
          }
        >
            <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Nome do Serviço" 
                        placeholder="Ex: Limpeza Padrão" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    <div>
                        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Ícone ou Foto</label>
                        <div className="flex gap-2">
                            <select 
                                className="flex-1 p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none focus:border-primary text-darkText dark:text-darkTextPrimary"
                                value={formData.icon}
                                onChange={e => setFormData({...formData, icon: e.target.value})}
                            >
                                <option value="sparkles">✨ Brilho (Padrão)</option>
                                <option value="shirt">👕 Camisa (Passadoria)</option>
                                <option value="hardhat">👷 Capacete (Pós-Obra)</option>
                            </select>
                            
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-12 h-12 flex items-center justify-center border border-gray-200 dark:border-darkBorder rounded-xl hover:bg-gray-50 dark:hover:bg-darkBg transition-colors"
                                title="Enviar Foto"
                            >
                                {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full rounded-xl object-cover"/> : <Upload size={18} className="text-lightText"/>}
                            </button>
                        </div>
                    </div>
                </div>

                <Input 
                    label="Descrição Curta" 
                    placeholder="Ex: Limpeza de manutenção para o dia a dia."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />

                {/* Status Toggle */}
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-primary" 
                            checked={formData.active} 
                            onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        />
                        <span className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Serviço Ativo (Visível para Clientes)</span>
                    </label>
                </div>

                {/* Pricing Model */}
                <div className="bg-gray-50 dark:bg-darkBg p-6 rounded-xl border border-gray-200 dark:border-darkBorder">
                    <h3 className="text-sm font-bold text-darkText dark:text-darkTextPrimary mb-4 uppercase tracking-wider">Regras de Preço</h3>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Modelo de Cobrança</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['ROOMS', 'HOURLY', 'SQM'].map(model => (
                            <button 
                                key={model}
                                onClick={() => setFormData({...formData, pricingModel: model as any})}
                                className={`p-3 rounded-lg text-xs font-bold border transition-colors ${formData.pricingModel === model ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-darkSurface border-gray-200 dark:border-darkBorder text-lightText hover:border-primary'}`}
                            >
                                {model === 'ROOMS' ? 'Por Cômodos' : model === 'HOURLY' ? 'Por Hora' : 'Por m²'}
                            </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Input 
                            label="Preço Base (Fixo)" 
                            type="number"
                            value={formData.basePrice}
                            onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})}
                        />
                        <Input 
                            label={formData.pricingModel === 'ROOMS' ? 'Preço por Quarto' : formData.pricingModel === 'HOURLY' ? 'Preço por Hora (Avulso)' : 'Preço por m²'}
                            type="number"
                            value={formData.pricePerUnit}
                            onChange={e => setFormData({...formData, pricePerUnit: parseFloat(e.target.value)})}
                        />
                        {formData.pricingModel === 'ROOMS' && (
                            <Input 
                            label="Preço por Banheiro" 
                            type="number"
                            value={formData.pricePerBath}
                            onChange={e => setFormData({...formData, pricePerBath: parseFloat(e.target.value)})}
                            />
                        )}
                    </div>
                </div>

                {/* Pacotes de Horas (Tiers) - Exclusivo para HOURLY */}
                {formData.pricingModel === 'HOURLY' && (
                    <div className="bg-purple-50 dark:bg-primary/10 p-6 rounded-xl border border-purple-100 dark:border-primary/20">
                        <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2"><Clock size={16}/> Pacotes Fechados (Ex: Passadoria)</h3>
                        
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                placeholder="Nome do Pacote (ex: 4 Horas)" 
                                className="flex-1 p-3 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl outline-none text-sm"
                                value={newTier.name}
                                onChange={e => setNewTier({...newTier, name: e.target.value})}
                            />
                            <input 
                                type="number" 
                                placeholder="Qtd. Horas" 
                                className="w-24 p-3 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl outline-none text-sm"
                                value={newTier.value}
                                onChange={e => setNewTier({...newTier, value: e.target.value})}
                            />
                            <input 
                                type="number" 
                                placeholder="Preço (R$)" 
                                className="w-24 p-3 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-xl outline-none text-sm"
                                value={newTier.price}
                                onChange={e => setNewTier({...newTier, price: e.target.value})}
                            />
                            <button onClick={handleAddTier} className="p-3 bg-primary text-white rounded-xl hover:bg-primaryHover"><Plus size={18}/></button>
                        </div>

                        <div className="space-y-2">
                            {formData.pricingTiers?.map(tier => (
                                <div key={tier.id} className="flex justify-between items-center p-3 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-lg">
                                    <span className="text-sm font-medium text-darkText dark:text-darkTextPrimary">{tier.name} ({tier.value}h)</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-primary">R$ {tier.price.toFixed(2)}</span>
                                        <button onClick={() => handleRemoveTier(tier.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {formData.pricingTiers?.length === 0 && <p className="text-xs text-lightText text-center py-2">Nenhum pacote definido.</p>}
                        </div>
                    </div>
                )}

                {/* Extras */}
                <div>
                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Adicionais / Extras</label>
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text" 
                            placeholder="Nome (ex: Limpar Geladeira)" 
                            className="flex-1 p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none text-sm"
                            value={newExtra.label}
                            onChange={e => setNewExtra({...newExtra, label: e.target.value})}
                        />
                        <input 
                            type="number" 
                            placeholder="Preço (R$)" 
                            className="w-24 p-3 bg-gray-50 dark:bg-darkBg border border-gray-200 dark:border-darkBorder rounded-xl outline-none text-sm"
                            value={newExtra.price}
                            onChange={e => setNewExtra({...newExtra, price: e.target.value})}
                        />
                        <button onClick={handleAddExtra} className="p-3 bg-primary text-white rounded-xl hover:bg-primaryHover"><Plus size={18}/></button>
                    </div>
                    
                    <div className="space-y-2">
                        {formData.extras?.map(extra => (
                            <div key={extra.id} className="flex justify-between items-center p-3 bg-white dark:bg-darkSurface border border-gray-200 dark:border-darkBorder rounded-lg">
                            <span className="text-sm font-medium text-darkText dark:text-darkTextPrimary">{extra.label}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-primary">R$ {extra.price.toFixed(2)}</span>
                                <button onClick={() => handleRemoveExtra(extra.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                            </div>
                            </div>
                        ))}
                        {formData.extras?.length === 0 && <p className="text-xs text-lightText text-center py-2">Nenhum extra cadastrado.</p>}
                    </div>
                </div>
            </div>
        </Modal>
      </div>
    </Layout>
  );
};