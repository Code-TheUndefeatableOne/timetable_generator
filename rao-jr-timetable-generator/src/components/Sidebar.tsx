import React from 'react';
import { 
  Settings, 
  Calendar, 
  LayoutGrid, 
  Users, 
  BookOpen, 
  ClipboardList,
  Layers,
  RefreshCcw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ViewType = 'subjects' | 'teachers' | 'grades' | 'assignments' | 'sync' | 'timetable';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isValid: boolean;
  violations: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isValid, violations }) => {
  const menuItems: { id: ViewType; icon: any; label: string }[] = [
    { id: 'subjects', icon: BookOpen, label: 'Subjects' },
    { id: 'teachers', icon: Users, label: 'Faculty' },
    { id: 'grades', icon: Layers, label: 'Grades & Sections' },
    { id: 'assignments', icon: ClipboardList, label: 'Assignments' },
    { id: 'sync', icon: RefreshCcw, label: 'Synchronization' },
    { id: 'timetable', icon: Calendar, label: 'Timetable' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col items-center py-8 gap-10 z-50 transition-colors">
      <div className="w-12 h-12 bg-gold-500 rounded-2xl flex items-center justify-center text-white royal-shadow">
        <LayoutGrid size={24} />
      </div>
      
      <div className="flex flex-col gap-6">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={item.label}
            className={cn(
              "p-3.5 rounded-2xl transition-all relative group",
              activeView === item.id 
                ? "bg-gold-500 text-white royal-shadow" 
                : "text-zinc-400 dark:text-zinc-600 hover:text-gold-500 dark:hover:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20"
            )}
          >
            <item.icon size={22} />
            <span className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        <div 
          title={isValid ? "All constraints met" : `${violations} violations detected`}
          className={cn(
            "w-3 h-3 rounded-full transition-all duration-500",
            isValid 
              ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
              : "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse"
          )} 
        />
      </div>
    </nav>
  );
};
