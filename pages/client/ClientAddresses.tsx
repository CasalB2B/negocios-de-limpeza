import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole, Address } from '../../types';
import { Button } from '../../components/Button';
import { MapPin, Plus, Home, Building, PenSquare, Trash2, Search, Dog, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../components/DataContext';

export const ClientAddresses: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addClientAddress, updateClientAddress, deleteClientAddress } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Address>>({
    alias: '',
    type: 'HOUSE',
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    reference: '',
    notes: '',
    pets: false,
    intercom: '',
    keyLocation: '',
    isMain: false
  });

  const addresses = currentUser?.addresses || [];

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setFormData({ ...addr });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      alias: '', type: 'HOUSE', cep: '', street: '', number: '', complement: '', district: '', city: '', state: '', reference: '', notes: '', pets: false, intercom: '', keyLocation: '', isMain: false
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!currentUser) return;
    if (!formData.street || !formData.number) {
      alert("Preencha ao menos Rua e Número.");
      return;
    }

    const addressData = formData as Address;

    if (editingId) {
      updateClientAddress(currentUser.id, addressData);
    } else {
      addClientAddress(currentUser.id, addressData);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string | number) => {
    if (!currentUser) return;
    if (window.confirm("Tem certeza que deseja excluir este endereço?")) {
      deleteClientAddress(currentUser.id, id);
    }
  };

  if (showForm) {
    return (
      <Layout role={UserRole.CLIENT}>
        <div className="max-w-4xl mx-auto pb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-primary/20 flex items-center justify-center text-primary">
              <MapPin size={20} />
            </div>
            <h1 className="text-2xl font-bold text-darkText dark:text-darkTextPrimary">{editingId ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}</h1>
          </div>

          <div className="bg-white dark:bg-darkSurface rounded-2xl p-8 border border-gray-100 dark:border-darkBorder shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Apelido do Endereço (ex: Casa, Trabalho)</label>
                <input
                  type="text"
                  placeholder="Ex: Casa da Praia"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Tipo de Residência</label>
                <select
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="HOUSE">Casa</option>
                  <option value="APARTMENT">Apartamento</option>
                  <option value="COMMERCIAL">Comercial</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="00000-000"
                    className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Rua / Logradouro</label>
                <input
                  type="text"
                  placeholder="Digite o nome da rua"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Número</label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Complemento</label>
                <input
                  type="text"
                  placeholder="Apto, Bloco, etc (Opcional)"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">UF</label>
                <input
                  type="text"
                  placeholder="SP"
                  className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Ponto de Referência</label>
              <input
                type="text"
                placeholder="Ex: Próximo à farmácia Central"
                className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Notas de Acesso (Instruções para o profissional)</label>
              <textarea
                placeholder="Ex: Chamar no interfone 402, falar com Maria."
                className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors h-24 text-darkText dark:text-darkTextPrimary"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="bg-gray-50 dark:bg-darkBg p-6 rounded-xl border border-dashed border-gray-200 dark:border-darkBorder flex items-center justify-between mb-8">
              <div>
                <h4 className="font-bold text-darkText dark:text-darkTextPrimary">Há animais de estimação no local?</h4>
                <p className="text-xs text-lightText dark:text-darkTextSecondary">Isso ajuda a selecionar os melhores profissionais e produtos.</p>
              </div>
              <div className="flex bg-white dark:bg-darkSurface rounded-lg p-1 border border-gray-200 dark:border-darkBorder">
                <button
                  onClick={() => setFormData({ ...formData, pets: true })}
                  className={`px-4 py-2 rounded-md font-bold text-sm shadow-sm transition-colors ${formData.pets ? 'bg-primary text-white' : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50'}`}
                >
                  Sim
                </button>
                <button
                  onClick={() => setFormData({ ...formData, pets: false })}
                  className={`px-4 py-2 rounded-md font-bold text-sm shadow-sm transition-colors ${!formData.pets ? 'bg-gray-200 dark:bg-gray-700 text-darkText dark:text-white' : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50'}`}
                >
                  Não
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${formData.isMain ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
                  onClick={() => setFormData({ ...formData, isMain: !formData.isMain })}
                >
                  {formData.isMain && <div className="w-3 h-3 bg-white rounded-sm"></div>}
                </div>
                <span className="text-sm font-bold text-darkText dark:text-darkTextPrimary">Definir como endereço principal</span>
              </label>
            </div>

            <div className="flex justify-end gap-4 border-t border-gray-100 dark:border-darkBorder pt-6">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Salvar'} Endereço</Button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-5xl mx-auto pb-20">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-darkText dark:text-darkTextPrimary mb-2">Meus Endereços</h1>
            <p className="text-lightText dark:text-darkTextSecondary">Gerencie seus locais de atendimento para serviços de limpeza rápida e profissional.</p>
          </div>
          <Button onClick={handleCreate} icon={<Plus size={20} />}>
            Adicionar endereço
          </Button>
        </header>

        {/* Mensagem de Atualização / Alerta de Endereço Incompleto */}
        {addresses.some(a => a.isMain && (!a.cep || !a.district)) && (
          <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl flex items-center gap-4 text-orange-700 dark:text-orange-400 animate-pulse">
            <AlertCircle className="shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">Endereço com informações pendentes!</p>
              <p className="text-xs opacity-80">Para que os profissionais cheguem com mais facilidade, clique em editar e preencha o CEP e Bairro.</p>
            </div>
            <button
              onClick={() => handleEdit(addresses.find(a => a.isMain)!)}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
            >
              Completar Agora
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white dark:bg-darkSurface rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm overflow-hidden group hover:shadow-lg transition-all">
              {/* Map Header */}
              <div className="h-40 bg-gray-200 dark:bg-darkBorder relative overflow-hidden">
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="Mapa" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(addr)}
                    className="w-8 h-8 bg-white dark:bg-darkSurface rounded-lg flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors shadow-sm"
                  >
                    <PenSquare size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="w-8 h-8 bg-white dark:bg-darkSurface rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {addr.isMain && (
                  <div className="absolute bottom-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Principal
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl text-darkText dark:text-darkTextPrimary">{addr.alias}</h3>
                  {addr.type === 'HOUSE' ? <Home className="text-lightText dark:text-darkTextSecondary" size={20} /> : <Building className="text-lightText dark:text-darkTextSecondary" size={20} />}
                </div>

                <p className="font-bold text-darkText dark:text-darkTextPrimary text-sm mb-1">{addr.street}, {addr.number}</p>
                <p className="text-lightText dark:text-darkTextSecondary text-sm mb-6">{addr.district} - {addr.city} / {addr.state}</p>

                <div className="flex gap-2 flex-wrap">
                  {addr.pets && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 dark:bg-primary/20 text-primary rounded-lg text-xs font-bold">
                      <Dog size={12} /> Possui Pets
                    </span>
                  )}
                  {addr.intercom && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-darkBg text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold">
                      Interfone {addr.intercom}
                    </span>
                  )}
                  {addr.keyLocation && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-darkBg text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold">
                      Chave na {addr.keyLocation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {addresses.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-darkBorder rounded-2xl">
              <p className="text-lightText dark:text-darkTextSecondary font-bold">Você ainda não tem endereços cadastrados.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};