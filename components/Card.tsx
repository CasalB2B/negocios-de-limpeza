import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        rounded-2xl border border-border bg-white dark:bg-darkSurface text-card-foreground shadow-sm transition-all duration-200
        ${noPadding ? '' : 'p-6'}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/20' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};