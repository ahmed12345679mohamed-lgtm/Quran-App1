
export enum Grade {
  EXCELLENT = 'ممتاز',
  VERY_GOOD = 'جيد جداً',
  GOOD = 'جيد',
  ACCEPTABLE = 'مقبول',
  NEEDS_WORK = 'يحتاج إعادة',
}

export type AssignmentType = 'SURAH' | 'JUZ' | 'RANGE';

export interface QuranAssignment {
  type: AssignmentType;
  name: string;
  endName?: string;
  ayahFrom: number;
  ayahTo: number;
  juzNumber?: number;
  grade: Grade;
}

export interface Attendance {
  arrivalTime: string;
  departureTime?: string;
}

// --- NEW STRUCTURE FOR MULTIPLE QUESTIONS ---
export interface QuizItem {
  id: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
}

export interface AdabSession {
  title: string; // e.g. "Lesson Topic"
  quizzes: QuizItem[]; // Array of questions
}
// --------------------------------------------

export interface DailyLog {
  id: string;
  date: string;
  isAbsent?: boolean; 
  isAdab?: boolean; 
  
  adabSession?: AdabSession; // Now holds multiple questions
  parentQuizScore?: number; // Store score (e.g., 3 out of 5)
  parentQuizMax?: number; 
  
  jadeed?: QuranAssignment; 
  murajaah?: QuranAssignment[]; 
  attendance?: Attendance;
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
  title: string; // e.g., "درس رياضيات", "نوم", "مدرسة"
  time: string;  // e.g., "14:00"
}

export interface WeeklySchedule {
  day: string; 
  events: CalendarEvent[]; // Changed from simple expectedTime to list of events
  isDayOff?: boolean; // Flag if the student is completely off/busy
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
  calculatorNotes?: string; // New field for calculator notes
  isFeeOverdue?: boolean; // NEW: Flag for manual fee reminder
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