import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className, title, icon: Icon, subtitle, ...props }: { children: React.ReactNode, className?: string, title?: string, icon?: any, subtitle?: string, [key: string]: any }) => (
  <div className={cn("bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300", className)} {...props}>
    {title && (
      <div className="px-6 py-5 border-b border-zinc-50 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {Icon && <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm"><Icon size={18} className="text-gold-500" /></div>}
          <div>
            <h3 className="text-xs font-black tracking-widest text-zinc-900 dark:text-white uppercase">{title}</h3>
            {subtitle && <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={cn(
      "w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white",
      props.className
    )} 
  />
);

export const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 mb-2 ml-1 tracking-[0.15em]">{children}</label>
);

export const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error', className?: string }) => {
  const variants = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    success: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30",
    warning: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30",
    error: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center", variants[variant], className)}>
      {children}
    </span>
  );
};

export const Button = ({ children, variant = 'primary', size = 'md', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: "bg-gold-500 text-white hover:bg-gold-600 royal-shadow",
    secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700",
    outline: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-gold-500 dark:hover:border-gold-500 hover:text-gold-500",
    ghost: "bg-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white",
    danger: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-100 dark:border-rose-900/30"
  };
  
  const sizes = {
    sm: "px-4 py-2 text-[10px] font-black uppercase tracking-widest",
    md: "px-5 py-2.5 text-xs font-black uppercase tracking-widest",
    lg: "px-7 py-3.5 text-sm font-black uppercase tracking-widest"
  };

  return (
    <button 
      {...props} 
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};
