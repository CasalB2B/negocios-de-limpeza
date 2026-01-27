import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft, LogIn, Loader } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const CollaboratorLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginCollaborator, currentCollaborator } = useData();
  const [loginData, setLoginData] = useState({ email: 'ana@email.com', password: '123' }); // Pre-filled
  const [isLoading, setIsLoading] = useState(false);

  // Verifica se já está logado ao carregar a página
  useEffect(() => {
    if (currentCollaborator) {
      navigate('/collab/agenda');
    }
  }, [currentCollaborator, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await loginCollaborator(loginData.email, loginData.password);
      if (success) {
        navigate('/collab/agenda');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 relative z-10 border border-gray-100">
        <button onClick={() => navigate('/')} className="text-lightText flex items-center gap-2 mb-6 hover:text-darkText text-sm font-bold"><ArrowLeft size={16} /> Voltar</button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-darkText mb-2">Portal da Colaboradora</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" autoComplete="email" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} placeholder="E-mail" />
          <input type="password" autoComplete="current-password" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} placeholder="Senha" />
          <Button fullWidth type="submit" variant="secondary" disabled={isLoading} className="mt-4" icon={isLoading ? <Loader size={18} className="animate-spin" /> : <LogIn size={18} />}>
            {isLoading ? 'Entrando...' : 'Acessar Agenda'}
          </Button>
        </form>
      </div>
    </div>
  );
};