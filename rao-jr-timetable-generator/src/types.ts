
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface Subject {
  id: string;
  name: string;
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  allowBackToBack: boolean;
  color: string;
}

export interface Teacher {
  id: string;
  name: string;
  specializations: string[]; // Subject IDs
  unavailableSlots?: { day: Day; periodIndex: number }[];
}

export interface TimeSlot {
  id: string;
  type: 'period' | 'break';
  label: string;
  startTime: string;
  endTime: string;
}

export interface GradeStructure {
  id: string;
  name: string;
  slots: TimeSlot[];
}

export interface Section {
  id: string;
  gradeId: string;
  name: string;
  subjectIds: string[];
  assignments: {
    subjectId: string;
    teacherId: string;
  }[];
}

export interface TimetableEntry {
  id: string;
  sectionId: string;
  day: Day;
  periodIndex: number;
  subjectId: string;
  teacherId: string;
}

export interface SyncConstraint {
  id: string;
  sectionIds: string[];
  day: Day;
  periodIndex: number;
  subjectId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
