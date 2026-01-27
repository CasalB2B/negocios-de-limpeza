import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft, Lock, AlertCircle, Loader } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginAdmin, adminLoggedIn } = useData();
  const [formData, setFormData] = useState({ user: '', pass: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Verifica se já está logado ao carregar a página
  useEffect(() => {
    if (adminLoggedIn) {
      navigate('/admin/dashboard');
    }
  }, [adminLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await loginAdmin(formData.user, formData.pass);
      if (success) {
        navigate('/admin/dashboard');
      } else {
        setError('Credenciais inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkSlate flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-700 to-gray-900"></div>

        <button onClick={() => navigate('/')} className="text-lightText flex items-center gap-2 mb-6 hover:text-darkText text-sm font-bold">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-darkSlate rounded-lg flex items-center justify-center text-white">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-darkText mb-0">Portal Admin</h1>
            <p className="text-xs text-lightText font-mono">Acesso Restrito</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 mb-4 border border-red-100">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-darkText mb-1.5">Usuário</label>
            <input
              type="text"
              className="w-full p-3.5 rounded-lg border border-gray-300 focus:border-darkSlate outline-none transition-colors bg-gray-50 focus:bg-white"
              placeholder="admin"
              value={formData.user}
              onChange={(e) => setFormData({ ...formData, user: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-darkText mb-1.5">Senha</label>
            <input
              type="password"
              className="w-full p-3.5 rounded-lg border border-gray-300 focus:border-darkSlate outline-none transition-colors bg-gray-50 focus:bg-white"
              placeholder="••••"
              value={formData.pass}
              onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
            />
          </div>
          <Button fullWidth type="submit" disabled={isLoading} className="bg-darkSlate text-white hover:bg-black mt-4 shadow-lg shadow-gray-400/20">
            {isLoading ? <Loader size={20} className="animate-spin" /> : 'Acessar Sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
};