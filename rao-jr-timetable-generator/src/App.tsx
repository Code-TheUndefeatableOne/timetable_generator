/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun, Crown, Search, Github, Twitter, Mail, Instagram, Phone } from 'lucide-react';
import { Sidebar, ViewType } from './components/Sidebar';
import { SubjectsView } from './components/views/SubjectsView';
import { TeachersView } from './components/views/TeachersView';
import { GradesView } from './components/views/GradesView';
import { AssignmentsView } from './components/views/AssignmentsView';
import { SyncView } from './components/views/SyncView';
import { TimetableView } from './components/views/TimetableView';
import { 
  Subject, 
  Teacher, 
  GradeStructure, 
  Section, 
  TimetableEntry, 
  SyncConstraint 
} from './types';
import { validateTimetable, autoGenerateTimetable } from './utils/scheduler';

export default function App() {
  // --- Centralized State ---
  const [activeView, setActiveView] = useState<ViewType>('subjects');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 's1', name: 'Mathematics', maxPeriodsPerDay: 2, maxPeriodsPerWeek: 6, allowBackToBack: false, color: '#c88a33' },
    { id: 's2', name: 'Physics', maxPeriodsPerDay: 1, maxPeriodsPerWeek: 4, allowBackToBack: true, color: '#4a4a4a' },
    { id: 's3', name: 'English', maxPeriodsPerDay: 1, maxPeriodsPerWeek: 5, allowBackToBack: false, color: '#1a1a1a' },
  ]);

  const [teachers, setTeachers] = useState<Teacher[]>([
    { id: 't1', name: 'Dr. Alistair Smith', specializations: ['s1', 's2'] },
    { id: 't2', name: 'Prof. Julianne Jones', specializations: ['s3'] },
  ]);

  const [gradeStructures, setGradeStructures] = useState<GradeStructure[]>([
    { 
      id: 'g1', 
      name: 'Grade 10', 
      slots: [
        { id: 'p1', type: 'period', label: 'Period 1', startTime: '08:00', endTime: '08:45' },
        { id: 'p2', type: 'period', label: 'Period 2', startTime: '08:45', endTime: '09:30' },
        { id: 'b1', type: 'break', label: 'Short Break', startTime: '09:30', endTime: '09:45' },
        { id: 'p3', type: 'period', label: 'Period 3', startTime: '09:45', endTime: '10:30' },
        { id: 'p4', type: 'period', label: 'Period 4', startTime: '10:30', endTime: '11:15' },
        { id: 'b2', type: 'break', label: 'Lunch Break', startTime: '11:15', endTime: '12:00' },
        { id: 'p5', type: 'period', label: 'Period 5', startTime: '12:00', endTime: '12:45' },
        { id: 'p6', type: 'period', label: 'Period 6', startTime: '12:45', endTime: '13:30' },
      ]
    },
  ]);

  const [sections, setSections] = useState<Section[]>([
    { id: 'sec1', gradeId: 'g1', name: 'House of Windsor', subjectIds: ['s1', 's2', 's3'], assignments: [
      { subjectId: 's1', teacherId: 't1' },
      { subjectId: 's2', teacherId: 't1' },
      { subjectId: 's3', teacherId: 't2' },
    ]},
  ]);

  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [syncConstraints, setSyncConstraints] = useState<SyncConstraint[]>([]);

  // --- Persistence ---
  const handleSave = () => {
    const state = {
      subjects,
      teachers,
      gradeStructures,
      sections,
      entries,
      syncConstraints
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronos_royal_timetable_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target?.result as string);
        setSubjects(state.subjects);
        setTeachers(state.teachers);
        setGradeStructures(state.gradeStructures);
        setSections(state.sections);
        setEntries(state.entries);
        setSyncConstraints(state.syncConstraints || []);
      } catch (err) {
        alert('Failed to parse state file.');
      }
    };
    reader.readAsText(file);
  };

  // --- Validation Logic ---
  const validationResults = useMemo(() => {
    return validateTimetable(entries, subjects, teachers, sections, syncConstraints, gradeStructures);
  }, [entries, subjects, teachers, sections, syncConstraints, gradeStructures]);

  const violationsCount = useMemo(() => {
    return Object.values(validationResults).filter((r: any) => !r.isValid).length;
  }, [validationResults]);

  // --- Handlers ---
  const handleAutoGenerate = () => {
    const structuresMap = gradeStructures.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
    const newEntries = autoGenerateTimetable(subjects, teachers, sections, structuresMap, syncConstraints);
    setEntries(newEntries);
  };

  const handleAutoGenerateForSection = (sectionId: string) => {
    const structuresMap = gradeStructures.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
    const newEntries = autoGenerateTimetable(subjects, teachers, sections, structuresMap, syncConstraints, entries, sectionId);
    setEntries(newEntries);
  };

  const handleUpdateEntries = (newEntries: TimetableEntry[]) => {
    // Check for sync propagation
    const lastEntry = newEntries.length > entries.length 
      ? newEntries[newEntries.length - 1] 
      : null;
    
    if (lastEntry) {
      const sync = syncConstraints.find(s => 
        s.sectionIds.includes(lastEntry.sectionId) && 
        s.day === lastEntry.day && 
        s.periodIndex === lastEntry.periodIndex &&
        s.subjectId === lastEntry.subjectId
      );

      if (sync) {
        const propagatedEntries = [...newEntries];
        sync.sectionIds.forEach(secId => {
          if (secId === lastEntry.sectionId) return;
          
          const existingIdx = propagatedEntries.findIndex(e => 
            e.sectionId === secId && e.day === lastEntry.day && e.periodIndex === lastEntry.periodIndex
          );

          const section = sections.find(s => s.id === secId);
          const assignment = section?.assignments.find(a => a.subjectId === lastEntry.subjectId);
          
          if (assignment) {
            const newEntry: TimetableEntry = {
              id: Math.random().toString(36).substr(2, 9),
              sectionId: secId,
              day: lastEntry.day,
              periodIndex: lastEntry.periodIndex,
              subjectId: lastEntry.subjectId,
              teacherId: assignment.teacherId
            };

            if (existingIdx >= 0) {
              propagatedEntries[existingIdx] = newEntry;
            } else {
              propagatedEntries.push(newEntry);
            }
          }
        });
        setEntries(propagatedEntries);
        return;
      }
    }
    
    setEntries(newEntries);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-gold-200 transition-colors duration-300">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isValid={violationsCount === 0}
        violations={violationsCount}
      />

      <main className="pl-20 min-h-screen">
        <header className="h-20 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-40 px-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-white royal-shadow">
              <Crown size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase leading-none">
                Rao Jr <br />
                <span className="text-gold-500 font-serif italic lowercase tracking-normal text-sm">timetable generator</span>
              </h1>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-10">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-gold-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search subjects, teachers, or sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-gold-500 transition-all"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-gold-500 transition-colors"
              >
                Export
              </button>
              <label className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-gold-500 transition-colors cursor-pointer">
                Import
                <input type="file" accept=".json" onChange={handleLoad} className="hidden" />
              </label>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Integrity</span>
                <span className={`text-xs font-bold ${violationsCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {violationsCount === 0 ? 'Optimal' : `${violationsCount} Issues`}
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${violationsCount === 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {activeView === 'subjects' && (
                <SubjectsView subjects={subjects} setSubjects={setSubjects} searchQuery={searchQuery} />
              )}
              {activeView === 'teachers' && (
                <TeachersView 
                  teachers={teachers} 
                  setTeachers={setTeachers} 
                  subjects={subjects} 
                  gradeStructures={gradeStructures}
                  searchQuery={searchQuery}
                />
              )}
              {activeView === 'grades' && (
                <GradesView 
                  gradeStructures={gradeStructures} 
                  setGradeStructures={setGradeStructures} 
                  sections={sections} 
                  setSections={setSections} 
                  searchQuery={searchQuery}
                />
              )}
              {activeView === 'assignments' && (
                <AssignmentsView 
                  sections={sections} 
                  setSections={setSections} 
                  subjects={subjects} 
                  teachers={teachers}
                  gradeStructures={gradeStructures}
                  searchQuery={searchQuery}
                />
              )}
              {activeView === 'sync' && (
                <SyncView 
                  syncConstraints={syncConstraints}
                  setSyncConstraints={setSyncConstraints}
                  sections={sections}
                  subjects={subjects}
                  gradeStructures={gradeStructures}
                  searchQuery={searchQuery}
                />
              )}
              {activeView === 'timetable' && (
                <TimetableView 
                  entries={entries}
                  setEntries={handleUpdateEntries}
                  subjects={subjects}
                  teachers={teachers}
                  sections={sections}
                  gradeStructures={gradeStructures}
                  validationResults={validationResults}
                  onAutoGenerate={handleAutoGenerate}
                  onAutoGenerateForSection={handleAutoGenerateForSection}
                  syncConstraints={syncConstraints}
                  isDarkMode={isDarkMode}
                  searchQuery={searchQuery}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="mt-20 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 py-12 px-10">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center text-white">
                  <Crown size={16} />
                </div>
                <h3 className="text-lg font-black tracking-tighter text-zinc-900 dark:text-white uppercase leading-tight">
                  Rao Jr AI <br />
                  <span className="text-gold-500 font-serif italic lowercase tracking-normal text-xs">timetable generator</span>
                </h3>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed max-w-md">
                Empowering educational institutions with intelligent, constraint-aware scheduling solutions. 
                Built with precision and crafted for excellence.
              </p>
            </div>
            
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Connect</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                    <Phone size={16} className="text-gold-500" />
                  </div>
                  <span>+91 6301940530</span>
                </div>
                
                <a 
                  href="https://www.instagram.com/theundefeatableone?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 hover:text-gold-500 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                    <Instagram size={16} className="text-gold-500" />
                  </div>
                  <span>@theundefeatableone</span>
                </a>

                <a 
                  href="mailto:satyabhuvaneshv99@gmail.com"
                  className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 hover:text-gold-500 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                    <Mail size={16} className="text-gold-500" />
                  </div>
                  <span>satyabhuvaneshv99@gmail.com</span>
                </a>
              </div>
              <p className="mt-8 text-[10px] text-zinc-400 font-medium">
                © 2026 Rao Jr. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
