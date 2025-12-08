
export enum Grade {
  EXCELLENT = 'ممتاز',
  VERY_GOOD = 'جيد جداً',
  GOOD = 'جيد',
  ACCEPTABLE = 'مقبول',
  NEEDS_WORK = 'يحتاج إعادة',
}

export type AssignmentType = 'SURAH' | 'JUZ' | 'RANGE' | 'MULTI';

export interface QuranAssignment {
  type: AssignmentType;
  name: string;
  endName?: string;
  ayahFrom: number;
  ayahTo: number;
  juzNumber?: number;
  multiSurahs?: string[]; // For MULTI type
  grade: Grade;
}

// --- UPDATED ATTENDANCE STRUCTURE ---
export interface AttendanceRecord {
  id: string;
  arrival: string;
  departure?: string;
}
// ------------------------------------

export interface QuizItem {
  id: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export interface AdabSession {
  title: string; 
  quizzes: QuizItem[]; 
}

export interface DailyLog {
  id: string;
  date: string;
  isAbsent?: boolean; 
  isAdab?: boolean; 
  
  adabSession?: AdabSession; 
  parentQuizScore?: number; 
  parentQuizMax?: number; 
  
  jadeed?: QuranAssignment; 
  murajaah?: QuranAssignment[]; 
  attendance?: AttendanceRecord[]; // Changed to array
  notes?: string;
  teacherId: string;
  teacherName: string;
  seenByParent: boolean;
  seenAt?: string;
}

export interface Payment {
  id: string;
  title: string; 
  amount: number;
  date: string;
  recordedBy: string; 
  notes?: string; 
}

export interface CalendarEvent {
  id: string;
  title: string; 
  time: string;  
}

export interface WeeklySchedule {
  day: string; 
  events: CalendarEvent[]; 
  isDayOff?: boolean; 
}

export interface Student {
  id: string;
  teacherId: string; 
  name: string;
  parentCode: string; 
  parentPhone?: string; 
  logs: DailyLog[];
  payments: Payment[];
  weeklySchedule: WeeklySchedule[];
  nextPlan?: { 
    jadeed: QuranAssignment;
    murajaah: QuranAssignment[];
  }; 
  calculatorNotes?: string; 
  isFeeOverdue?: boolean; 
}

export interface Teacher {
  id: string;
  name: string;
  loginCode: string; 
}

export type AnnouncementType = 'EXAM' | 'COMPETITION' | 'GENERAL';

export interface Announcement {
  id: string;
  teacherId: string;
  teacherName: string;
  content: string;
  date: string;
  type: AnnouncementType;
}

export type UserRole = 'TEACHER' | 'PARENT' | 'ADMIN' | 'GUEST';

export interface AppState {
  students: Student[];
  teachers: Teacher[];
  announcements: Announcement[];
  currentUser: {
    role: UserRole;
    id?: string; 
    name?: string; 
  };
}
