import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const CollaboratorLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginCollaborator } = useData();
  const [loginData, setLoginData] = useState({ email: 'ana@email.com', password: '123' }); // Pre-filled

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCollaborator(loginData.email, loginData.password)) {
        navigate('/collab/agenda');
    } else {
        alert('Credenciais incorretas. Tente "ana@email.com" / "123"');
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
            <input type="text" autoComplete="email" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} placeholder="E-mail" />
            <input type="password" autoComplete="current-password" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} placeholder="Senha" />
            <Button fullWidth type="submit" variant="secondary" className="mt-4" icon={<LogIn size={18}/>}>Acessar Agenda</Button>
        </form>
      </div>
    </div>
  );
};