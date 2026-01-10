import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../components/DataContext';

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate();
  const { loginClient } = useData();
  const [email, setEmail] = useState('julia@email.com'); // Pre-filled
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginClient(email)) {
        navigate('/client/dashboard');
    } else {
        alert("Cliente não encontrado. Tente 'julia@email.com'");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-[#7C3AED] p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 z-0">
            <img src="https://images.unsplash.com/photo-1581539250439-c96689b516dd?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover opacity-20 mix-blend-multiply filter grayscale" alt="Limpeza" />
        </div>
        <div className="relative z-10 text-white max-w-lg mt-20">
          <h1 className="text-5xl font-display font-bold mb-6 leading-tight">Sua casa brilhando, sem esforço.</h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-16 bg-white">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-500">
          <button onClick={() => navigate('/')} className="text-lightText flex items-center gap-2 mb-6"><ArrowLeft size={20} /> Voltar</button>
          
          <h2 className="text-4xl font-bold text-darkText mb-2">Bem-vindo</h2>
          <p className="text-lightText mb-8">Entre na sua conta de cliente.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-darkText mb-1">E-mail</label>
              <input type="email" autoComplete="email" className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50/50" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button fullWidth type="submit" className="h-12 text-base shadow-xl shadow-primary/20">Entrar</Button>
          </form>
        </div>
      </div>
    </div>
  );
};