import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-full transition-all duration-300 focus:outline-none ${
        theme === 'dark' 
          ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600' 
          : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
      } ${className}`}
      title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
    >
      {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};