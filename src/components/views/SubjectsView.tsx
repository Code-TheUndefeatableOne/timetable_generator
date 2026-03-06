import React from 'react';
import { Plus, Trash2, BookOpen, Palette } from 'lucide-react';
import { Subject } from '../../types';
import { Card, Input, Label, Button } from '../UI';

interface SubjectsViewProps {
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
  searchQuery?: string;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ subjects, setSubjects, searchQuery = '' }) => {
  const addSubject = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setSubjects([...subjects, { 
      id, 
      name: 'New Subject', 
      maxPeriodsPerDay: 2, 
      maxPeriodsPerWeek: 6, 
      allowBackToBack: false, 
      color: '#6366f1' 
    }]);
  };

  const filteredSubjects = subjects.filter(sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between sticky top-20 bg-[#FDFDFD]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-30 py-4 border-b border-zinc-100 dark:border-zinc-800 -mx-10 px-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Curriculum</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">Define your subjects and their scheduling constraints.</p>
        </div>
        <Button onClick={addSubject} className="royal-shadow">
          <Plus size={18} /> Add New Subject
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSubjects.map((sub) => (
          <Card key={sub.id} title={sub.name} icon={BookOpen}>
            <div className="space-y-6">
              <div>
                <Label>Subject Name</Label>
                <Input 
                  value={sub.name} 
                  onChange={(e) => updateSubject(sub.id, { name: e.target.value })}
                  placeholder="e.g. Advanced Mathematics"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max / Day</Label>
                  <Input 
                    type="number" 
                    value={sub.maxPeriodsPerDay} 
                    onChange={(e) => updateSubject(sub.id, { maxPeriodsPerDay: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div>
                  <Label>Max / Week</Label>
                  <Input 
                    type="number" 
                    value={sub.maxPeriodsPerWeek} 
                    onChange={(e) => updateSubject(sub.id, { maxPeriodsPerWeek: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <Palette size={14} className="text-zinc-400" />
                  </div>
                  <Label>Theme Color</Label>
                </div>
                <input 
                  type="color" 
                  value={sub.color} 
                  onChange={(e) => updateSubject(sub.id, { color: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer group p-1">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={sub.allowBackToBack} 
                    onChange={(e) => updateSubject(sub.id, { allowBackToBack: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full peer peer-checked:bg-gold-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 group-hover:text-gold-500 transition-colors">Allow Back-to-Back Periods</span>
              </label>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button 
                  variant="danger" 
                  size="sm" 
                  className="w-full"
                  onClick={() => removeSubject(sub.id)}
                >
                  <Trash2 size={14} /> Remove Subject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
