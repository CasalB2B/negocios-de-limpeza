import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wider";

  const variants = {
    default: "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
    secondary: "border-transparent bg-secondary/10 text-secondary hover:bg-secondary/20",
    destructive: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
    outline: "text-foreground border-border",
    success: "border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    neutral: "border-transparent bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};