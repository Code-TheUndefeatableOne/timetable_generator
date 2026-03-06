import React from 'react';
import { Plus, Trash2, Layers, Clock, LayoutGrid, ChevronRight, Coffee, AlertCircle } from 'lucide-react';
import { GradeStructure, Section, TimeSlot } from '../../types';
import { Card, Input, Label, Button } from '../UI';

interface GradesViewProps {
  gradeStructures: GradeStructure[];
  setGradeStructures: (grades: GradeStructure[]) => void;
  sections: Section[];
  setSections: (sections: Section[]) => void;
  searchQuery?: string;
}

export const GradesView: React.FC<GradesViewProps> = ({ 
  gradeStructures, 
  setGradeStructures, 
  sections, 
  setSections,
  searchQuery = ''
}) => {
  const addGrade = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setGradeStructures([...gradeStructures, { 
      id, 
      name: 'New Grade', 
      slots: [
        { id: 'p1', type: 'period', label: 'Period 1', startTime: '08:00', endTime: '08:45' }
      ]
    }]);
  };

  const filteredGrades = gradeStructures.filter(grade => 
    grade.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sections.some(s => s.gradeId === grade.id && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const updateGrade = (id: string, updates: Partial<GradeStructure>) => {
    setGradeStructures(gradeStructures.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const removeGrade = (id: string) => {
    setGradeStructures(gradeStructures.filter(g => g.id !== id));
    setSections(sections.filter(s => s.gradeId !== id));
  };

  const addSlot = (gradeId: string, type: 'period' | 'break') => {
    const grade = gradeStructures.find(g => g.id === gradeId);
    if (!grade) return;

    const lastSlot = grade.slots[grade.slots.length - 1];
    let startTime = '08:00';
    let endTime = '08:45';

    if (lastSlot) {
      startTime = lastSlot.endTime;
      // Add 45 mins for period, 15 for break
      const [h, m] = startTime.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + (type === 'period' ? 45 : 15));
      endTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    const newSlot: TimeSlot = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: type === 'period' ? `Period ${grade.slots.filter(s => s.type === 'period').length + 1}` : 'Break',
      startTime,
      endTime
    };

    updateGrade(gradeId, { slots: [...grade.slots, newSlot] });
  };

  const updateSlot = (gradeId: string, slotId: string, updates: Partial<TimeSlot>) => {
    const grade = gradeStructures.find(g => g.id === gradeId);
    if (!grade) return;
    const newSlots = grade.slots.map(s => s.id === slotId ? { ...s, ...updates } : s);
    updateGrade(gradeId, { slots: newSlots });
  };

  const removeSlot = (gradeId: string, slotId: string) => {
    const grade = gradeStructures.find(g => g.id === gradeId);
    if (!grade) return;
    updateGrade(gradeId, { slots: grade.slots.filter(s => s.id !== slotId) });
  };

  const addSection = (gradeId: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setSections([...sections, { 
      id, 
      gradeId, 
      name: 'New Section', 
      subjectIds: [], 
      assignments: [] 
    }]);
  };

  const updateSection = (id: string, name: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, name } : s));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const getSlotErrors = (slots: TimeSlot[]) => {
    const errors: Record<string, string[]> = {};
    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    slots.forEach((slot, i) => {
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);

      if (!errors[slot.id]) errors[slot.id] = [];

      if (start >= end) {
        errors[slot.id].push('Start time must be before end time.');
      }

      for (let j = i + 1; j < slots.length; j++) {
        const other = slots[j];
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);

        if (start < otherEnd && otherStart < end) {
          errors[slot.id].push(`Overlap with ${other.label}.`);
          if (!errors[other.id]) errors[other.id] = [];
          errors[other.id].push(`Overlap with ${slot.label}.`);
        }
      }
    });

    return errors;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between sticky top-20 bg-[#FDFDFD]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-30 py-4 border-b border-zinc-100 dark:border-zinc-800 -mx-10 px-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Academic Structure</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">Define grades, their custom daily schedules, and associated sections.</p>
        </div>
        <Button onClick={addGrade} className="royal-shadow">
          <Plus size={18} /> Add Grade Level
        </Button>
      </div>

      <div className="space-y-16">
        {filteredGrades.map((grade) => (
          <div key={grade.id} className="space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold-500 rounded-2xl flex items-center justify-center text-white royal-shadow">
                <Layers size={24} />
              </div>
              <div className="flex-1">
                <Input 
                  value={grade.name} 
                  onChange={(e) => updateGrade(grade.id, { name: e.target.value })}
                  className="text-2xl font-black border-none bg-transparent p-0 h-auto focus:ring-0 w-auto min-w-[200px] uppercase tracking-tight"
                />
              </div>
              <Button variant="danger" size="sm" onClick={() => removeGrade(grade.id)}>
                <Trash2 size={14} /> Remove Grade
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Schedule Config */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-zinc-400" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Daily Schedule (Slots)</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addSlot(grade.id, 'period')}>
                      <Plus size={14} /> Add Period
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addSlot(grade.id, 'break')}>
                      <Coffee size={14} /> Add Break
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const errors = getSlotErrors(grade.slots);
                    return grade.slots.map((slot, index) => (
                      <div key={slot.id} className="space-y-2">
                        <div 
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            errors[slot.id]?.length > 0 
                              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                              : slot.type === 'period' ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800 border-dashed'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                            slot.type === 'period' ? 'bg-gold-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <Input 
                              value={slot.label}
                              onChange={(e) => updateSlot(grade.id, slot.id, { label: e.target.value })}
                              className="font-bold text-sm"
                              placeholder="Label (e.g. Period 1)"
                            />
                            <div className="flex items-center gap-2">
                              <Input 
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateSlot(grade.id, slot.id, { startTime: e.target.value })}
                                className="text-xs font-mono"
                              />
                              <span className="text-zinc-300">→</span>
                              <Input 
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateSlot(grade.id, slot.id, { endTime: e.target.value })}
                                className="text-xs font-mono"
                              />
                            </div>
                            <div className="flex items-center justify-end">
                              <button 
                                onClick={() => removeSlot(grade.id, slot.id)}
                                className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {errors[slot.id]?.map((err, i) => (
                          <p key={i} className="text-[10px] font-bold text-rose-500 flex items-center gap-1 ml-12">
                            <AlertCircle size={10} /> {err}
                          </p>
                        ))}
                      </div>
                    ));
                  })()}
                  {grade.slots.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-400 gap-2">
                      <p className="text-sm font-medium italic">No periods or breaks defined for this grade.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sections List */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={16} className="text-zinc-400" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Sections</h4>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addSection(grade.id)}>
                    <Plus size={14} /> Add Section
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {sections.filter(s => s.gradeId === grade.id).map(section => (
                    <div 
                      key={section.id} 
                      className="group bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:border-gold-500 dark:hover:border-gold-500 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-gold-500 transition-colors border border-zinc-100 dark:border-zinc-700">
                          <ChevronRight size={16} />
                        </div>
                        <Input 
                          value={section.name} 
                          onChange={(e) => updateSection(section.id, e.target.value)}
                          className="border-none bg-transparent p-0 h-auto focus:ring-0 font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-tight"
                        />
                      </div>
                      <button 
                        onClick={() => removeSection(section.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-rose-500 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {sections.filter(s => s.gradeId === grade.id).length === 0 && (
                    <div className="py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-400 gap-2">
                      <p className="text-sm font-medium italic">No sections added to this grade.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredGrades.length === 0 && (
          <div className="py-24 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[40px] flex flex-col items-center justify-center text-zinc-400 gap-6">
            <Layers size={64} strokeWidth={1} className="text-zinc-200 dark:text-zinc-800" />
            <div className="text-center">
              <p className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">No Grades Defined</p>
              <p className="text-sm font-medium italic">Start by adding a grade level to organize your sections and schedules.</p>
            </div>
            <Button onClick={addGrade} size="lg" className="rounded-2xl px-8">Add Your First Grade</Button>
          </div>
        )}
      </div>
    </div>
  );
};
