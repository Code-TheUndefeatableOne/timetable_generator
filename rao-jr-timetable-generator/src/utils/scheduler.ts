import { Day, Subject, Teacher, Section, TimetableEntry, SyncConstraint, ValidationResult, GradeStructure } from '../types';

export const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function validateTimetable(
  entries: TimetableEntry[],
  subjects: Subject[],
  teachers: Teacher[],
  sections: Section[],
  syncConstraints: SyncConstraint[],
  gradeStructures: GradeStructure[]
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  // Helper to convert time string to minutes from midnight
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Initialize results for each entry
  entries.forEach(entry => {
    results[entry.id] = { isValid: true, errors: [], warnings: [] };
  });

  // 1. Teacher Overlap Check (Time-based)
  const teacherTimeSlots: Record<string, { day: Day, start: number, end: number, entryId: string }[]> = {};
  
  entries.forEach(entry => {
    const section = sections.find(s => s.id === entry.sectionId);
    const structure = gradeStructures.find(g => g.id === section?.gradeId);
    if (!structure) return;

    const periodSlots = structure.slots.filter(s => s.type === 'period');
    const slot = periodSlots[entry.periodIndex];
    if (!slot) return;

    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);

    if (!teacherTimeSlots[entry.teacherId]) teacherTimeSlots[entry.teacherId] = [];
    
    // Check for overlap with existing slots for this teacher on the same day
    teacherTimeSlots[entry.teacherId].forEach(existing => {
      if (existing.day === entry.day) {
        // Overlap condition: (start1 < end2) && (start2 < end1)
        if (start < existing.end && existing.start < end) {
          // Check if this overlap is actually a synchronized period
          const isSynchronized = syncConstraints.some(sync => 
            sync.day === entry.day && 
            sync.periodIndex === entry.periodIndex &&
            sync.sectionIds.includes(entry.sectionId) &&
            sync.sectionIds.includes(entries.find(e => e.id === existing.entryId)?.sectionId || '')
          );

          if (!isSynchronized) {
            results[entry.id].isValid = false;
            results[entry.id].errors.push(`Teacher overlap: Conflict with another class at ${slot.startTime}-${slot.endTime}.`);
            results[existing.entryId].isValid = false;
            results[existing.entryId].errors.push(`Teacher overlap: Conflict with another class.`);
          }
        }
      }
    });

    teacherTimeSlots[entry.teacherId].push({ day: entry.day, start, end, entryId: entry.id });
  });

  // 2. Subject Constraints (Max per day/week, Back-to-back)
  sections.forEach(section => {
    const sectionEntries = entries.filter(e => e.sectionId === section.id);
    
    subjects.forEach(subject => {
      const subjectEntries = sectionEntries.filter(e => e.subjectId === subject.id);
      
      // Weekly limit
      if (subjectEntries.length > subject.maxPeriodsPerWeek) {
        subjectEntries.forEach(e => {
          results[e.id].isValid = false;
          results[e.id].errors.push(`Weekly limit exceeded for ${subject.name} (${subjectEntries.length}/${subject.maxPeriodsPerWeek})`);
        });
      }

      // Daily limit & Back-to-back
      DAYS.forEach(day => {
        const dayEntries = subjectEntries.filter(e => e.day === day).sort((a, b) => a.periodIndex - b.periodIndex);
        
        if (dayEntries.length > subject.maxPeriodsPerDay) {
          dayEntries.forEach(e => {
            results[e.id].isValid = false;
            results[e.id].errors.push(`Daily limit exceeded for ${subject.name} (${dayEntries.length}/${subject.maxPeriodsPerDay})`);
          });
        }

        if (!subject.allowBackToBack && dayEntries.length > 1) {
          for (let i = 0; i < dayEntries.length - 1; i++) {
            if (dayEntries[i + 1].periodIndex === dayEntries[i].periodIndex + 1) {
              results[dayEntries[i].id].isValid = false;
              results[dayEntries[i].id].errors.push(`Back-to-back periods not allowed for ${subject.name}`);
              results[dayEntries[i+1].id].isValid = false;
              results[dayEntries[i+1].id].errors.push(`Back-to-back periods not allowed for ${subject.name}`);
            }
          }
        }
      });
    });
  });

  // 3. Synchronized Periods
  syncConstraints.forEach(sync => {
    const relevantEntries = entries.filter(e => 
      sync.sectionIds.includes(e.sectionId) && 
      e.day === sync.day && 
      e.periodIndex === sync.periodIndex
    );

    relevantEntries.forEach(e => {
      if (e.subjectId !== sync.subjectId) {
        results[e.id].isValid = false;
        results[e.id].errors.push(`Synchronization violation: Should be ${subjects.find(s => s.id === sync.subjectId)?.name}`);
      }
    });
  });

  // 4. Teacher Availability
  entries.forEach(entry => {
    const teacher = teachers.find(t => t.id === entry.teacherId);
    if (teacher?.unavailableSlots?.some(slot => slot.day === entry.day && slot.periodIndex === entry.periodIndex)) {
      results[entry.id].isValid = false;
      results[entry.id].errors.push(`Teacher availability: ${teacher.name} is not available at this time.`);
    }
  });

  return results;
}

// Robust global scheduler with conflict avoidance
export function autoGenerateTimetable(
  subjects: Subject[],
  teachers: Teacher[],
  sections: Section[],
  gradeStructures: Record<string, GradeStructure>,
  syncConstraints: SyncConstraint[],
  existingEntries: TimetableEntry[] = [],
  targetSectionId?: string
): TimetableEntry[] {
  // If targetSectionId is provided, we keep entries for other sections
  let entries: TimetableEntry[] = targetSectionId 
    ? [...existingEntries.filter(e => e.sectionId !== targetSectionId)]
    : [];

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Helper to check if a teacher is busy at a specific time
  const isTeacherBusy = (teacherId: string, day: Day, periodIndex: number, sectionId: string, currentEntries: TimetableEntry[]) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher?.unavailableSlots?.some(slot => slot.day === day && slot.periodIndex === periodIndex)) {
      return true;
    }

    const section = sections.find(s => s.id === sectionId);
    const structure = gradeStructures[section?.gradeId || ''];
    if (!structure) return false;
    const slot = structure.slots.filter(s => s.type === 'period')[periodIndex];
    if (!slot) return false;

    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);

    return currentEntries.some(e => {
      if (e.teacherId !== teacherId || e.day !== day) return false;
      
      // Check if this overlap is actually a synchronized period
      const isSynchronized = syncConstraints.some(sync => 
        sync.day === day && 
        sync.periodIndex === periodIndex &&
        sync.sectionIds.includes(sectionId) &&
        sync.sectionIds.includes(e.sectionId)
      );
      if (isSynchronized) return false;

      const otherSection = sections.find(s => s.id === e.sectionId);
      const otherStructure = gradeStructures[otherSection?.gradeId || ''];
      if (!otherStructure) return false;
      const otherSlot = otherStructure.slots.filter(s => s.type === 'period')[e.periodIndex];
      if (!otherSlot) return false;

      const oStart = timeToMinutes(otherSlot.startTime);
      const oEnd = timeToMinutes(otherSlot.endTime);

      return start < oEnd && oStart < end;
    });
  };

  const sectionsToProcess = targetSectionId 
    ? sections.filter(s => s.id === targetSectionId)
    : sections;

  // 1. Pre-fill Sync Constraints
  syncConstraints.forEach(sync => {
    sync.sectionIds.forEach(sectionId => {
      if (!sectionsToProcess.some(s => s.id === sectionId)) return;
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;
      const assignment = section.assignments.find(a => a.subjectId === sync.subjectId);
      if (!assignment) return;
      if (entries.some(e => e.sectionId === sectionId && e.day === sync.day && e.periodIndex === sync.periodIndex)) return;

      entries.push({
        id: `sync-${Math.random().toString(36).substr(2, 9)}`,
        sectionId,
        day: sync.day,
        periodIndex: sync.periodIndex,
        subjectId: sync.subjectId,
        teacherId: assignment.teacherId
      });
    });
  });

  // 2. Global Placement Strategy
  let bestGlobalEntries: TimetableEntry[] = [...entries];
  let minErrors = Infinity;

  // Heuristic: Most constrained assignments first
  const teacherTotalLoad: Record<string, number> = {};
  sections.forEach(s => s.assignments.forEach(a => {
    const sub = subjects.find(sub => sub.id === a.subjectId);
    if (sub) teacherTotalLoad[a.teacherId] = (teacherTotalLoad[a.teacherId] || 0) + sub.maxPeriodsPerWeek;
  }));

  const allAssignments: { sectionId: string, subjectId: string, teacherId: string, sub: Subject, difficulty: number }[] = [];
  sectionsToProcess.forEach(section => {
    section.assignments.forEach(a => {
      if (!section.subjectIds.includes(a.subjectId)) return;
      const sub = subjects.find(s => s.id === a.subjectId);
      if (!sub) return;
      
      const filledBySync = entries.filter(e => e.sectionId === section.id && e.subjectId === a.subjectId).length;
      const remaining = sub.maxPeriodsPerWeek - filledBySync;
      
      if (remaining > 0) {
        const difficulty = (sub.maxPeriodsPerWeek / sub.maxPeriodsPerDay) * (teacherTotalLoad[a.teacherId] || 1);
        for (let i = 0; i < remaining; i++) {
          allAssignments.push({ ...a, sectionId: section.id, sub, difficulty });
        }
      }
    });
  });

  // Try multiple global attempts
  for (let attempt = 0; attempt < 30; attempt++) {
    let currentEntries = [...entries];
    
    // Group by section and subject to handle back-to-back
    const groupedAssignments: Record<string, typeof allAssignments> = {};
    allAssignments.forEach(a => {
      const key = `${a.sectionId}-${a.subjectId}`;
      if (!groupedAssignments[key]) groupedAssignments[key] = [];
      groupedAssignments[key].push(a);
    });

    // Sort groups by difficulty
    const sortedKeys = Object.keys(groupedAssignments).sort((a, b) => {
      const diffA = groupedAssignments[a][0].difficulty;
      const diffB = groupedAssignments[b][0].difficulty;
      return diffB - diffA || Math.random() - 0.5;
    });

    let failedToPlace = 0;

    sortedKeys.forEach(key => {
      const items = groupedAssignments[key];
      const { sectionId, subjectId, teacherId, sub } = items[0];
      const structure = gradeStructures[sections.find(s => s.id === sectionId)?.gradeId || ''];
      if (!structure) return;
      const periodSlots = structure.slots.filter(s => s.type === 'period');

      const dayUsage: Record<Day, number> = { 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0 };
      currentEntries.filter(e => e.sectionId === sectionId && e.subjectId === subjectId).forEach(e => dayUsage[e.day]++);

      let itemsToPlace = [...items];
      while (itemsToPlace.length > 0) {
        let placed = false;
        const sortedDays = [...DAYS].sort((a, b) => {
          if (dayUsage[a] !== dayUsage[b]) return dayUsage[a] - dayUsage[b];
          const loadA = currentEntries.filter(e => e.sectionId === sectionId && e.day === a).length;
          const loadB = currentEntries.filter(e => e.sectionId === sectionId && e.day === b).length;
          return loadA - loadB || Math.random() - 0.5;
        });

        for (const day of sortedDays) {
          if (placed) break;
          if (dayUsage[day] >= sub.maxPeriodsPerDay) continue;

          const freeSlots = periodSlots.map((_, i) => i).filter(pIdx => 
            !currentEntries.some(e => e.sectionId === sectionId && e.day === day && e.periodIndex === pIdx) &&
            !isTeacherBusy(teacherId, day, pIdx, sectionId, currentEntries)
          );

          if (freeSlots.length === 0) continue;

          // Diversity Heuristic: Only try back-to-back if allowed AND based on a "shuffle" probability
          // This prevents "hectic torture" of having every multi-period subject as a block.
          const neededToday = Math.min(itemsToPlace.length, sub.maxPeriodsPerDay - dayUsage[day]);
          const shouldTryBlock = sub.allowBackToBack && neededToday > 1 && Math.random() > 0.6;

          if (shouldTryBlock) {
            for (let i = 0; i <= freeSlots.length - neededToday; i++) {
              const candidateSlots = freeSlots.slice(i, i + neededToday);
              const isContinuous = candidateSlots.every((val, idx) => idx === 0 || val === candidateSlots[idx - 1] + 1);
              if (isContinuous) {
                candidateSlots.forEach(pIdx => {
                  currentEntries.push({
                    id: `auto-${Math.random().toString(36).substr(2, 9)}`,
                    sectionId, day, periodIndex: pIdx, subjectId, teacherId
                  });
                });
                dayUsage[day] += neededToday;
                itemsToPlace = itemsToPlace.slice(neededToday);
                placed = true;
                break;
              }
            }
          }

          if (!placed && freeSlots.length > 0) {
            const pIdx = freeSlots[Math.floor(Math.random() * freeSlots.length)];
            currentEntries.push({
              id: `auto-${Math.random().toString(36).substr(2, 9)}`,
              sectionId, day, periodIndex: pIdx, subjectId, teacherId
            });
            dayUsage[day]++;
            itemsToPlace = itemsToPlace.slice(1);
            placed = true;
          }
        }

        if (!placed) {
          failedToPlace += itemsToPlace.length;
          itemsToPlace = [];
        }
      }
    });

    if (failedToPlace < minErrors) {
      minErrors = failedToPlace;
      bestGlobalEntries = currentEntries;
    }
    if (minErrors === 0) break;
  }

  return bestGlobalEntries;
}
