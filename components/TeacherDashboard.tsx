
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, DailyLog, Grade, QuranAssignment, Announcement, Payment, QuizItem, Teacher, AttendanceRecord, MultiSurahDetail, ExamDayDetail, AdabSession } from '../types';
import { SURAH_NAMES, JUZ_LIST, SURAH_DATA, formatDateDual, formatTime12Hour, formatSimpleDate, formatDateWithDay } from '../constants';
import { Button } from './Button';
import { TimePicker } from './TimePicker';
import { generateEncouragement } from '../services/geminiService';

interface TeacherDashboardProps {
  teacherName: string;
  teacherId: string;
  students: Student[];
  allTeachers?: Teacher[];
  announcements: Announcement[];
  adabArchive: AdabSession[];
  onUpdateStudent: (student: Student) => void;
  onAddStudent: (name: string, code: string) => Promise<Student> | Student; 
  onDeleteStudents: (ids: string[]) => void;
  onMarkAbsences: (absentIds: string[], excusedIds: string[]) => void; // Updated signature
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onPublishAdab: (title: string, quizzes: QuizItem[]) => void;
  onEditAdab: (sessionId: string, title: string, quizzes: QuizItem[]) => void;
  onDeleteAdab: (sessionId: string) => void;
  onQuickAnnouncement: (type: 'ADAB' | 'HOLIDAY', payload?: any) => void;
}

const emptyAssignment: QuranAssignment = {
  type: 'SURAH',
  name: SURAH_NAMES[0],
  ayahFrom: 1,
  ayahTo: 7,
  grade: Grade.GOOD,
  multiSurahs: []
};

interface AssignmentFormProps {
  data: QuranAssignment;
  onChange: (field: keyof QuranAssignment, val: any) => void;
  title: string;
  colorClass: string;
  canRemove?: boolean;
  onRemove?: () => void;
  hideGrade?: boolean;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ 
  data, onChange, title, colorClass, canRemove, onRemove, hideGrade
}) => {
  const isSurah = data.type === 'SURAH';
  const isRange = data.type === 'RANGE';
  const isMulti = data.type === 'MULTI';

  const maxAyahs = useMemo(() => {
    if (isSurah) {
      const s = SURAH_DATA.find(x => x.name === data.name);
      return s ? s.count : 286;
    }
    return 286;
  }, [data.name, isSurah]);

  const ayahOptions = useMemo(() => Array.from({ length: maxAyahs }, (_, i) => i + 1), [maxAyahs]);

  const handleAddMultiSurah = () => {
      const currentList = data.multiSurahs || [];
      onChange('multiSurahs', [...currentList, { name: SURAH_NAMES[0], grade: undefined }]);
  };

  const handleUpdateMultiSurah = (index: number, field: keyof MultiSurahDetail, val: any) => {
      const currentList = [...(data.multiSurahs || [])];
      currentList[index] = { ...currentList[index], [field]: val };
      onChange('multiSurahs', currentList);
  };

  const handleRemoveMultiSurah = (index: number) => {
      const currentList = [...(data.multiSurahs || [])];
      currentList.splice(index, 1);
      onChange('multiSurahs', currentList);
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClass} mb-3 relative animate-fade-in`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-gray-700">{title}</h4>
        {canRemove && (
          <button onClick={onRemove} className="text-red-500 hover:text-red-700 text-sm font-bold bg-white px-2 py-1 rounded shadow-sm">
             حذف ✖
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 mb-3">
        {['SURAH', 'RANGE', 'JUZ', 'MULTI'].map(type => (
          <button
            key={type}
            className={`py-1 px-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${data.type === type ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}
            onClick={() => onChange('type', type)}
          >
            {type === 'SURAH' ? 'سورة' : type === 'RANGE' ? 'نطاق' : type === 'JUZ' ? 'جزء' : 'متعدد'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {data.type === 'JUZ' ? (
           <select 
             className="w-full p-2 border rounded-lg bg-white"
             value={data.juzNumber || 1}
             onChange={(e) => {
                 onChange('juzNumber', parseInt(e.target.value));
                 onChange('name', JUZ_LIST[parseInt(e.target.value) - 1]);
             }}
           >
             {JUZ_LIST.map((j, i) => <option key={i} value={i+1}>{j}</option>)}
           </select>
        ) : isMulti ? (
            <div className="bg-white p-2 rounded-lg border border-gray-200">
                <p className="text-[10px] text-gray-400 mb-2">اختر السور المتفرقة مع التقدير:</p>
                <div className="space-y-2 mb-2">
                    {(data.multiSurahs || []).map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0">
                            <div className="flex gap-2 items-center">
                                <span className="text-xs font-bold w-4 text-gray-500">{idx + 1}.</span>
                                <select 
                                    className="flex-1 p-2 border rounded text-sm"
                                    value={item.name}
                                    onChange={(e) => handleUpdateMultiSurah(idx, 'name', e.target.value)}
                                >
                                    {SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button onClick={() => handleRemoveMultiSurah(idx)} className="text-red-500 font-bold px-2 bg-red-50 rounded">×</button>
                            </div>
                            {!hideGrade && (
                                <div className="flex items-center gap-2 mr-6">
                                    <span className="text-[10px] text-gray-400">التقدير:</span>
                                    <select
                                        className={`flex-1 p-1 border rounded text-xs font-bold ${item.grade === Grade.EXCELLENT ? 'text-emerald-600' : item.grade === Grade.NEEDS_WORK ? 'text-red-600' : 'text-gray-700'}`}
                                        value={item.grade || ''}
                                        onChange={(e) => handleUpdateMultiSurah(idx, 'grade', e.target.value)}
                                    >
                                        <option value="">-- اختر --</option>
                                        {Object.values(Grade).map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={handleAddMultiSurah} className="w-full py-1 text-xs border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50">+ إضافة سورة أخرى</button>
            </div>
        ) : (
          <>
            <div className="flex gap-2">
               <div className="flex-1">
                 <label className="text-[10px] font-bold text-gray-500 block mb-1">من سورة</label>
                 <select 
                   className="w-full p-2 border rounded-lg bg-white text-sm"
                   value={data.name}
                   onChange={(e) => onChange('name', e.target.value)}
                 >
                   {SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>
               {isRange && (
                 <div className="flex-1">
                   <label className="text-[10px] font-bold text-gray-500 block mb-1">إلى سورة</label>
                   <select 
                     className="w-full p-2 border rounded-lg bg-white text-sm"
                     value={data.endName || data.name}
                     onChange={(e) => onChange('endName', e.target.value)}
                   >
                     {SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
               )}
            </div>

            {isSurah && (
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                 <div className="flex-1">
                    <label className="text-[10px] text-gray-400 block mb-0.5">من آية</label>
                    <select
                        className="w-full p-1 border rounded text-center font-bold bg-gray-50"
                        value={data.ayahFrom}
                        onChange={(e) => onChange('ayahFrom', parseInt(e.target.value))}
                    >
                        {ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                 </div>
                <span className="text-gray-400 mt-4">إلى</span>
                <div className="flex-1">
                    <label className="text-[10px] text-gray-400 block mb-0.5">إلى آية</label>
                    <select
                        className="w-full p-1 border rounded text-center font-bold bg-gray-50"
                        value={data.ayahTo}
                        onChange={(e) => onChange('ayahTo', parseInt(e.target.value))}
                    >
                         {ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
              </div>
            )}
          </>
        )}

        {!hideGrade && !isMulti && (
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1">التقييم</label>
            <select
                className="w-full p-2 border rounded-lg bg-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                value={data.grade}
                onChange={(e) => onChange('grade', e.target.value)}
            >
                {Object.values(Grade).map(g => (
                    <option key={g} value={g}>{g}</option>
                ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

// --- TAB BUTTON COMPONENT ---
const TabButton = ({ id, label, icon, isActive, onClick, compact = false }: { id: string, label: string, icon?: string, isActive: boolean, onClick: () => void, compact?: boolean }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all duration-200 shadow-sm border ${
            isActive 
            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow' 
            : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
        } ${compact ? 'text-xs py-2 px-3 flex-shrink-0' : 'text-sm flex-shrink-0 justify-center'}`}
    >
        {icon && <span className={compact ? 'text-base' : 'text-lg'}>{icon}</span>}
        <span className={compact ? 'text-xs font-bold' : 'font-bold'}>{label}</span>
    </button>
);

const ConfirmDeleteButton = ({ label, onConfirm, className }: { label: string, onConfirm: () => void, className?: string }) => {
    const [confirming, setConfirming] = useState(false);

    if (confirming) {
        return (
            <div className="flex gap-2">
                <Button variant="danger" onClick={onConfirm} className={`text-xs px-2 py-1 ${className}`}>تأكيد ✅</Button>
                <Button variant="outline" onClick={() => setConfirming(false)} className={`text-xs px-2 py-1 ${className}`}>إلغاء</Button>
            </div>
        )
    }
    return (
        <Button variant="danger" onClick={() => setConfirming(true)} className={`text-xs px-2 py-1 ${className}`}>{label}</Button>
    )
};

interface DraftState {
    logId: string | null;
    attendance: AttendanceRecord[];
    jadeed: QuranAssignment;
    murajaah: QuranAssignment[];
    notes: string;
    nextJadeed: QuranAssignment;
    nextMurajaah: QuranAssignment[];
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherName,
  teacherId,
  students,
  allTeachers = [],
  announcements,
  adabArchive,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudents,
  onMarkAbsences,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onLogout,
  onShowNotification,
  onPublishAdab,
  onEditAdab,
  onDeleteAdab,
  onQuickAnnouncement
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'ADD' | 'DELETE' | 'ANNOUNCEMENTS' | 'ADAB' | 'ATTENDANCE' | 'STATS'>('LIST');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sortMethod, setSortMethod] = useState<'ALPHABETICAL' | 'CODE'>('ALPHABETICAL');

  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]);

  const [studentTab, setStudentTab] = useState<'LOG' | 'PLAN' | 'ARCHIVE' | 'CALC' | 'SCHEDULE' | 'FEES'>('LOG');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');

  // Adab State
  const [adabTitle, setAdabTitle] = useState('مجلس الآداب');
  const [adabQuestionsList, setAdabQuestionsList] = useState<QuizItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCorrect, setCurrentCorrect] = useState('');
  const [currentWrong1, setCurrentWrong1] = useState('');
  const [currentWrong2, setCurrentWrong2] = useState('');
  const [editingAdabId, setEditingAdabId] = useState<string | null>(null); // For editing mode

  const [announcementType, setAnnouncementType] = useState<'GENERAL' | 'EXAM'>('GENERAL');
  const [announcementText, setAnnouncementText] = useState('');
  const [examTesterId, setExamTesterId] = useState('');
  const [examDays, setExamDays] = useState<ExamDayDetail[]>([]);
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExamDesc, setNewExamDesc] = useState('حفظ');

  const [logDate, setLogDate] = useState(formatSimpleDate(new Date().toISOString()));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([{ id: '1', arrival: '16:00', departure: '18:00' }]);
  const [jadeed, setJadeed] = useState<QuranAssignment>({ ...emptyAssignment });
  const [murajaahList, setMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
  const [notes, setNotes] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  const [nextJadeed, setNextJadeed] = useState<QuranAssignment>({ ...emptyAssignment, grade: Grade.GOOD });
  const [nextMurajaahList, setNextMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment }]);
  
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeMonth, setNewFeeMonth] = useState('يناير');
  const [newFeeNotes, setNewFeeNotes] = useState('');

  const [calcAmount, setCalcAmount] = useState('');
  const [calcWeeklyDays, setCalcWeeklyDays] = useState('3');
  const [calcNotes, setCalcNotes] = useState('');

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhoneVal, setNewPhoneVal] = useState('');

  // Attendance Grid State
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'ABSENT' | 'EXCUSED' | null>>({});
  
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const sortedStudents = useMemo(() => {
      const sorted = [...students];
      if (sortMethod === 'CODE') {
          sorted.sort((a, b) => a.parentCode.localeCompare(b.parentCode));
      } else {
          sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      }
      return sorted;
  }, [students, sortMethod]);

  const unloggedStudents = useMemo(() => {
    const todayStr = new Date().toDateString();
    return students.filter(s => !s.logs.some(l => new Date(l.date).toDateString() === todayStr));
  }, [students]);

  // Use allTeachers directly to allow selecting any teacher (including self)
  const availableTesters = useMemo(() => {
      return allTeachers || [];
  }, [allTeachers]);

  // Reset attendance map when unlogged students change
  useEffect(() => {
      setAttendanceMap({});
  }, [unloggedStudents.length]);

  const toggleStudentStatus = (id: string) => {
      setAttendanceMap(prev => {
          const current = prev[id];
          if (!current) return { ...prev, [id]: 'ABSENT' };
          if (current === 'ABSENT') return { ...prev, [id]: 'EXCUSED' };
          // If EXCUSED, go back to null (Present/Unmarked)
          const next = { ...prev };
          delete next[id];
          return next;
      });
  };

  const handleBatchAttendanceSubmit = () => {
      const absentIds: string[] = [];
      const excusedIds: string[] = [];
      
      Object.entries(attendanceMap).forEach(([id, status]) => {
          if (status === 'ABSENT') absentIds.push(id);
          else if (status === 'EXCUSED') excusedIds.push(id);
      });

      if (absentIds.length === 0 && excusedIds.length === 0) {
          onShowNotification('لم يتم تحديد أي طالب', 'error');
          return;
      }

      onMarkAbsences(absentIds, excusedIds);
      setAttendanceMap({});
  };

  const handleSelectAllAbsent = () => {
      const newMap = { ...attendanceMap };
      unloggedStudents.forEach(s => {
          if (!newMap[s.id]) newMap[s.id] = 'ABSENT';
      });
      setAttendanceMap(newMap);
      onShowNotification('تم تحديد جميع الطلاب غير المسجلين كغياب', 'success');
  };

  // Stats
  const statsData = useMemo(() => {
      const targetDate = new Date(statsDate).toDateString();
      const present = students.filter(s => s.logs.some(l => !l.isAbsent && new Date(l.date).toDateString() === targetDate));
      const absent = students.filter(s => s.logs.some(l => l.isAbsent && new Date(l.date).toDateString() === targetDate));
      return { present, absent };
  }, [students, statsDate]);

  const saveCurrentDraft = (studentId: string) => {
      if (!isDirty) return; 
      const draft: DraftState = {
          logId: currentLogId,
          attendance: attendanceRecords,
          jadeed,
          murajaah: murajaahList,
          notes,
          nextJadeed,
          nextMurajaah: nextMurajaahList
      };
      setDrafts(prev => ({ ...prev, [studentId]: draft }));
  };

  const handleCloseStudent = () => {
      if (selectedStudentId) {
          saveCurrentDraft(selectedStudentId);
      }
      setSelectedStudentId(null);
      setIsEditingPhone(false);
      setIsDirty(false); 
  };

  const handleOpenStudent = (s: Student) => {
    if (selectedStudentId) {
        saveCurrentDraft(selectedStudentId);
    }
    setSelectedStudentId(s.id);
    setStudentTab('LOG'); 
    setIsEditingPhone(false);
    setIsDirty(false); 
    
    if (drafts[s.id]) {
        const draft = drafts[s.id];
        setCurrentLogId(draft.logId);
        setAttendanceRecords(draft.attendance);
        setJadeed(draft.jadeed);
        setMurajaahList(draft.murajaah);
        setNotes(draft.notes);
        setNextJadeed(draft.nextJadeed);
        setNextMurajaahList(draft.nextMurajaah);
        setCalcNotes(s.calculatorNotes || '');
        return;
    }

    const todayStr = new Date().toDateString();
    const existingLog = s.logs.find(l => new Date(l.date).toDateString() === todayStr);

    // AUTO-TRANSFER NEXT PLAN Logic
    // If no log exists for today, we populate "Jadeed" and "Murajaah" from "Next Plan"
    if (existingLog && !existingLog.isAbsent && !existingLog.isAdab) {
        // Editing existing log
        setCurrentLogId(existingLog.id);
        setJadeed(existingLog.jadeed || { ...emptyAssignment });
        setMurajaahList(existingLog.murajaah || [{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
        setNotes(existingLog.notes || '');
        if (existingLog.attendance && existingLog.attendance.length > 0) {
            setAttendanceRecords(existingLog.attendance);
        } else {
             // @ts-ignore
            if (existingLog.attendance && existingLog.attendance.arrivalTime) {
                 // @ts-ignore
                setAttendanceRecords([{ id: '1', arrival: existingLog.attendance.arrivalTime, departure: existingLog.attendance.departureTime }]);
            } else {
                setAttendanceRecords([{ id: '1', arrival: '16:00', departure: '18:00' }]);
            }
        }
    } else {
        // NEW LOG (First time today)
        setCurrentLogId(null);
        setAttendanceRecords([{ id: '1', arrival: '16:00', departure: '18:00' }]);
        
        // CHECK NEXT PLAN and Transfer to Today's Assignment
        if (s.nextPlan) {
            // Transfer Next Jadeed to Today's Jadeed (Reset Grade to GOOD as placeholder)
            const transferredJadeed = { ...s.nextPlan.jadeed, grade: Grade.GOOD };
            if (transferredJadeed.type === 'MULTI' && transferredJadeed.multiSurahs) {
                transferredJadeed.multiSurahs = transferredJadeed.multiSurahs.map(ms => ({ ...ms, grade: undefined }));
            }
            setJadeed(transferredJadeed);

            // Transfer Next Murajaah to Today's Murajaah
            if (s.nextPlan.murajaah && s.nextPlan.murajaah.length > 0) {
                 const transferredMurajaah = s.nextPlan.murajaah.map(m => {
                     const mCopy = { ...m, grade: Grade.VERY_GOOD };
                     if (mCopy.type === 'MULTI' && mCopy.multiSurahs) {
                         mCopy.multiSurahs = mCopy.multiSurahs.map(ms => ({ ...ms, grade: undefined }));
                     }
                     return mCopy;
                 });
                 setMurajaahList(transferredMurajaah);
            } else {
                 setMurajaahList([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
            }
        } else {
            // No plan, empty
            setJadeed({ ...emptyAssignment });
            setMurajaahList([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
        }
        setNotes('');
    }

    // NEXT PLAN SECTION (Always Initialize with current Next Plan to keep template fixed)
    if (s.nextPlan) {
        setNextJadeed(s.nextPlan.jadeed);
        if (s.nextPlan.murajaah && s.nextPlan.murajaah.length > 0) {
            setNextMurajaahList(s.nextPlan.murajaah);
        } else {
            setNextMurajaahList([{ ...emptyAssignment }]);
        }
    } else {
        setNextJadeed({ ...emptyAssignment, grade: Grade.GOOD });
        setNextMurajaahList([{ ...emptyAssignment }]);
    }
    
    setCalcNotes(s.calculatorNotes || '');
  };

  const markAsDirty = () => {
      if (!isDirty) setIsDirty(true);
  };

  const handleGenerateMessage = async () => {
    if (!selectedStudent) return;
    setIsGeneratingMessage(true);
    markAsDirty();
    const tempLog: DailyLog = {
      id: 'temp',
      date: new Date().toISOString(),
      teacherId: teacherId,
      teacherName: teacherName,
      seenByParent: false,
      jadeed: jadeed,
      murajaah: murajaahList,
      notes: notes
    };

    const message = await generateEncouragement(selectedStudent.name, tempLog);
    if (notes.trim()) {
         setNotes(notes + '\n\n' + message);
    } else {
         setNotes(message);
    }
    setIsGeneratingMessage(false);
  };

  const handleDeleteLog = (logId: string) => {
      if (!selectedStudent) return;
      // Confirmation Logic handled in UI now
      const updatedLogs = selectedStudent.logs.filter(l => l.id !== logId);
      onUpdateStudent({ ...selectedStudent, logs: updatedLogs });
      if (currentLogId === logId) {
          setCurrentLogId(null);
          setJadeed({ ...emptyAssignment });
          setMurajaahList([{ ...emptyAssignment }]);
          setAttendanceRecords([{ id: '1', arrival: '16:00', departure: '18:00' }]);
      }
      onShowNotification('تم حذف السجل بنجاح', 'success');
  };

  const handleSaveLog = () => {
    if (!selectedStudent) return;
    const reminders: string[] = [];
    
    // Check Attendance Defaults
    const isAttDefault = attendanceRecords.length === 1 && 
                         attendanceRecords[0].arrival === '16:00' && 
                         attendanceRecords[0].departure === '18:00';
    
    // Check Next Plan Defaults (Did they change the Next Plan?)
    // Note: If they didn't touch it, nextJadeed might still equal s.nextPlan.jadeed which is fine,
    // but we want to warn if it looks "Default/Empty" (Fatiha 1-7).
    const isNextPlanEmpty = nextJadeed.name === SURAH_NAMES[0] && nextJadeed.ayahFrom === 1 && nextJadeed.ayahTo === 7 && nextJadeed.type === 'SURAH';
    
    // STRICT VALIDATION
    if (isAttDefault) reminders.push("🛑 لم يتم تغيير موعد الحضور والانصراف (الافتراضي 16:00 - 18:00)");
    if (isNextPlanEmpty) reminders.push("🛑 لم يتم تسجيل لوح الحفظ القادم (الفاتحة 1-7 افتراضياً)");
        
    if (reminders.length > 0) {
        const msg = "⚠️ تذكير هام من المساعد الذكي:\n\n" + reminders.join('\n') + "\n\nهل أنت متأكد من الحفظ بهذا الشكل؟";
        if (!window.confirm(msg)) {
            return; 
        }
    }

    let updatedLogs = [...selectedStudent.logs];
    
    if (currentLogId) {
        updatedLogs = updatedLogs.map(log => {
            if (log.id === currentLogId) {
                return {
                    ...log,
                    attendance: attendanceRecords,
                    jadeed: jadeed,
                    murajaah: murajaahList,
                    notes: notes,
                    seenByParent: false
                };
            }
            return log;
        });
        onShowNotification('تم تحديث السجل اليومي بنجاح', 'success');
    } else {
        const newLog: DailyLog = {
            id: `log_${Date.now()}`,
            date: new Date().toISOString(),
            teacherId: selectedStudent.teacherId,
            teacherName: teacherName,
            seenByParent: false,
            attendance: attendanceRecords,
            jadeed: jadeed,
            murajaah: murajaahList,
            notes: notes,
            isAbsent: false,
            isAdab: false
        };
        updatedLogs = [newLog, ...updatedLogs];
        onShowNotification('تم حفظ السجل اليومي بنجاح', 'success');
    }

    const nextPlan = {
        jadeed: nextJadeed,
        murajaah: nextMurajaahList
    };

    const updatedStudent = {
      ...selectedStudent,
      logs: updatedLogs,
      nextPlan: nextPlan
    };

    onUpdateStudent(updatedStudent);
    
    if (!currentLogId) {
        setCurrentLogId(updatedLogs[0].id);
    }
    
    const newDrafts = { ...drafts };
    delete newDrafts[selectedStudent.id];
    setDrafts(newDrafts);
    setIsDirty(false); 
  };

  const handleUpdatePhone = () => {
      if (!selectedStudent) return;
      onUpdateStudent({ ...selectedStudent, parentPhone: newPhoneVal });
      setIsEditingPhone(false);
      onShowNotification('تم تحديث رقم الهاتف بنجاح', 'success');
  };

  const handleAddPayment = () => {
      if(!selectedStudent || !newFeeAmount) return;
      const payment: Payment = {
          id: 'pay_' + Date.now(),
          amount: parseFloat(newFeeAmount),
          date: new Date().toISOString(),
          title: `رسوم شهر ${newFeeMonth}`,
          recordedBy: teacherName,
          notes: newFeeNotes
      };
      const updatedStudent: Student = {
          ...selectedStudent,
          payments: [payment, ...selectedStudent.payments],
          isFeeOverdue: false 
      };
      onUpdateStudent(updatedStudent);
      setNewFeeAmount('');
      setNewFeeNotes('');
      onShowNotification('تم تسجيل الدفع وإلغاء التنبيه', 'success');
  };

  const handleSendFeeReminder = () => {
      if(!selectedStudent) return;
      onUpdateStudent({
          ...selectedStudent,
          isFeeOverdue: true
      });
      onShowNotification(`تم إرسال تذكير بالرسوم لولي الأمر ${selectedStudent.name}`, 'success');
  };

  const handleSaveCalculator = () => {
      if (!selectedStudent) return;
      const updatedStudent = {
          ...selectedStudent,
          calculatorNotes: calcNotes
      };
      onUpdateStudent(updatedStudent);
      onShowNotification('تم حفظ ملاحظات الحاسبة', 'success');
  };

  const handleSendWhatsApp = () => {
    if (!selectedStudent) {
        onShowNotification('الرجاء اختيار طالب', 'error');
        return;
    }
    if (!selectedStudent.parentPhone) {
        onShowNotification('رقم ولي الأمر غير مسجل في بيانات الطالب', 'error');
        return;
    }
    const formatAss = (a: QuranAssignment) => {
        if (a.type === 'MULTI') {
            if (a.multiSurahs && a.multiSurahs.length > 0) {
                const list = a.multiSurahs.map(ms => {
                    const g = ms.grade ? `(${ms.grade})` : '';
                    return `${ms.name} ${g}`;
                }).join('، ');
                return `سور متعددة: ${list}`;
            }
            return 'متفرقات';
        }
        if (a.type === 'JUZ') return JUZ_LIST[(a.juzNumber || 1) - 1];
        if (a.type === 'RANGE') return `من ${a.name} إلى ${a.endName}`;
        if (a.type === 'SURAH') return `سورة ${a.name} (${a.ayahFrom}-${a.ayahTo})`;
        return a.name;
    };

    let attendanceText = "";
    attendanceRecords.forEach((att, idx) => {
        const arrival = formatTime12Hour(att.arrival);
        const departure = att.departure ? formatTime12Hour(att.departure) : '--';
        attendanceText += `🕐 *الفترة ${idx + 1}:* ${arrival} - ${departure}\n`;
    });
    
    const jadeedGrade = jadeed.type === 'MULTI' ? '' : (!jadeed.grade ? '' : `(التقدير: ${jadeed.grade})`);
    const jadeedText = `${formatAss(jadeed)} ${jadeedGrade}`;

    const murajaahText = murajaahList.length > 0 
        ? murajaahList.map(m => {
             const mGrade = m.type === 'MULTI' ? '' : `(التقدير: ${m.grade})`;
             return `▫️ ${formatAss(m)} ${mGrade}`;
        }).join('\n') 
        : 'لا توجد مراجعة';

    const nextJadeedText = formatAss(nextJadeed);
    const nextMurajaahText = nextMurajaahList.length > 0 
        ? nextMurajaahList.map(m => `▫️ ${formatAss(m)}`).join('\n')
        : 'لم يحدد بعد';

    let message = `*🕌 تقرير متابعة الطالب - دار التوحيد 🕌*\n\n`;
    message += `👤 *الاسم:* ${selectedStudent.name}\n`;
    message += `📅 *التاريخ:* ${formatSimpleDate(new Date().toISOString())}\n`;
    message += attendanceText + "\n";
    message += `───────────────\n`;
    message += `📊 *إنجاز اليوم:*\n`;
    message += `✅ *الحفظ الجديد:* ${jadeedText}\n`;
    if (murajaahList.length > 0) {
        message += `🔄 *المراجعة:*\n${murajaahText}\n`;
    }
    message += `\n───────────────\n`;
    message += `📝 *الواجب القادم (اللوح):*\n`;
    message += `📌 *الحفظ المطلوب:* ${nextJadeedText}\n`;
    if (nextMurajaahList.length > 0) {
        message += `📌 *المراجعة:* \n${nextMurajaahText}\n`;
    }
    if (notes && notes.trim().length > 0) {
        message += `\n───────────────\n`;
        message += `💬 *ملاحظات المعلم:*\n${notes}\n`;
    }
    message += `\n🌷 *نسأل الله أن يجعله من أهل القرآن.*`;
    const url = `https://wa.me/2${selectedStudent.parentPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleAddToQuestionList = () => {
      if (!currentQuestion || !currentCorrect || !currentWrong1) {
          onShowNotification("يرجى ملء السؤال والإجابات", "error");
          return;
      }
      const newQuiz: QuizItem = {
          id: 'q_' + Date.now(),
          question: currentQuestion,
          correctAnswer: currentCorrect,
          wrongAnswers: [currentWrong1, currentWrong2].filter(w => w.trim() !== '')
      };
      setAdabQuestionsList([...adabQuestionsList, newQuiz]);
      setCurrentQuestion('');
      setCurrentCorrect('');
      setCurrentWrong1('');
      setCurrentWrong2('');
      onShowNotification("تم إضافة السؤال للقائمة", "success");
  };

  const handleEditQuestionFromList = (q: QuizItem) => {
      setCurrentQuestion(q.question);
      setCurrentCorrect(q.correctAnswer);
      setCurrentWrong1(q.wrongAnswers[0] || '');
      setCurrentWrong2(q.wrongAnswers[1] || '');
      // Remove it from list so it can be added back
      setAdabQuestionsList(prev => prev.filter(x => x.id !== q.id));
      onShowNotification("تم تعبئة البيانات للتعديل", "success");
  };

  const handlePublishAdabLesson = () => {
      if (adabQuestionsList.length === 0) {
          onShowNotification("يجب إضافة سؤال واحد على الأقل", "error");
          return;
      }
      if (editingAdabId) {
          onEditAdab(editingAdabId, adabTitle, adabQuestionsList);
          setEditingAdabId(null);
      } else {
          onPublishAdab(adabTitle, adabQuestionsList);
      }
      setAdabQuestionsList([]);
      setAdabTitle('مجلس الآداب');
      onShowNotification(editingAdabId ? "تم تعديل الدرس بنجاح" : "تم نشر الدرس بنجاح", "success");
  };

  const handleEditAdabSession = (session: AdabSession) => {
      setEditingAdabId(session.id);
      setAdabTitle(session.title);
      setAdabQuestionsList(session.quizzes);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEditAdab = () => {
      setEditingAdabId(null);
      setAdabTitle('مجلس الآداب');
      setAdabQuestionsList([]);
  };

  const handleAddAttendanceSlot = () => {
      setAttendanceRecords([...attendanceRecords, { id: Date.now().toString(), arrival: '16:00', departure: '18:00' }]);
      markAsDirty();
  };

  const handleRemoveAttendanceSlot = (id: string) => {
      if (attendanceRecords.length > 1) {
          setAttendanceRecords(attendanceRecords.filter(a => a.id !== id));
          markAsDirty();
      }
  };

  const handleAttendanceChange = (id: string, field: 'arrival' | 'departure', value: string) => {
      setAttendanceRecords(attendanceRecords.map(a => a.id === id ? { ...a, [field]: value } : a));
      markAsDirty();
  };
  
  const handleAddExamDay = () => {
      if (!newExamDate || !newExamDesc) return;
      const newDay: ExamDayDetail = {
          id: Date.now().toString(),
          date: newExamDate,
          description: newExamDesc
      };
      setExamDays([...examDays, newDay]);
  };

  const renderStudentCard = (student: Student) => {
    const todayStr = new Date().toDateString();
    const todayLog = student.logs.find(l => new Date(l.date).toDateString() === todayStr);
    const hasLogToday = !!todayLog;
    const isAbsentToday = todayLog?.isAbsent;
    
    const hasDraft = drafts[student.id];
    const lastLog = student.logs[0];

    let cardBg = "bg-white";
    let cardBorder = "border-gray-100";
    let iconBg = "bg-gray-100 text-gray-500 border-gray-200";
    let statusBadge = null;

    if (hasDraft) {
        cardBg = "bg-amber-50";
        cardBorder = "border-l-4 border-l-amber-400";
        iconBg = "bg-amber-100 text-amber-700 border-amber-200";
        statusBadge = (<span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 w-fit text-[10px]">✏️ مسودة غير محفوظة</span>);
    } else if (hasLogToday) {
        if (isAbsentToday) {
            cardBg = "bg-red-50";
            cardBorder = "border-l-4 border-l-red-500";
            iconBg = "bg-red-100 text-red-600 border-red-200";
            statusBadge = (<span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1 w-fit">❌ غائب اليوم</span>);
        } else {
            cardBg = "bg-emerald-50";
            cardBorder = "border-l-4 border-l-emerald-500";
            iconBg = "bg-emerald-100 text-emerald-700 border-emerald-200";
            statusBadge = (<span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 w-fit">✅ تم التسميع اليوم</span>);
        }
    } else {
         statusBadge = lastLog ? <span className="text-gray-400 text-[10px] font-bold">🗓️ آخر: {formatSimpleDate(lastLog.date)}</span> : <span className="text-blue-500 text-[10px] font-bold">🆕 طالب جديد</span>;
    }

    return (
      <div key={student.id} className={`p-4 rounded-xl shadow-sm border flex justify-between items-center transition transform hover:scale-[1.01] cursor-pointer ${cardBg} ${cardBorder}`} onClick={() => handleOpenStudent(student)}>
        <div className="flex items-center gap-3 w-full">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${iconBg}`}>
            {student.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">{student.name}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded border border-gray-200 font-mono font-bold">{student.parentCode}</span>
            </div>
            <div className="mt-1">{statusBadge}</div>
          </div>
          <div className="text-gray-300 bg-gray-50 p-2 rounded-full">⬅</div>
        </div>
      </div>
    );
  };

  const renderCalculatorResult = () => {
      const amount = parseFloat(calcAmount);
      if (isNaN(amount) || !calcAmount) return <p className="text-indigo-800 font-bold text-sm mb-2">المطلوب إنجازه...</p>;

      const days = parseInt(calcWeeklyDays);
      const totalUnits = amount * days * 4;

      if (totalUnits >= 15) {
          const pages = Math.floor(totalUnits / 15);
          const lines = Math.round(totalUnits % 15);
          return (
              <div className="space-y-1">
                  <p className="text-indigo-800 font-bold text-sm mb-1">المجموع الكلي:</p>
                  <p className="text-3xl font-black text-indigo-700 dir-rtl">
                      {pages} صفحة {lines > 0 ? `و ${lines} سطر` : ''}
                  </p>
                  <p className="text-xs text-indigo-400">({totalUnits} سطر)</p>
              </div>
          );
      } else {
           return (
              <div className="space-y-1">
                  <p className="text-indigo-800 font-bold text-sm mb-1">المجموع الكلي:</p>
                  <p className="text-3xl font-black text-indigo-700 dir-rtl">{totalUnits} سطر</p>
              </div>
          );
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
        <div className="px-4 py-3 flex justify-between items-center">
            {selectedStudentId ? (
                <div className="flex items-center gap-3 w-full animate-slide-right">
                    <button onClick={handleCloseStudent} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-600 shadow-sm">⬅</button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-800 truncate">{selectedStudent?.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {isEditingPhone ? (
                                <div className="flex items-center gap-1 scale-90 origin-right w-full">
                                    <input className="w-full p-2 text-3xl font-bold border-2 border-blue-200 focus:border-blue-500 rounded-lg text-center tracking-widest bg-white" value={newPhoneVal} onChange={(e) => setNewPhoneVal(e.target.value)} placeholder="01xxxxxxxxx" autoFocus />
                                    <button onClick={handleUpdatePhone} className="bg-green-500 text-white px-4 py-2 rounded-lg text-lg font-bold shadow-md whitespace-nowrap">حفظ</button>
                                    <button onClick={() => setIsEditingPhone(false)} className="text-red-500 text-sm font-bold px-2 whitespace-nowrap">إلغاء</button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600 font-bold flex items-center gap-2">
                                    <a href={`tel:${selectedStudent?.parentPhone}`} className="hover:text-emerald-600 transition-colors">📞 {selectedStudent?.parentPhone || 'لا يوجد هاتف'}</a>
                                    <button onClick={() => { setIsEditingPhone(true); setNewPhoneVal(selectedStudent?.parentPhone || ''); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-lg text-lg">✎</button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xl shadow-sm border-2 border-emerald-100">👳‍♂️</div>
                         <div>
                             <h1 className="font-bold text-gray-800 text-lg">مرحباً بك</h1>
                             <p className="text-xs text-gray-500 font-bold">{teacherName}</p>
                         </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onLogout} className="text-red-500 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition shadow-sm">
                            <span className="text-xs font-bold flex items-center gap-1">خروج 🚪</span>
                        </button>
                    </div>
                </>
            )}
        </div>

        {!selectedStudentId && (
            <div className="px-2 pb-2">
                <div className="flex overflow-x-auto gap-2 py-1 touch-pan-x no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                    <TabButton id="LIST" icon="📋" label="القائمة" isActive={activeTab === 'LIST'} onClick={() => setActiveTab('LIST')} />
                    <TabButton id="ADD" icon="➕" label="إضافة" isActive={activeTab === 'ADD'} onClick={() => setActiveTab('ADD')} />
                    <TabButton id="ADAB" icon="🌟" label="الآداب" isActive={activeTab === 'ADAB'} onClick={() => setActiveTab('ADAB')} />
                    <TabButton id="ATTENDANCE" icon="🚫" label="الغياب" isActive={activeTab === 'ATTENDANCE'} onClick={() => setActiveTab('ATTENDANCE')} />
                    <TabButton id="STATS" icon="📊" label="الاحصائيات" isActive={activeTab === 'STATS'} onClick={() => setActiveTab('STATS')} />
                    <TabButton id="ANNOUNCEMENTS" icon="📢" label="إعلانات" isActive={activeTab === 'ANNOUNCEMENTS'} onClick={() => setActiveTab('ANNOUNCEMENTS')} />
                    <TabButton id="DELETE" icon="" label="حذف طالب" isActive={activeTab === 'DELETE'} onClick={() => setActiveTab('DELETE')} />
                </div>
            </div>
        )}
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {!selectedStudentId ? (
            <>
                {activeTab === 'LIST' && (
                    <div className="space-y-3 animate-slide-up">
                        <div className="bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 flex flex-col gap-2 text-emerald-800 font-bold shadow-sm mb-2">
                            <div className="flex justify-between items-center">
                                <span>عدد الطلاب في المجموعة:</span>
                                <span className="bg-white px-3 py-1 rounded-full text-emerald-600 shadow-sm">{students.length}</span>
                            </div>
                            {students.length > 0 && (
                                <div className="flex gap-2 mt-2 border-t border-emerald-100 pt-2">
                                    <button onClick={() => setSortMethod('ALPHABETICAL')} className={`flex-1 text-xs py-1.5 rounded-lg transition ${sortMethod === 'ALPHABETICAL' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-100'}`}>أبجدياً (أ-ي)</button>
                                    <button onClick={() => setSortMethod('CODE')} className={`flex-1 text-xs py-1.5 rounded-lg transition ${sortMethod === 'CODE' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-100'}`}>بالكود (الأرقام)</button>
                                </div>
                            )}
                        </div>
                         {sortedStudents.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                                <p className="text-lg">لا يوجد طلاب مسجلين.</p>
                                <p className="text-xs mt-2 text-emerald-600 font-bold cursor-pointer" onClick={() => setActiveTab('ADD')}>+ أضف طلابك الآن</p>
                            </div>
                        ) : (
                            sortedStudents.map(renderStudentCard)
                        )}
                    </div>
                )}
                
                {activeTab === 'ADD' && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-emerald-100 animate-slide-up">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-2 border-4 border-emerald-50">👤</div>
                            <h3 className="font-bold text-emerald-800 text-lg">إضافة طالب جديد</h3>
                            <p className="text-gray-500 text-sm">أضف الطالب للحلقة ليتمكن ولي الأمر من المتابعة</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم الطالب</label>
                                <input className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition" placeholder="الاسم الثلاثي" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">كود الطالب (لولي الأمر)</label>
                                <input className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition font-mono text-center tracking-widest text-lg" placeholder="مثال: 101" value={newStudentCode} onChange={e => setNewStudentCode(e.target.value)} />
                            </div>
                            <Button onClick={() => {
                                    if(newStudentName && newStudentCode) {
                                        const exists = students.some(s => s.parentCode === newStudentCode);
                                        if (exists) { onShowNotification('هذا الكود مستخدم بالفعل لطالب آخر!', 'error'); return; }
                                        onAddStudent(newStudentName, newStudentCode);
                                        setNewStudentName(''); setNewStudentCode('');
                                        onShowNotification('تمت إضافة الطالب بنجاح', 'success');
                                    }
                                }} className="w-full py-3 shadow-md text-lg">تسجيل الطالب +</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'ADAB' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
                            {editingAdabId && (
                                <div className="absolute top-0 right-0 bg-amber-200 text-amber-900 px-3 py-1 rounded-bl-lg font-bold text-xs z-20">
                                    وضع التعديل ✏️
                                </div>
                            )}
                            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-100 rounded-full -ml-16 -mt-16 opacity-50 blur-xl"></div>
                            <div className="text-center mb-6 relative z-10">
                                <span className="text-4xl block mb-2">🌟</span>
                                <h3 className="font-bold text-amber-900 text-xl">{editingAdabId ? "تعديل درس الآداب" : "مجلس الآداب والقيم"}</h3>
                                <p className="text-xs text-amber-700 mt-1">{editingAdabId ? "التعديل سيظهر للأهالي مرة أخرى" : "أنشئ درساً جديداً مع أسئلة تفاعلية"}</p>
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <label className="block text-xs font-bold text-amber-800 mb-1">عنوان الدرس</label>
                                    <input className="w-full p-3 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-amber-400 outline-none transition" value={adabTitle} onChange={e => setAdabTitle(e.target.value)} placeholder="مثال: بر الوالدين" />
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100">
                                    <h4 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2"><span className="bg-amber-100 p-1 rounded text-amber-600">➕</span> إضافة سؤال تفاعلي</h4>
                                    <input className="w-full p-2 border rounded mb-2 text-sm bg-gray-50 focus:bg-white" placeholder="نص السؤال..." value={currentQuestion} onChange={e => setCurrentQuestion(e.target.value)} />
                                    <div className="grid grid-cols-1 gap-2">
                                        <input className="w-full p-2 border rounded text-sm border-green-200 bg-green-50 focus:bg-white" placeholder="الإجابة الصحيحة ✅" value={currentCorrect} onChange={e => setCurrentCorrect(e.target.value)} />
                                        <div className="flex gap-2">
                                            <input className="w-full p-2 border rounded text-sm border-red-200 bg-red-50 focus:bg-white" placeholder="إجابة خاطئة 1 ❌" value={currentWrong1} onChange={e => setCurrentWrong1(e.target.value)} />
                                            <input className="w-full p-2 border rounded text-sm border-red-200 bg-red-50 focus:bg-white" placeholder="خطأ 2 (اختياري)" value={currentWrong2} onChange={e => setCurrentWrong2(e.target.value)} />
                                        </div>
                                    </div>
                                    <Button onClick={handleAddToQuestionList} variant="secondary" className="w-full text-xs mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white">إضافة السؤال للقائمة ⬇️</Button>
                                </div>
                            </div>
                            {editingAdabId && (
                                <div className="flex justify-center mt-3 relative z-10">
                                    <button onClick={handleCancelEditAdab} className="text-xs text-gray-500 underline">إلغاء التعديل</button>
                                </div>
                            )}
                        </div>
                        {adabQuestionsList.length > 0 && (
                            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 animate-slide-up">
                                <h4 className="font-bold text-gray-800 text-sm mb-3 border-b pb-2">الأسئلة المضافة ({adabQuestionsList.length})</h4>
                                <ul className="space-y-2 mb-4">
                                    {adabQuestionsList.map((q, i) => (
                                        <li key={q.id} className="text-xs bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                                            <div><span className="font-bold text-emerald-600 block mb-1">س {i+1}: {q.question}</span><span className="text-gray-500">ج: {q.correctAnswer}</span></div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleEditQuestionFromList(q)} className="text-blue-500 font-bold px-2 hover:bg-blue-50 rounded" title="تعديل">✎</button>
                                                <button onClick={() => setAdabQuestionsList(adabQuestionsList.filter(x => x.id !== q.id))} className="text-red-400 font-bold px-2 hover:bg-red-50 rounded" title="حذف">×</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <Button onClick={handlePublishAdabLesson} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg py-3 text-lg">{editingAdabId ? "💾 حفظ التعديلات" : "🚀 نشر الدرس الآن"}</Button>
                            </div>
                        )}
                        
                        {/* Adab Archive Section */}
                        {adabArchive.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-bold text-gray-700 mb-3 border-b pb-2 flex justify-between items-center">
                                    <span>🗄️ أرشيف الدروس السابقة</span>
                                </h4>
                                <div className="space-y-3">
                                    {adabArchive.map(session => (
                                        <div key={session.id} className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{session.title}</p>
                                                <p className="text-[10px] text-gray-500">{formatSimpleDate(session.date)} • {session.quizzes.length} أسئلة</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditAdabSession(session)} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-100">تعديل ✎</button>
                                                <ConfirmDeleteButton label="حذف" onConfirm={() => onDeleteAdab(session.id)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'ATTENDANCE' && (
                    <div className="animate-slide-up bg-white p-5 rounded-xl shadow-lg border border-red-100">
                        <div className="text-center mb-4">
                            <h3 className="font-bold text-red-800 text-lg">سجل الحضور السريع</h3>
                            <p className="text-gray-500 text-sm">اضغط على الطالب لتغيير حالته (غياب/عذر/حضور)</p>
                        </div>
                        
                        {unloggedStudents.length === 0 ? (
                            <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-green-700 font-bold">🎉 تم تسجيل جميع الطلاب اليوم!</p>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={handleSelectAllAbsent} 
                                    className="w-full mb-4 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-xs border border-gray-300 hover:bg-gray-200 transition"
                                >
                                    ❌ تحديد الكل كغياب
                                </button>
                                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1 mb-4">
                                    {unloggedStudents.map(s => {
                                        const status = attendanceMap[s.id];
                                        let cardClass = "bg-white border-gray-200 text-gray-700";
                                        let statusIcon = "⬜";
                                        
                                        if (status === 'ABSENT') {
                                            cardClass = "bg-red-50 border-red-500 text-red-800 shadow-md transform scale-[0.98]";
                                            statusIcon = "❌";
                                        } else if (status === 'EXCUSED') {
                                            cardClass = "bg-yellow-50 border-yellow-500 text-yellow-800 shadow-md transform scale-[0.98]";
                                            statusIcon = "✋";
                                        }

                                        return (
                                            <div 
                                                key={s.id} 
                                                onClick={() => toggleStudentStatus(s.id)}
                                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${cardClass}`}
                                            >
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-sm truncate">{s.name}</p>
                                                    <p className="text-[10px] opacity-70">{status === 'ABSENT' ? 'غياب' : status === 'EXCUSED' ? 'عذر' : 'حاضر'}</p>
                                                </div>
                                                <div className="text-lg">{statusIcon}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-gray-500 mb-4">
                                    <span>نقرة واحدة: ❌ غياب</span>
                                    <span>نقر مرتين: ✋ عذر</span>
                                    <span>3 نقرات: ⬜ إلغاء</span>
                                </div>
                                <Button 
                                    onClick={handleBatchAttendanceSubmit}
                                    variant="danger" 
                                    className="w-full py-4 text-lg shadow-xl"
                                >
                                    حفظ الغياب المحدد 💾
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'STATS' && (
                    <div className="animate-slide-up bg-white p-5 rounded-xl shadow-sm border border-purple-100">
                        <h3 className="font-bold text-purple-900 text-lg mb-4 flex items-center gap-2">📊 إحصائيات الحضور اليومية</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-600 mb-1">اختر التاريخ</label>
                            <input type="date" className="w-full p-2 border rounded-lg" value={statsDate} onChange={(e) => setStatsDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-100 rounded-full -mr-8 -mt-8 opacity-50"></div>
                                <p className="text-emerald-800 font-bold text-sm z-10 relative">✅ الحضور</p>
                                <p className="text-4xl font-black text-emerald-600 mt-2 z-10 relative">{statsData.present.length}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100 shadow-sm relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-red-100 rounded-full -mr-8 -mt-8 opacity-50"></div>
                                <p className="text-red-800 font-bold text-sm z-10 relative">❌ الغياب</p>
                                <p className="text-4xl font-black text-red-600 mt-2 z-10 relative">{statsData.absent.length}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <h4 className="font-bold text-emerald-700 text-sm mb-3 flex items-center gap-1 border-b pb-2"><span>🟢</span> قائمة الحضور ({statsData.present.length})</h4>
                                {statsData.present.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {statsData.present.map(s => (<div key={s.id} className="bg-white px-2 py-1.5 rounded border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{s.name}</div>))}
                                    </div>
                                ) : <p className="text-center text-gray-400 text-xs py-2">لا يوجد حضور مسجل</p>}
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <h4 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-1 border-b pb-2"><span>🔴</span> قائمة الغياب ({statsData.absent.length})</h4>
                                {statsData.absent.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {statsData.absent.map(s => (<div key={s.id} className="bg-white px-2 py-1.5 rounded border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>{s.name}</div>))}
                                    </div>
                                ) : <p className="text-center text-gray-400 text-xs py-2">لا يوجد غياب مسجل</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ANNOUNCEMENTS' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                            <h3 className="font-bold text-blue-800 text-lg mb-4 text-center">📢 لوحة الإعلانات</h3>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-600 mb-1">نوع الإعلان</label>
                                <select className="w-full p-2 border rounded-lg bg-gray-50 mb-3" value={announcementType} onChange={(e) => setAnnouncementType(e.target.value as 'GENERAL' | 'EXAM')}>
                                    <option value="GENERAL">إعلان عام</option>
                                    <option value="EXAM">اختبار شهر</option>
                                </select>

                                {announcementType === 'EXAM' ? (
                                    <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-100 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">اختر المحفظ المختبر</label>
                                            <select 
                                                className="w-full p-4 text-xl border-2 border-indigo-200 rounded-xl bg-white text-indigo-900 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition outline-none cursor-pointer text-center" 
                                                value={examTesterId} 
                                                onChange={(e) => setExamTesterId(e.target.value)}
                                            >
                                                <option value="">-- اختر المحفظ --</option>
                                                {availableTesters.length > 0 ? (
                                                    availableTesters.map(t => (<option key={t.id} value={t.id}>{t.name} {t.id === teacherId ? '(أنت)' : ''}</option>))
                                                ) : (
                                                    <option value="" disabled>لا يوجد محفظين</option>
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">أيام الاختبار</label>
                                            <div className="flex gap-2 mb-2 items-center">
                                                <div className="flex-1 bg-white border rounded flex items-center px-2">
                                                    <input type="date" className="w-full p-1.5 text-xs outline-none" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} />
                                                    <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap pl-1">{newExamDate ? new Date(newExamDate).toLocaleDateString('ar-EG', {weekday: 'short'}) : ''}</span>
                                                </div>
                                                <select className="w-24 p-2 border rounded text-xs" value={newExamDesc} onChange={e => setNewExamDesc(e.target.value)}>
                                                    <option value="حفظ">جديد</option>
                                                    <option value="مراجعة">مراجعة</option>
                                                    <option value="باقي اللوح">باقي اللوح</option>
                                                </select>
                                                <button onClick={handleAddExamDay} className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm whitespace-nowrap">إضافة يوم</button>
                                            </div>
                                            {examDays.length > 0 && (
                                                <div className="space-y-1">
                                                    {examDays.map((day, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 text-xs">
                                                            <span className="font-bold text-purple-900">📅 {formatDateWithDay(day.date)}: <span className="text-gray-600 font-normal">{day.description === 'حفظ' ? 'حفظ جديد' : day.description}</span></span>
                                                            <button onClick={() => setExamDays(examDays.filter((_, i) => i !== idx))} className="text-red-500 font-bold">x</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <textarea className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white transition mb-2" placeholder="اكتب نص الإعلان هنا للنشر اليدوي..." value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)}></textarea>
                                )}

                                <Button className="w-full mt-2" onClick={() => {
                                    if (announcementType === 'EXAM') {
                                        if (!examTesterId || examDays.length === 0) { onShowNotification('يرجى اختيار المحفظ وإضافة يوم اختبار واحد على الأقل', 'error'); return; }
                                        const tester = allTeachers.find(t => t.id === examTesterId);
                                        onAddAnnouncement({
                                            id: Date.now().toString(),
                                            teacherId,
                                            teacherName,
                                            content: `اختبار شهر عند ${tester?.name || 'المحفظ'}`,
                                            date: new Date().toISOString(),
                                            type: 'EXAM',
                                            examDetails: { testerTeacherId: examTesterId, testerTeacherName: tester?.name || '', schedule: examDays }
                                        });
                                        setExamTesterId(''); setExamDays([]);
                                        onShowNotification('تم نشر جدول الاختبار', 'success');
                                    } else {
                                        if(announcementText) {
                                            onAddAnnouncement({ id: Date.now().toString(), teacherId, teacherName, content: announcementText, date: new Date().toISOString(), type: 'GENERAL' });
                                            setAnnouncementText('');
                                            onShowNotification('تم نشر الإعلان', 'success');
                                        }
                                    }
                                }}>نشر الإعلان 📤</Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {announcements.map(a => (
                                <div key={a.id} className="bg-white p-4 rounded-xl border-r-4 border-r-blue-500 shadow-sm relative">
                                    <button onClick={() => onDeleteAnnouncement(a.id)} className="absolute top-2 left-2 text-red-400 hover:text-red-600 font-bold">×</button>
                                    <p className="font-bold text-gray-800 text-sm mb-1">{a.teacherName} <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{a.type === 'EXAM' ? 'اختبار' : 'عام'}</span></p>
                                    {a.type === 'EXAM' && a.examDetails ? (
                                        <div className="mt-2 text-sm text-gray-700">
                                            <p className="font-bold text-purple-700 mb-1">المختبر: {a.examDetails.testerTeacherName}</p>
                                            <ul className="space-y-1">
                                                {a.examDetails.schedule.map((d, i) => (
                                                    <li key={i} className="bg-purple-50 p-2 rounded border border-purple-100 flex justify-between">
                                                        <span className="font-bold">{formatDateWithDay(d.date)}</span>
                                                        <span className="text-purple-700">{d.description === 'حفظ' ? 'حفظ جديد' : d.description}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : <p className="text-gray-600 text-sm">{a.content}</p>}
                                    <p className="text-[10px] text-gray-400 mt-2">{formatSimpleDate(a.date)}</p>
                                </div>
                            ))}
                            {announcements.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد إعلانات منشورة</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'DELETE' && (<div className="animate-slide-up space-y-4"><div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm"><h3 className="text-red-900 font-bold text-lg mb-4 text-center">حذف الطلاب</h3>{sortedStudents.length === 0 ? (<div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-400 font-bold">لا يوجد طلاب في القائمة.</p></div>) : (<div className="space-y-3">{sortedStudents.map(s => (<div key={s.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">{s.name.charAt(0)}</div><div><p className="font-bold text-gray-800">{s.name}</p><p className="text-xs text-gray-500">كود: {s.parentCode}</p></div></div><ConfirmDeleteButton label="حذف" onConfirm={() => onDeleteStudents([s.id])} /></div>))}</div>)}</div></div>)}
            </>
        ) : (
            <div className="space-y-4 animate-slide-up">
                <div className="flex overflow-x-auto gap-2 pb-2 mb-2 touch-pan-x bg-white p-2 rounded-xl shadow-sm border border-gray-100 no-scrollbar">
                    <TabButton compact id="LOG" label="تسجيل اليوم" icon="📝" isActive={studentTab === 'LOG'} onClick={() => setStudentTab('LOG')} />
                    <TabButton compact id="PLAN" label="اللوح الجديد" icon="📅" isActive={studentTab === 'PLAN'} onClick={() => setStudentTab('PLAN')} />
                    <TabButton compact id="ARCHIVE" label="الأرشيف" icon="🗄️" isActive={studentTab === 'ARCHIVE'} onClick={() => setStudentTab('ARCHIVE')} />
                    <TabButton compact id="CALC" label="حاسبة الشهر" icon="🧮" isActive={studentTab === 'CALC'} onClick={() => setStudentTab('CALC')} />
                    <TabButton compact id="SCHEDULE" label="الجدول" icon="⏰" isActive={studentTab === 'SCHEDULE'} onClick={() => setStudentTab('SCHEDULE')} />
                    <TabButton compact id="FEES" label="الرسوم" icon="💰" isActive={studentTab === 'FEES'} onClick={() => setStudentTab('FEES')} />
                </div>
                {studentTab === 'LOG' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 border border-emerald-100 animate-fade-in">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">{currentLogId ? "تعديل سجل اليوم" : "تسجيل تسميع اليوم"}<span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{logDate}</span></h2>
                            {currentLogId && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">وضع التعديل</span>}
                        </div>
                        <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-500 block">فترات الحضور والانصراف</label>
                                <button onClick={handleAddAttendanceSlot} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200">+ إضافة فترة</button>
                             </div>
                             {attendanceRecords.map((record, index) => (
                                 <div key={record.id} className="relative mb-3 last:mb-0 border-b last:border-0 border-gray-200 pb-3 last:pb-0">
                                     {attendanceRecords.length > 1 && (<button onClick={() => handleRemoveAttendanceSlot(record.id)} className="absolute left-0 top-0 text-red-400 hover:text-red-600 font-bold text-xs bg-white border border-red-100 px-1 rounded z-10">حذف</button>)}
                                     <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-bold text-gray-400 mb-1 block">وقت الحضور {index + 1}</label><TimePicker value={record.arrival} onChange={(v) => handleAttendanceChange(record.id, 'arrival', v)} /></div>
                                        <div><label className="text-[10px] font-bold text-gray-400 mb-1 block">وقت الانصراف {index + 1}</label><TimePicker value={record.departure || ''} onChange={(v) => handleAttendanceChange(record.id, 'departure', v)} /></div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                        <AssignmentForm title="📖 الحفظ الجديد (تسميع)" data={jadeed} onChange={(f, v) => { setJadeed({ ...jadeed, [f]: v }); markAsDirty(); }} colorClass="border-emerald-200 bg-emerald-50/50" />
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">🔄 المراجعة</h4>
                                <button onClick={() => { setMurajaahList([...murajaahList, { ...emptyAssignment, grade: Grade.VERY_GOOD }]); markAsDirty(); }} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 font-bold">+ إضافة</button>
                            </div>
                            {murajaahList.map((m, idx) => (
                                <AssignmentForm key={idx} title={`مراجعة ${idx + 1}`} data={m} onChange={(f, v) => { const newList = [...murajaahList]; newList[idx] = { ...newList[idx], [f]: v }; setMurajaahList(newList); markAsDirty(); }} colorClass="border-amber-200 bg-amber-50/50" canRemove onRemove={() => { setMurajaahList(murajaahList.filter((_, i) => i !== idx)); markAsDirty(); }} />
                            ))}
                        </div>
                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">ملاحظات / رسالة لولي الأمر</label>
                            <textarea className="w-full p-3 border rounded-lg text-sm h-32 mb-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="اكتب ملاحظاتك هنا..." value={notes} onChange={(e) => { setNotes(e.target.value); markAsDirty(); }}></textarea>
                            <div className="flex flex-col gap-2">
                                <Button onClick={handleGenerateMessage} className="w-full text-xs py-2 bg-purple-600 hover:bg-purple-700 flex justify-center shadow-md" isLoading={isGeneratingMessage}>✨ اقتراح رسالة تشجيعية (تلقائي)</Button>
                                {selectedStudent.parentPhone && (
                                    <button onClick={handleSendWhatsApp} className="w-full bg-green-500 text-white px-3 py-3 rounded-xl hover:bg-green-600 shadow-md flex items-center justify-center gap-2 text-sm font-bold transition transform active:scale-95" title="إرسال التقرير واللوح القادم عبر واتساب">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        إرسال التقرير واللوح عبر واتساب
                                    </button>
                                )}
                            </div>
                        </div>
                        <Button onClick={handleSaveLog} className="w-full py-4 text-lg shadow-xl mb-4 bg-emerald-700 hover:bg-emerald-800">{currentLogId ? "💾 تحديث السجل" : "💾 حفظ السجل"}</Button>
                    </div>
                )}
                {studentTab === 'PLAN' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 border border-blue-100 relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-300"></div>
                        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">📅 تحديد الواجب القادم (اللوح)</h3>
                        <p className="text-sm text-gray-500 mb-4">حدد ما يجب على الطالب حفظه أو مراجعته للمرة القادمة.</p>
                        <AssignmentForm title="حفظ للمرة القادمة" data={nextJadeed} onChange={(f, v) => setNextJadeed({ ...nextJadeed, [f]: v })} colorClass="border-blue-200 bg-blue-50/50" hideGrade />
                        <div className="mb-2">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">مراجعة للمرة القادمة</h4>
                                <button onClick={() => setNextMurajaahList([...nextMurajaahList, { ...emptyAssignment }])} className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded hover:bg-cyan-200 font-bold">+ إضافة</button>
                            </div>
                            {nextMurajaahList.map((m, idx) => (
                                <AssignmentForm key={idx} title={`واجب مراجعة ${idx + 1}`} data={m} onChange={(f, v) => { const newList = [...nextMurajaahList]; newList[idx] = { ...newList[idx], [f]: v }; setNextMurajaahList(newList); }} colorClass="border-cyan-200 bg-cyan-50/50" canRemove onRemove={() => setNextMurajaahList(nextMurajaahList.filter((_, i) => i !== idx))} hideGrade />
                            ))}
                        </div>
                        <Button onClick={handleSaveLog} className="w-full py-3 mt-4 text-lg bg-blue-600 hover:bg-blue-700">حفظ الواجب القادم</Button>
                    </div>
                )}
                {studentTab === 'ARCHIVE' && (
                    <div className="bg-white rounded-xl shadow-lg p-4 animate-fade-in">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2 flex items-center gap-2">🗄️ سجل التسميع السابق</h3>
                        {selectedStudent.logs.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">لا يوجد سجلات سابقة.</p>
                        ) : (
                            <div className="space-y-4">
                                {selectedStudent.logs.map((log) => (
                                    <div key={log.id} className={`relative p-5 rounded-xl border-r-4 shadow-sm transition-all hover:shadow-md ${log.isAbsent ? 'bg-red-50 border-r-red-500' : log.isAdab ? 'bg-amber-50 border-r-amber-500' : 'bg-white border-r-emerald-500 border border-gray-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2">📅 {formatSimpleDate(log.date)}</h4>
                                                <p className="text-xs text-gray-400 mt-1">{new Date(log.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {log.isAbsent ? (<span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">غياب ❌</span>) : log.isAdab ? (<span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold">يوم آداب ✨</span>) : (<span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">حضور ✅</span>)}
                                                <ConfirmDeleteButton 
                                                    label="🗑️ حذف"
                                                    onConfirm={() => handleDeleteLog(log.id)}
                                                    className="bg-red-100 text-red-700 font-bold border-red-300 hover:bg-red-200"
                                                />
                                            </div>
                                        </div>
                                        {!log.isAbsent && !log.isAdab && (
                                            <div className="space-y-2 text-sm">
                                                {log.jadeed && (
                                                    <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded border border-emerald-100">
                                                        <span className="text-emerald-600 font-bold">الحفظ:</span>
                                                        <span className="text-gray-800 flex-1">{log.jadeed.type === 'MULTI' ? `متعدد: ${log.jadeed.multiSurahs?.map(s => s.name).join('، ')}` : log.jadeed.type === 'JUZ' ? JUZ_LIST[(log.jadeed.juzNumber || 1) - 1] : log.jadeed.type === 'SURAH' ? `سورة ${log.jadeed.name} (${log.jadeed.ayahFrom}-${log.jadeed.ayahTo})` : log.jadeed.name}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded text-white ${log.jadeed.grade === Grade.EXCELLENT ? 'bg-emerald-500' : 'bg-blue-500'}`}>{log.jadeed.grade}</span>
                                                    </div>
                                                )}
                                                {log.murajaah && log.murajaah.length > 0 && (
                                                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                                        <span className="text-amber-600 font-bold block mb-1">المراجعة:</span>
                                                        <div className="space-y-1">
                                                            {log.murajaah.map((m, i) => (<div key={i} className="flex justify-between text-gray-700 text-xs"><span>• {m.type === 'MULTI' ? `متعدد: ${m.multiSurahs?.map(s => s.name).join('، ')}` : m.type === 'JUZ' ? JUZ_LIST[(m.juzNumber || 1) - 1] : m.name}</span><span className="font-bold">{m.grade}</span></div>))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {log.isAdab && log.adabSession && (
                                            <div className="bg-white p-2 rounded border border-amber-200 text-sm">
                                                <p className="font-bold text-amber-800">📖 {log.adabSession.title}</p>
                                                <p className="text-xs text-gray-500 mt-1">عدد الأسئلة: {log.adabSession.quizzes.length}</p>
                                                {log.parentQuizScore !== undefined ? <p className="text-xs text-green-600 font-bold mt-1">حل ولي الأمر: {log.parentQuizScore}/{log.parentQuizMax}</p> : <p className="text-xs text-gray-400 mt-1">لم يشارك ولي الأمر بعد</p>}
                                            </div>
                                        )}
                                        {log.notes && (<p className="mt-2 text-xs text-gray-500 italic border-t pt-2">"{log.notes.split('\n')[0]}"</p>)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {studentTab === 'CALC' && (<div className="bg-white rounded-xl shadow-lg p-5 animate-fade-in"><h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">🧮 حاسبة إنجاز الشهر</h3><div className="space-y-4 mb-6"><div><label className="block text-xs font-bold text-gray-500 mb-1">كمية الحفظ اليومية (أسطر)</label><input type="number" className="w-full p-2 border rounded-lg" placeholder="مثال: 5" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} /><p className="text-[10px] text-gray-400 mt-1">* يرجى إدخال عدد الأسطر (15 سطر = 1 صفحة)</p></div><div><label className="block text-xs font-bold text-gray-500 mb-1">عدد أيام الحضور في الأسبوع</label><select className="w-full p-2 border rounded-lg bg-white" value={calcWeeklyDays} onChange={e => setCalcWeeklyDays(e.target.value)}>{[1,2,3,4,5,6,7].map(d => (<option key={d} value={d}>{d} يوم</option>))}</select></div><div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center animate-pulse">{renderCalculatorResult()}</div></div><div><label className="block text-xs font-bold text-gray-500 mb-1">حفظ ملاحظات الخطة الشهرية</label><textarea className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="اكتب الملاحظات أو الخطة هنا..." value={calcNotes} onChange={e => setCalcNotes(e.target.value)}></textarea><Button onClick={handleSaveCalculator} className="w-full mt-2 text-sm bg-indigo-600 hover:bg-indigo-700">حفظ الملاحظات</Button></div></div>)}
                {studentTab === 'SCHEDULE' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 animate-fade-in">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg">⏰ جدول الطالب والأنشطة</h3>
                        <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded">تم ملء هذا الجدول من قبل ولي الأمر.</p>
                        <div className="space-y-3">
                            {selectedStudent.weeklySchedule.map((sched, idx) => (
                                <div key={sched.day} className={`p-4 rounded-lg border ${sched.isDayOff ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-gray-800">{sched.day}</h4>
                                        {sched.isDayOff && <span className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded">إجازة / مشغول</span>}
                                    </div>
                                    {!sched.isDayOff && (!sched.events || sched.events.length === 0) ? (
                                        <p className="text-xs text-gray-400 italic">لا توجد أنشطة مسجلة</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {sched.events?.map(event => (
                                                <div key={event.id} className="flex justify-between items-center text-sm bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                    <span className="text-blue-900">{event.title}</span>
                                                    <span className="font-mono font-bold text-blue-700 bg-white px-1 rounded">{formatTime12Hour(event.time)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {studentTab === 'FEES' && (<div className="bg-white rounded-xl shadow-lg p-5 animate-fade-in"><h3 className="font-bold text-gray-800 mb-4 text-lg">💰 الرسوم والمدفوعات</h3><div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6"><h4 className="font-bold text-emerald-800 text-sm mb-3">تسجيل دفعة جديدة</h4><div className="flex flex-col gap-2 mb-2"><div className="flex gap-2"><select className="p-2 border rounded text-sm bg-white flex-1" value={newFeeMonth} onChange={e => setNewFeeMonth(e.target.value)}><option value="يناير">يناير</option><option value="فبراير">فبراير</option><option value="مارس">مارس</option><option value="أبريل">أبريل</option><option value="مايو">مايو</option><option value="يونيو">يونيو</option><option value="يوليو">يوليو</option><option value="أغسطس">أغسطس</option><option value="سبتمبر">سبتمبر</option><option value="أكتوبر">أكتوبر</option><option value="نوفمبر">نوفمبر</option><option value="ديسمبر">ديسمبر</option></select><input type="number" placeholder="المبلغ (ج.م)" className="w-1/2 p-2 border rounded text-sm" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)} /></div><input type="text" placeholder="ملاحظات (اختياري)" className="w-full p-2 border rounded text-sm" value={newFeeNotes} onChange={e => setNewFeeNotes(e.target.value)} /></div><Button onClick={handleAddPayment} className="w-full text-sm">تسجيل الدفع +</Button></div>{!selectedStudent.isFeeOverdue ? (<div className="mb-6"><button onClick={handleSendFeeReminder} className="w-full bg-amber-100 text-amber-800 px-4 py-3 rounded-xl border border-amber-200 font-bold text-sm shadow-sm hover:bg-amber-200 transition flex items-center justify-center gap-2">🔔 إرسال تذكير بالرسوم لولي الأمر</button><p className="text-[10px] text-gray-500 text-center mt-1">سيظهر إشعار فوري عند ولي الأمر عند الضغط</p></div>) : (<div className="mb-6 bg-amber-50 p-3 rounded-lg border border-amber-100 text-center"><p className="text-amber-800 text-sm font-bold">⚠️ تم إرسال تذكير بالرسوم</p><p className="text-xs text-amber-600">سيختفي تلقائياً عند تسجيل دفعة جديدة.</p></div>)}<div className="space-y-2"><h4 className="font-bold text-gray-600 text-xs mb-2">سجل المدفوعات السابق</h4>{selectedStudent.payments.length === 0 ? (<p className="text-gray-400 text-sm text-center">لا يوجد مدفوعات مسجلة.</p>) : (selectedStudent.payments.map(pay => (<div key={pay.id} className="bg-white p-3 border rounded shadow-sm"><div className="flex justify-between items-center mb-1"><p className="font-bold text-gray-800 text-sm">{pay.title}</p><span className="font-bold text-emerald-600">{pay.amount} ج.م</span></div><p className="text-[10px] text-gray-400">{formatSimpleDate(pay.date)} - استلمها: {pay.recordedBy}</p>{pay.notes && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1.5 rounded">📝 {pay.notes}</p>}</div>)))}</div></div>)}
            </div>
        )}
      </div>
    </div>
  );
};
