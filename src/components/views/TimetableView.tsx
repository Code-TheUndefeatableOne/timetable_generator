import React, { useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Filter, 
  Coffee, 
  GripVertical, 
  LayoutGrid,
  User,
  ShieldAlert,
  Crown,
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable, 
  DragEndEvent, 
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { 
  Subject, 
  Teacher, 
  Section, 
  TimetableEntry, 
  GradeStructure, 
  Day, 
  SyncConstraint,
  ValidationResult
} from '../../types';
import { DAYS, validateTimetable } from '../../utils/scheduler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Button, Card, Badge } from '../UI';

interface TimetableViewProps {
  entries: TimetableEntry[];
  setEntries: (entries: TimetableEntry[]) => void;
  subjects: Subject[];
  teachers: Teacher[];
  sections: Section[];
  gradeStructures: GradeStructure[] | Record<string, GradeStructure>;
  validationResults: Record<string, ValidationResult>;
  onAutoGenerate: () => void;
  onAutoGenerateForSection: (sectionId: string) => void;
  syncConstraints: SyncConstraint[];
  isDarkMode: boolean;
  searchQuery?: string;
}

// --- Draggable Subject Component ---
interface DraggableSubjectProps {
  subject: Subject;
  teacher: Teacher;
  id: string;
}

const DraggableSubject: React.FC<DraggableSubjectProps> = ({ subject, teacher, id }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { subject, teacher }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all",
        "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md",
        isDragging && "opacity-50 scale-95"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100 truncate">
          {subject.name}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-medium truncate">
        <User size={10} />
        {teacher.name}
      </div>
    </div>
  );
};

// --- Draggable Entry Component (for grid) ---
interface DraggableEntryProps {
  entry: TimetableEntry;
  subject?: Subject;
  teacher?: Teacher;
  validation?: ValidationResult;
  onDelete: () => void;
}

const DraggableEntry: React.FC<DraggableEntryProps> = ({ 
  entry, 
  subject, 
  teacher, 
  validation, 
  onDelete
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: { entry, subject, teacher, type: 'grid-entry' }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 h-full flex flex-col justify-between transition-all relative z-10 group",
        !validation?.isValid && "bg-rose-50/50 dark:bg-rose-900/20 hover:bg-rose-100/50 dark:hover:bg-rose-900/40",
        isDragging && "opacity-0"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div 
            {...listeners} 
            {...attributes}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
          >
            <GripVertical size={10} className="text-zinc-400" />
          </div>
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color }} />
          <span className="subject-name text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {subject?.name}
          </span>
        </div>
        <div className="entry-controls flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-zinc-300 hover:text-rose-500 transition-all"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
      
      <div className="mt-1 flex items-center gap-1 text-[9px] text-zinc-400 font-medium print:text-zinc-900 print:text-[10px] print:font-bold">
        <User size={10} className="shrink-0 print:hidden" />
        <span className="teacher-name print:before:content-['('] print:after:content-[')'] print:whitespace-normal print:break-words">{teacher?.name}</span>
      </div>
    </div>
  );
};

// --- Droppable Cell Component ---
interface DroppableCellProps {
  day: Day;
  periodIndex: number;
  children: React.ReactNode;
  isOver?: boolean;
  isDragging?: boolean;
  validation?: ValidationResult;
}

const DroppableCell: React.FC<DroppableCellProps> = ({ day, periodIndex, children, isOver, isDragging, validation }) => {
  const { setNodeRef } = useDroppable({
    id: `cell-${day}-${periodIndex}`,
    data: { day, periodIndex }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "h-full w-full transition-all relative min-h-[60px] group",
        isDragging && "bg-zinc-50/50 dark:bg-zinc-900/20",
        isOver && "bg-gold-100/30 dark:bg-gold-900/20 border-2 border-solid border-gold-500 shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]"
      )}
    >
      {children}

      {/* Tooltip for violations moved to cell hover */}
      {validation?.errors && validation.errors.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-zinc-900/95 dark:bg-zinc-950/95 text-white text-[11px] rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-500 z-[100] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-gold-500/40 backdrop-blur-xl translate-y-4 group-hover:translate-y-0 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-rose-500 animate-pulse" />
              <p className="font-black uppercase tracking-[0.2em] text-gold-400">Conflict Detected</p>
            </div>
            <Badge variant="error" className="bg-rose-50/10 text-rose-400 border-rose-500/30 text-[8px] px-1.5 py-0">
              {validation.errors.length}
            </Badge>
          </div>
          <ul className="space-y-2.5">
            {validation.errors.map((err, i) => (
              <li key={i} className="flex items-start gap-2.5 text-zinc-200 leading-relaxed group/item">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                <span className="flex-1">{err}</span>
              </li>
            ))}
          </ul>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-zinc-900/95 dark:border-t-zinc-950/95" />
        </div>
      )}
    </div>
  );
};

export const TimetableView: React.FC<TimetableViewProps> = ({
  entries,
  setEntries,
  subjects,
  teachers,
  sections,
  gradeStructures,
  validationResults,
  onAutoGenerate,
  onAutoGenerateForSection,
  syncConstraints,
  isDarkMode,
  searchQuery = ''
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '');
  const selectedSection = sections.find(s => s.id === selectedSectionId);
  const structure = selectedSection ? (Array.isArray(gradeStructures) ? gradeStructures.find(g => g.id === selectedSection.gradeId) : gradeStructures[selectedSection.gradeId]) : null;
  const periods = structure?.slots.filter(s => s.type === 'period') || [];

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);
  const [overData, setOverData] = useState<{day: Day, periodIndex: number} | null>(null);
  const [viewMode, setViewMode] = useState<'section' | 'teacher'>('section');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const filteredSections = useMemo(() => {
    return sections.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sections, searchQuery]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [teachers, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveData(event.active.data.current);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      setOverData(over.data.current as any);
    } else {
      setOverData(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    setActiveId(null);
    setActiveData(null);
    setOverData(null);

    if (over && selectedSection) {
      const { day, periodIndex } = over.data.current as { day: Day; periodIndex: number };
      const activeData = active.data.current;

      if (activeData?.type === 'grid-entry') {
        const draggedEntry = activeData.entry as TimetableEntry;
        
        // Don't do anything if dropped on the same slot
        if (draggedEntry.day === day && draggedEntry.periodIndex === periodIndex) return;

        // Check if target cell has an entry
        const existingAtTarget = entries.find(e => 
          e.sectionId === selectedSection.id && e.day === day && e.periodIndex === periodIndex
        );

        if (existingAtTarget) {
          // Swap
          const updatedEntries = entries.map(e => {
            if (e.id === draggedEntry.id) {
              return { ...e, day, periodIndex };
            }
            if (e.id === existingAtTarget.id) {
              return { ...e, day: draggedEntry.day, periodIndex: draggedEntry.periodIndex };
            }
            return e;
          });
          setEntries(updatedEntries);
        } else {
          // Move
          const updatedEntries = entries.map(e => 
            e.id === draggedEntry.id ? { ...e, day, periodIndex } : e
          );
          setEntries(updatedEntries);
        }
      } else if (activeData?.subject && activeData?.teacher) {
        // From palette
        const { subject, teacher } = activeData as { subject: Subject; teacher: Teacher };

        // Remove any existing entry for this slot
        const filteredEntries = entries.filter(e => 
          !(e.sectionId === selectedSection.id && e.day === day && e.periodIndex === periodIndex)
        );

        const newEntry: TimetableEntry = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sectionId: selectedSection.id,
          day,
          periodIndex,
          subjectId: subject.id,
          teacherId: teacher.id
        };

        setEntries([...filteredEntries, newEntry]);
      }
    }
  };

  // Real-time validation for drag preview
  const previewValidation = useMemo(() => {
    if (!activeId || !overData || !selectedSectionId) return null;
    
    const { day, periodIndex } = overData;
    const activeEntry = activeData?.entry as TimetableEntry | undefined;
    
    let previewEntries: TimetableEntry[] = [];
    let targetEntryId = '';

    if (activeData?.type === 'grid-entry' && activeEntry) {
      targetEntryId = activeEntry.id;
      previewEntries = entries.map(e => e.id === activeEntry.id ? { ...e, day, periodIndex } : e);
    } else if (activeData?.subject && activeData?.teacher) {
      targetEntryId = 'preview-entry';
      const newEntry: TimetableEntry = {
        id: targetEntryId,
        sectionId: selectedSectionId,
        day,
        periodIndex,
        subjectId: activeData.subject.id,
        teacherId: activeData.teacher.id
      };
      const filtered = entries.filter(e => !(e.sectionId === selectedSectionId && e.day === day && e.periodIndex === periodIndex));
      previewEntries = [...filtered, newEntry];
    } else {
      return null;
    }

    const results = validateTimetable(previewEntries, subjects, teachers, sections, syncConstraints, gradeStructures);
    return { results, targetEntryId };
  }, [activeId, overData, activeData, entries, selectedSectionId, subjects, teachers, sections, syncConstraints, gradeStructures]);

  const checkValidityForSlot = (day: Day, periodIndex: number, subject: Subject, teacher: Teacher, ignoreEntryId?: string, sectionId?: string) => {
    const targetSectionId = sectionId || selectedSection?.id;
    if (!targetSectionId) return false;

    const targetSection = sections.find(s => s.id === targetSectionId);
    if (!targetSection) return false;

    const targetStructure = Array.isArray(gradeStructures) 
      ? gradeStructures.find(g => g.id === targetSection.gradeId) 
      : gradeStructures[targetSection.gradeId];
    if (!targetStructure) return false;

    const targetPeriods = targetStructure.slots.filter(s => s.type === 'period');
    const currentSlot = targetPeriods[periodIndex];
    if (!currentSlot) return false;

    // 1. Teacher Overlap
    const teacherHasConflict = entries.some(e => {
      if (e.id === ignoreEntryId) return false;
      if (e.teacherId !== teacher.id || e.day !== day) return false;

      // Check if this overlap is actually a synchronized period
      const isSynchronized = syncConstraints.some(sync => 
        sync.day === day && 
        sync.periodIndex === periodIndex &&
        sync.sectionIds.includes(targetSectionId) &&
        sync.sectionIds.includes(e.sectionId)
      );
      if (isSynchronized) return false;
      
      const otherSection = sections.find(s => s.id === e.sectionId);
      if (!otherSection) return false;
      
      const otherStructure = Array.isArray(gradeStructures) ? gradeStructures.find(g => g.id === otherSection.gradeId) : gradeStructures[otherSection.gradeId];
      if (!otherStructure) return false;
      const otherPeriods = otherStructure.slots.filter(s => s.type === 'period');
      const otherSlot = otherPeriods[e.periodIndex];
      
      if (!otherSlot) return false;

      return (
        currentSlot.startTime < otherSlot.endTime &&
        currentSlot.endTime > otherSlot.startTime
      );
    });

    if (teacherHasConflict) return false;

    // 2. Daily Limit
    const dailyCount = entries.filter(e => 
      e.id !== ignoreEntryId &&
      e.sectionId === targetSectionId && 
      e.day === day && 
      e.subjectId === subject.id
    ).length;
    if (dailyCount >= subject.maxPeriodsPerDay) return false;

    // 3. Weekly Limit
    const weeklyCount = entries.filter(e => 
      e.id !== ignoreEntryId &&
      e.sectionId === targetSectionId && 
      e.subjectId === subject.id
    ).length;
    if (weeklyCount >= subject.maxPeriodsPerWeek) return false;

    return true;
  };

  const exportToPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    const element = document.getElementById('timetable-container');
    if (!element) {
      setIsExporting(false);
      alert('Timetable container not found.');
      return;
    }

    // Store original scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    window.scrollTo(0, 0);

    try {
      // Add class for export styling
      element.classList.add('exporting-pdf');

      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1200,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('timetable-container');
          if (clonedElement) {
            clonedElement.style.width = '1200px';
            clonedElement.style.padding = '40px';
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const ratio = imgProps.width / imgProps.height;
      const renderWidth = pdfWidth;
      const renderHeight = pdfWidth / ratio;

      if (renderHeight > pdfHeight) {
        let heightLeft = renderHeight;
        let position = 0;

        while (heightLeft > 0) {
          pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
          position -= pdfHeight;
          if (heightLeft > 0) {
            pdf.addPage();
          }
        }
      } else {
        pdf.addImage(dataUrl, 'PNG', 0, 0, renderWidth, renderHeight, undefined, 'FAST');
      }

      pdf.save(`Timetable_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      element.classList.remove('exporting-pdf');
      setIsExporting(false);
      // Restore scroll position
      window.scrollTo(scrollX, scrollY);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in print:p-0">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm sticky top-24 z-30 print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('section')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'section' ? "bg-white dark:bg-zinc-700 text-gold-600 dark:text-gold-400 shadow-sm" : "text-zinc-500"
              )}
            >
              <LayoutGrid size={14} /> Section View
            </button>
            <button 
              onClick={() => setViewMode('teacher')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                viewMode === 'teacher' ? "bg-white dark:bg-zinc-700 text-gold-600 dark:text-gold-400 shadow-sm" : "text-zinc-500"
              )}
            >
              <User size={14} /> Teacher View
            </button>
          </div>

          {viewMode === 'section' && (
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-gold-500 transition-all min-w-[200px] text-zinc-900 dark:text-white"
            >
              {filteredSections.map(s => (
                <option key={s.id} value={s.id} className="dark:bg-zinc-900">{s.name}</option>
              ))}
            </select>
          )}

          {viewMode === 'teacher' && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-zinc-400" />
              <select 
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-gold-500 transition-all min-w-[200px] text-zinc-900 dark:text-white"
              >
                <option value="all">All Faculty</option>
                {filteredTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'section' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onAutoGenerateForSection(selectedSectionId)}
              className="text-gold-600 border-gold-200 hover:bg-gold-50 dark:border-gold-900/30 dark:hover:bg-gold-900/20 shadow-sm"
            >
              <RefreshCw size={14} className="mr-2" /> Section Architect
            </Button>
          )}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={onAutoGenerate}
            className="bg-gold-500 hover:bg-gold-600 text-white royal-shadow"
          >
            <RefreshCw size={14} className="mr-2" /> Global Architect
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToPDF}
            disabled={isExporting}
            className="text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800 shadow-sm"
          >
            {isExporting ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Download size={14} className="mr-2" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      <div id="timetable-container" className="relative bg-white dark:bg-zinc-900 transition-colors">
        <div className="print-header hidden print:block">
          <div className="border-b-2 border-zinc-900 pb-2 mb-4">
            <h1 className="text-xl font-bold text-zinc-900 uppercase">
              {viewMode === 'section' ? `Section: ${selectedSection?.name}` : (teacherFilter === 'all' ? 'Faculty Timetables' : `Faculty: ${teachers.find(t => t.id === teacherFilter)?.name}`)}
            </h1>
          </div>
        </div>

        <DndContext 
          sensors={sensors} 
          onDragStart={handleDragStart} 
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
          {/* Main Timetable Grid */}
          <div className="xl:col-span-3 space-y-6">
            {viewMode === 'section' ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden print:border-none print:shadow-none">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full border-collapse table-fixed min-w-[800px]">
                    <thead>
                      <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                        <th className="w-24 p-4 border-b border-zinc-100 dark:border-zinc-800"></th>
                        {DAYS.map(day => (
                          <th 
                            key={day} 
                            className="p-4 border-b border-zinc-100 dark:border-zinc-800 text-center"
                          >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                              {day}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {structure?.slots.map((slot, sIdx) => {
                        const pIdx = structure.slots.filter((s, i) => s.type === 'period' && i < sIdx).length;
                        const isPeriod = slot.type === 'period';

                        if (slot.type === 'break') {
                          return (
                            <tr 
                              key={slot.id} 
                              className={cn(
                                "bg-zinc-50/30 dark:bg-zinc-800/20",
                                // Hide break if it's between two hidden periods? 
                                // For now, just hide if it's not in selected slots if we treat breaks as slots?
                                // Actually, let's just keep breaks for now unless specified.
                              )}
                            >
                              <td className="p-3 border-r border-zinc-100 dark:border-zinc-800 text-center">
                                <div className="flex flex-col items-center">
                                  <Coffee size={14} className="text-zinc-300 mb-1" />
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{slot.startTime}</span>
                                </div>
                              </td>
                              <td colSpan={5} className="p-3 text-center border-b border-zinc-100 dark:border-zinc-800">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-600 italic">
                                  {slot.label}
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr 
                            key={slot.id}
                          >
                            <td className="p-3 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-800/10">
                              <div className="flex flex-col items-center gap-1">
                                <span className="slot-label text-[10px] font-black text-zinc-900 dark:text-zinc-100">{slot.label}</span>
                                <span className="slot-time text-[9px] font-medium text-zinc-400">{slot.startTime}</span>
                              </div>
                            </td>
                            {DAYS.map(day => {
                              const entry = entries.find(e => e.sectionId === selectedSectionId && e.day === day && e.periodIndex === pIdx);
                              const subject = subjects.find(s => s.id === entry?.subjectId);
                              const teacher = teachers.find(t => t.id === entry?.teacherId);
                              const validation = entry ? validationResults[entry.id] : undefined;
                              
                              const isOver = overData?.day === day && overData?.periodIndex === pIdx;
                              const currentPreviewValidation = isOver && previewValidation ? previewValidation.results[previewValidation.targetEntryId] : undefined;

                              return (
                                <td 
                                  key={day} 
                                  className="p-0 border-r border-b border-zinc-100 dark:border-zinc-800 last:border-r-0 relative group"
                                >
                                  <DroppableCell 
                                    day={day} 
                                    periodIndex={pIdx} 
                                    isDragging={!!activeId}
                                    isOver={isOver}
                                    validation={currentPreviewValidation || validation}
                                  >
                                    {entry ? (
                                      <DraggableEntry 
                                        entry={entry}
                                        subject={subject}
                                        teacher={teacher}
                                        validation={validation}
                                        onDelete={() => setEntries(entries.filter(e => e.id !== entry.id))}
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus size={14} className="text-zinc-200 dark:text-zinc-700" />
                                      </div>
                                    )}
                                  </DroppableCell>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Teacher View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teachers
                  .filter(t => teacherFilter === 'all' || t.id === teacherFilter)
                  .map(teacher => {
                    const teacherEntries = entries.filter(e => e.teacherId === teacher.id);
                  const hasConflict = teacherEntries.some(e => !validationResults[e.id]?.isValid);
                  
                  // Find all unique grade structures used by this teacher to determine time slots
                  const relevantGradeIds = Array.from(new Set(
                    sections.filter(s => teacherEntries.some(e => e.sectionId === s.id)).map(s => s.gradeId)
                  ));
                  
                  // For simplicity in teacher grid, we use the first grade structure found or a default
                  const teacherGradeId = relevantGradeIds[0] || (Array.isArray(gradeStructures) ? gradeStructures[0]?.id : Object.keys(gradeStructures)[0]);
                  const teacherStructure = Array.isArray(gradeStructures) 
                    ? gradeStructures.find(g => g.id === teacherGradeId) 
                    : gradeStructures[teacherGradeId as string || ''];
                  const teacherPeriods = teacherStructure?.slots.filter(s => s.type === 'period') || [];

                  return (
                    <Card 
                      key={teacher.id} 
                      id={`teacher-card-${teacher.id}`}
                      className={cn(
                        "p-6 royal-shadow border-zinc-100 dark:border-zinc-800 teacher-card overflow-hidden",
                        hasConflict && "ring-1 ring-rose-500/30"
                      )}
                    >
                      <div className="hidden print:block print-header mb-6 border-b-2 border-zinc-200 pb-4">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{teacher.name}</h2>
                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Faculty Schedule</p>
                      </div>
                      <div className="flex items-center justify-between mb-6 print:hidden">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gold-500/10 dark:bg-gold-500/20 rounded-2xl flex items-center justify-center text-gold-500 border border-gold-500/20">
                            <User size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">{teacher.name}</h3>
                            <p className="faculty-label text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Faculty Member</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 print-hidden-element">
                          <Badge variant={hasConflict ? "error" : "success"} className={cn(hasConflict && "animate-pulse")}>
                            {hasConflict ? <ShieldAlert size={10} className="mr-1" /> : <CheckCircle2 size={10} className="mr-1" />}
                            {hasConflict ? "Conflicts Detected" : "Schedule Valid"}
                          </Badge>
                        </div>
                      </div>

                      {/* Teacher Grid View */}
                      <div className="overflow-x-auto custom-scrollbar -mx-6 px-6">
                        <table className="w-full border-collapse min-w-[600px]">
                          <thead>
                            <tr>
                              <th className="w-20 p-2 border-b-2 border-gold-500/20"></th>
                              {DAYS.map(day => (
                                <th 
                                  key={day} 
                                  className="p-2 border-b-2 border-gold-500/20 text-[10px] font-black uppercase tracking-widest text-zinc-400"
                                >
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {teacherPeriods.map((slot, pIdx) => (
                              <tr 
                                key={slot.id} 
                                className="group"
                              >
                                <td className="p-2 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
                                  <div className="flex flex-col items-center">
                                    <span className="slot-label text-[10px] font-black text-zinc-900 dark:text-zinc-100">{slot.label}</span>
                                    <span className="slot-time text-[8px] font-bold text-zinc-400">{slot.startTime}</span>
                                  </div>
                                </td>
                                {DAYS.map(day => {
                                  const entry = teacherEntries.find(e => e.day === day && e.periodIndex === pIdx);
                                  const sub = subjects.find(s => s.id === entry?.subjectId);
                                  const sec = sections.find(s => s.id === entry?.sectionId);
                                  const validation = entry ? validationResults[entry.id] : null;

                                  return (
                                    <td 
                                      key={day} 
                                      className={cn(
                                        "p-1 border border-zinc-100 dark:border-zinc-800 h-20 transition-all",
                                        entry ? "bg-white dark:bg-zinc-800" : "bg-zinc-50/20 dark:bg-zinc-900/10"
                                      )}
                                    >
                                      {entry ? (
                                        <div className={cn(
                                          "h-full p-2 rounded-xl border flex flex-col justify-center relative group/cell",
                                          validation?.isValid ? "border-zinc-100 dark:border-zinc-700 shadow-sm" : "bg-rose-50/50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                                        )}>
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color }} />
                                            <span className="subject-name text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase print:whitespace-normal print:break-words">
                                              {sub?.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <LayoutGrid size={8} className="text-zinc-400 print:hidden" />
                                            <span className="section-name text-[9px] font-bold text-zinc-400 uppercase print:text-zinc-900 print:whitespace-normal print:break-words">
                                              {sec?.name}
                                            </span>
                                          </div>
                                          
                                          {!validation?.isValid && (
                                            <>
                                              <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                <ShieldAlert size={12} className="text-rose-500" />
                                              </div>
                                              {/* Tooltip for teacher view */}
                                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-zinc-900 dark:bg-zinc-950 text-white text-[9px] rounded-xl opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all duration-300 z-50 shadow-2xl border border-gold-500/30 backdrop-blur-md translate-y-2 group-hover/cell:translate-y-0">
                                                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
                                                  <ShieldAlert size={10} className="text-rose-500" />
                                                  <p className="font-black uppercase tracking-widest text-gold-500">Violations</p>
                                                </div>
                                                <ul className="space-y-1.5">
                                                  {validation?.errors.map((err, i) => (
                                                    <li key={i} className="flex items-start gap-1.5 text-zinc-300">
                                                      <div className="w-1 h-1 rounded-full bg-rose-500 mt-1 shrink-0" />
                                                      {err}
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center opacity-10">
                                          <div className="w-1 h-1 rounded-full bg-zinc-300" />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Stats */}
                      <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xl font-black text-zinc-900 dark:text-white">{teacherEntries.length}</p>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Total Periods</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-zinc-900 dark:text-white">
                            {Array.from(new Set(teacherEntries.map(e => e.sectionId))).length}
                          </p>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Classes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-black text-rose-500">
                            {teacherEntries.filter(e => !validationResults[e.id]?.isValid).length}
                          </p>
                          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Conflicts</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: Subject Palette */}
          <div className="space-y-6 sticky top-24 print:hidden">
            <Card className="p-6 royal-shadow border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gold-50 dark:bg-gold-900/20 rounded-lg flex items-center justify-center text-gold-500">
                  <Crown size={16} />
                </div>
                <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Subject Palette</h3>
              </div>

              <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                {selectedSection?.assignments.map(assignment => {
                  const subject = subjects.find(s => s.id === assignment.subjectId);
                  const teacher = teachers.find(t => t.id === assignment.teacherId);
                  if (!subject || !teacher) return null;

                  const assignedCount = entries.filter(e => 
                    e.sectionId === selectedSectionId && e.subjectId === subject.id
                  ).length;
                  const remaining = subject.maxPeriodsPerWeek - assignedCount;

                  return (
                    <div key={assignment.subjectId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">
                          {remaining} / {subject.maxPeriodsPerWeek} Left
                        </span>
                        <div className="h-1 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gold-500 transition-all" 
                            style={{ width: `${(assignedCount / subject.maxPeriodsPerWeek) * 100}%` }} 
                          />
                        </div>
                      </div>
                      <DraggableSubject 
                        subject={subject} 
                        teacher={teacher} 
                        id={`palette-${subject.id}`} 
                      />
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Legend / Stats */}
            <Card className="p-6 bg-zinc-900 dark:bg-gold-950 text-white royal-shadow border-none overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-300 mb-4">Architecture Stats</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-2xl font-black text-white">{entries.filter(e => e.sectionId === selectedSectionId).length}</p>
                    <p className="text-[9px] font-bold text-gold-300/60 uppercase tracking-wider">Total Periods Assigned</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
                <Crown size={120} />
              </div>
            </Card>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeId && activeData && (
            <div className={cn(
              "flex flex-col p-3 rounded-xl border-2 shadow-2xl scale-105 rotate-2 backdrop-blur-md transition-all",
              "bg-white/90 dark:bg-zinc-900/90 border-gold-500/50",
              previewValidation?.results[previewValidation.targetEntryId]?.isValid === false && "border-rose-500/50 bg-rose-50/90 dark:bg-rose-900/90",
              activeData.type === 'grid-entry' ? "w-48" : "w-56"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeData.subject?.color }} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white truncate">
                  {activeData.subject?.name}
                </span>
                {previewValidation?.results[previewValidation.targetEntryId]?.isValid === false && (
                  <Badge variant="error" className="ml-auto text-[8px] px-1 py-0">Conflict</Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                <User size={12} />
                {activeData.teacher?.name}
              </div>
              
              {overData && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Target</span>
                  <span className="text-[9px] font-black text-gold-600 dark:text-gold-400">
                    {overData.day} • Period {overData.periodIndex + 1}
                  </span>
                </div>
              )}

              {previewValidation?.results[previewValidation.targetEntryId]?.errors.map((err: string, i: number) => (
                <div key={i} className="mt-2 flex items-start gap-1.5 text-[9px] text-rose-600 dark:text-rose-400 leading-tight">
                  <AlertCircle size={10} className="shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>

    <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, aside, header, .sticky, .fixed, .no-print, button, .xl\\:col-span-4 {
            display: none !important;
          }
          #timetable-container {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 15pt !important;
            border-bottom: 2pt solid black !important;
            padding-bottom: 5pt !important;
            text-align: center !important;
          }
          .print-header h1 {
            font-size: 18pt !important;
            font-weight: bold !important;
            color: black !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            border: 2pt solid black !important;
            margin-bottom: 10pt !important;
          }
          th, td {
            border: 1pt solid black !important;
            padding: 8pt !important;
            text-align: center !important;
            vertical-align: middle !important;
            font-size: 10pt !important;
            word-wrap: break-word !important;
            overflow: visible !important;
            min-height: 40pt !important;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            font-size: 10pt !important;
          }
          .teacher-name, .subject-name, .section-name {
            display: block !important;
            font-weight: bold !important;
            line-height: 1.3 !important;
          }
          .teacher-name {
            font-size: 9pt !important;
            font-weight: normal !important;
            margin-top: 4pt !important;
            color: #333 !important;
          }
          .subject-name {
            font-size: 11pt !important;
          }
          .truncate {
            overflow: visible !important;
            white-space: normal !important;
            text-overflow: clip !important;
          }
          .slot-label {
            font-size: 10pt !important;
            font-weight: bold !important;
            color: black !important;
          }
          .slot-time {
            font-size: 8pt !important;
            color: #666 !important;
            display: block !important;
          }
          .teacher-card .print-header h2 {
            font-size: 16pt !important;
            font-weight: bold !important;
            margin: 0 !important;
            color: black !important;
          }
          .teacher-card {
            page-break-after: always !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
          }
        }

        /* Export specific styles - Strictly Minimal Black & White */
        .exporting-pdf {
          width: 1200px !important;
          background: #ffffff !important;
          color: #000000 !important;
          padding: 0 !important;
          font-family: 'Inter', sans-serif !important;
        }
        .exporting-pdf * {
          color: #000000 !important;
          background-color: transparent !important;
          border-color: #000000 !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }
        .exporting-pdf .print-header {
          display: block !important;
          margin-bottom: 20px !important;
          border-bottom: 2px solid black !important;
          padding-bottom: 10px !important;
          text-align: center !important;
        }
        .exporting-pdf .print-header h1 {
          font-size: 20pt !important;
          font-weight: bold !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .exporting-pdf .no-print, 
        .exporting-pdf .print-hidden-element,
        .exporting-pdf .entry-controls,
        .exporting-pdf .violation-error,
        .exporting-pdf .tooltip,
        .exporting-pdf .badge,
        .exporting-pdf .print\\:hidden,
        .exporting-pdf .xl\\:col-span-4,
        .exporting-pdf .sticky {
          display: none !important;
        }
        .exporting-pdf .grid {
          display: block !important;
        }
        .exporting-pdf .xl\\:col-span-3 {
          width: 100% !important;
          grid-column: span 4 / span 4 !important;
        }
        .exporting-pdf table {
          width: 100% !important;
          border-collapse: collapse !important;
          border: 1px solid #000000 !important;
          table-layout: fixed !important;
        }
        .exporting-pdf th, .exporting-pdf td {
          border: 1px solid #000000 !important;
          padding: 10px !important;
          text-align: center !important;
          font-size: 10pt !important;
          vertical-align: middle !important;
          background: white !important;
        }
        .exporting-pdf th {
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          font-size: 9pt !important;
        }
        .exporting-pdf .subject-name {
          font-size: 11pt !important;
          font-weight: bold !important;
          display: block !important;
        }
        .exporting-pdf .teacher-name {
          font-size: 9pt !important;
          font-weight: normal !important;
          display: block !important;
          margin-top: 4px !important;
        }
        .exporting-pdf .truncate {
          overflow: visible !important;
          white-space: normal !important;
          text-overflow: clip !important;
          display: block !important;
          word-break: break-word !important;
        }
        .exporting-pdf .teacher-name,
        .exporting-pdf .subject-name,
        .exporting-pdf .section-name {
          white-space: normal !important;
          overflow: visible !important;
          display: block !important;
          word-break: break-word !important;
          line-height: 1.2 !important;
        }
        .exporting-pdf .slot-label {
          font-size: 10pt !important;
          font-weight: bold !important;
          display: block !important;
        }
        .exporting-pdf .slot-time {
          font-size: 8pt !important;
          color: #666 !important;
          display: block !important;
        }
        .exporting-pdf .teacher-card {
          page-break-after: always !important;
          border: 1px solid #000 !important;
          padding: 20px !important;
          margin-bottom: 20px !important;
          background: white !important;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};
