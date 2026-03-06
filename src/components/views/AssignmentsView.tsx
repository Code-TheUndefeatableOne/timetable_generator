import React, { useState } from 'react';
import { ClipboardList, Check, User, BookOpen, Search } from 'lucide-react';
import { Section, Subject, Teacher, GradeStructure } from '../../types';
import { Card, Input, Label, Button } from '../UI';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AssignmentsViewProps {
  sections: Section[];
  setSections: (sections: Section[]) => void;
  subjects: Subject[];
  teachers: Teacher[];
  gradeStructures: GradeStructure[];
  searchQuery?: string;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ 
  sections, 
  setSections, 
  subjects, 
  teachers,
  gradeStructures,
  searchQuery = ''
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Sync global search with local search
  React.useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  const currentSection = sections.find(s => s.id === selectedSectionId);
  const currentGrade = gradeStructures.find(g => g.id === currentSection?.gradeId);

  const toggleSubject = (sectionId: string, subjectId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const isTaught = section.subjectIds.includes(subjectId);
    const newSubjectIds = isTaught
      ? section.subjectIds.filter(id => id !== subjectId)
      : [...section.subjectIds, subjectId];
    
    // Also remove assignment if subject is removed
    const newAssignments = isTaught
      ? section.assignments.filter(a => a.subjectId !== subjectId)
      : section.assignments;

    setSections(sections.map(s => s.id === sectionId ? { ...s, subjectIds: newSubjectIds, assignments: newAssignments } : s));
  };

  const assignTeacher = (sectionId: string, subjectId: string, teacherId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const existing = section.assignments.find(a => a.subjectId === subjectId);
    const newAssignments = existing
      ? section.assignments.map(a => a.subjectId === subjectId ? { ...a, teacherId } : a)
      : [...section.assignments, { subjectId, teacherId }];

    setSections(sections.map(s => s.id === sectionId ? { ...s, assignments: newAssignments } : s));
  };

  const filteredSections = sections.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gradeStructures.find(g => g.id === s.gradeId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between sticky top-20 bg-[#FDFDFD]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-30 py-4 border-b border-zinc-100 dark:border-zinc-800 -mx-10 px-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Course Assignments</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium italic">Select subjects for each section and assign specialized faculty.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Section Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <Input 
              placeholder="Search sections..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredSections.map(section => {
              const grade = gradeStructures.find(g => g.id === section.gradeId);
              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border",
                    selectedSectionId === section.id
                      ? "bg-gold-500 border-gold-500 text-white royal-shadow"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-gold-500"
                  )}
                >
                  <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", selectedSectionId === section.id ? "text-white/60" : "text-zinc-400")}>
                    {grade?.name || 'No Grade'}
                  </p>
                  <p className="font-black uppercase tracking-tight">{section.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white dark:bg-emerald-400" 
                        style={{ width: `${(section.subjectIds.length / Math.max(subjects.length, 1)) * 100}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{section.subjectIds.length} Subjects</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignment Editor */}
        <div className="lg:col-span-3">
          {currentSection ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-700">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{currentSection.name}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium italic">{currentGrade?.name} • {currentGrade?.slots.filter(s => s.type === 'period').length} periods daily</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Completion</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">
                    {Math.round((currentSection.assignments.length / Math.max(currentSection.subjectIds.length, 1)) * 100)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject Selection */}
                <Card title="Available Subjects" icon={BookOpen} subtitle="Select which subjects are taught in this section">
                  <div className="space-y-2">
                    {subjects.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => toggleSubject(currentSection.id, sub.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                          currentSection.subjectIds.includes(sub.id)
                            ? "bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:border-zinc-200 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                          <span className="text-xs font-black uppercase tracking-widest">{sub.name}</span>
                        </div>
                        {currentSection.subjectIds.includes(sub.id) && (
                          <div className="w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center text-white royal-shadow">
                            <Check size={12} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Faculty Assignment */}
                <Card title="Faculty Assignment" icon={User} subtitle="Assign a specialized teacher for each subject">
                  <div className="space-y-4">
                    {currentSection.subjectIds.length === 0 && (
                      <p className="text-sm text-zinc-400 italic text-center py-8">Select subjects first to assign faculty.</p>
                    )}
                    {currentSection.subjectIds.map(subId => {
                      const sub = subjects.find(s => s.id === subId);
                      const assignment = currentSection.assignments.find(a => a.subjectId === subId);
                      const eligibleTeachers = teachers.filter(t => t.specializations.includes(subId));

                      return (
                        <div key={subId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{sub?.name}</span>
                            {!assignment && <span className="text-[10px] font-bold text-rose-500 uppercase">Unassigned</span>}
                          </div>
                          <select
                            className={cn(
                              "w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-4 transition-all appearance-none bg-no-repeat bg-[right_1rem_center]",
                              assignment 
                                ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:ring-zinc-500/5 focus:border-zinc-500" 
                                : "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 focus:ring-rose-500/5 focus:border-rose-400"
                            )}
                            value={assignment?.teacherId || ''}
                            onChange={(e) => assignTeacher(currentSection.id, subId, e.target.value)}
                          >
                            <option value="">Select Faculty...</option>
                            {eligibleTeachers.map(t => (
                              <option key={t.id} value={t.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{t.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4 py-20">
              <ClipboardList size={64} strokeWidth={1} className="text-zinc-200 dark:text-zinc-800" />
              <p className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Select a section to manage assignments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
