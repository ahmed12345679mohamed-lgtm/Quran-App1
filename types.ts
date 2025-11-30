
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
  name: string; // Surah Name or Juz Name
  endName?: string; // For RANGE type: The ending Surah
  ayahFrom: number;
  ayahTo: number;
  grade: Grade;
}

export interface Attendance {
  arrivalTime: string; // "16:00"
  departureTime?: string; // "18:00"
}

export interface DailyLog {
  id: string;
  date: string; // ISO string
  isAbsent?: boolean; // New: Flag for absence
  jadeed?: QuranAssignment; // Optional because if absent, no jadeed
  murajaah?: QuranAssignment[]; // Optional
  attendance?: Attendance;
  notes?: string;
  teacherId: string;
  teacherName: string;
  seenByParent: boolean;
  seenAt?: string;
}

export interface Payment {
  id: string;
  title: string; // e.g., "رسوم شهر يناير"
  amount: number;
  date: string;
  recordedBy: string; // Teacher Name
  notes?: string; // Added notes
}

export interface WeeklySchedule {
  day: string; // "السبت", "الأحد"...
  expectedTime: string; // "15:30"
  isActive: boolean;
}

export interface Student {
  id: string;
  teacherId: string; // LINK TO SPECIFIC TEACHER
  name: string;
  parentCode: string; // Simple login for parents
  parentPhone?: string; // Captured at login
  logs: DailyLog[];
  payments: Payment[];
  weeklySchedule: WeeklySchedule[];
  nextPlan?: { // Changed from simple Assignment to complex Plan
    jadeed: QuranAssignment;
    murajaah: QuranAssignment[];
  }; 
}

export interface Teacher {
  id: string;
  name: string;
  loginCode: string; // Special access code assigned by admin
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
    id?: string; // Teacher ID or Student ID
    name?: string; // Display name
  };
}
