import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { Camera, User, Mail, Phone, Lock, Save, MapPin, CheckCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../components/DataContext'; // Import useData
import { Modal } from '../../components/Modal';

export const ClientProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateClient, logoutClient } = useData();
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [successMsg, setSuccessMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setPhone(currentUser.phone);
    }
  }, [currentUser]);

  const handleSavePersonal = () => {
    if (currentUser) {
      updateClient(currentUser.id, {
        name,
        email,
        phone
      });
      setSuccessMsg('Dados atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        updateClient(currentUser.id, { photo: base64 } as any);
      } catch (error) {
        console.error("Erro ao converter imagem:", error);
        alert("Erro ao processar imagem.");
      }
    }
  };

  if (!currentUser) return null;

  return (
    <Layout role={UserRole.CLIENT}>
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-darkText dark:text-darkTextPrimary">Meu Perfil</h1>
            <p className="text-lightText dark:text-darkTextSecondary">Gerencie seus dados pessoais e preferências.</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-3 bg-white dark:bg-darkSurface rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-darkBorder transition-colors text-lightText">
            <Settings size={24} />
          </button>
        </header>

        {successMsg && (
          <div className="bg-green-100 text-green-700 p-4 rounded-xl mb-6 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle size={20} />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar Left: Photo & Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-darkSurface p-6 rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm flex flex-col items-center text-center transition-colors">
              <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-darkBg shadow-lg">
                  <img src={(currentUser as any).photo || `https://i.pravatar.cc/150?u=${currentUser.id}`} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>
              <h2 className="font-bold text-xl text-darkText dark:text-darkTextPrimary">{currentUser.name}</h2>
              <p className="text-sm text-lightText dark:text-darkTextSecondary mb-4">Cliente Cadastrado</p>
              <div className="w-full h-px bg-gray-100 dark:bg-darkBorder mb-4" />
              <div className="w-full space-y-2">
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'personal' ? 'bg-primary/10 text-primary' : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50 dark:hover:bg-darkBg'}`}
                >
                  <User size={18} /> Dados Pessoais
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-primary/10 text-primary' : 'text-lightText dark:text-darkTextSecondary hover:bg-gray-50 dark:hover:bg-darkBg'}`}
                >
                  <Lock size={18} /> Senha e Segurança
                </button>
                <button
                  onClick={() => navigate('/client/addresses')}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 text-lightText dark:text-darkTextSecondary hover:bg-gray-50 dark:hover:bg-darkBg transition-colors"
                >
                  <MapPin size={18} /> Meus Endereços
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2">
            {activeTab === 'personal' ? (
              <div className="bg-white dark:bg-darkSurface p-8 rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 transition-colors">
                <h3 className="font-bold text-xl text-darkText dark:text-darkTextPrimary mb-6 flex items-center gap-2">
                  <User className="text-primary" size={24} /> Editar Dados Pessoais
                </h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Nome Completo</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">ID (Sistema)</label>
                      <input type="text" value={currentUser.id} disabled className="w-full p-3 bg-gray-100 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl text-gray-400 cursor-not-allowed" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">E-mail</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 pl-10 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Telefone / WhatsApp</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-3 pl-10 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-darkBorder flex justify-end">
                    <Button onClick={handleSavePersonal} icon={<Save size={18} />}>Salvar Alterações</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-darkSurface p-8 rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 transition-colors">
                <h3 className="font-bold text-xl text-darkText dark:text-darkTextPrimary mb-6 flex items-center gap-2">
                  <Lock className="text-primary" size={24} /> Alterar Senha
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Senha Atual</label>
                    <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Nova Senha</label>
                      <input type="password" placeholder="Nova senha" className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-darkText dark:text-darkTextPrimary mb-2">Confirmar Nova Senha</label>
                      <input type="password" placeholder="Repita a nova senha" className="w-full p-3 bg-gray-50 dark:bg-darkBg border border-gray-100 dark:border-darkBorder rounded-xl outline-none focus:border-primary transition-colors text-darkText dark:text-darkTextPrimary" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-darkBorder flex justify-end">
                    <Button icon={<Save size={18} />}>Atualizar Senha</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Settings */}
        <Modal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          title="Configurações da Conta"
          footer={
            <Button onClick={() => { logoutClient(); navigate('/'); }} variant="destructive" fullWidth>Sair da Conta</Button>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-lightText">Gerencie notificações e privacidade.</p>
            {/* Mock options */}
            <div className="flex items-center justify-between p-3 border rounded-xl">
              <span>Notificações por Email</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};