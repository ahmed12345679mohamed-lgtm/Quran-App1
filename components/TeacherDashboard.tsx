
import React, { useState, useMemo } from 'react';
import { Student, DailyLog, Grade, QuranAssignment, Announcement, Payment, QuizItem, Teacher } from '../types';
import { SURAH_NAMES, JUZ_LIST, SURAH_DATA, formatDateDual, formatTime12Hour } from '../constants';
import { Button } from './Button';
import { TimePicker } from './TimePicker';
import { generateEncouragement } from '../services/geminiService';

interface TeacherDashboardProps {
  teacherName: string;
  teacherId: string;
  students: Student[];
  allTeachers?: Teacher[];
  announcements: Announcement[];
  onUpdateStudent: (student: Student) => void;
  onAddStudent: (name: string, code: string) => Promise<Student> | Student; 
  onDeleteStudents: (ids: string[]) => void;
  onMarkAbsences: (studentIds: string[]) => void;
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onPublishAdab: (title: string, quizzes: QuizItem[]) => void;
  onQuickAnnouncement: (type: 'ADAB' | 'HOLIDAY', payload?: any) => void;
}

const emptyAssignment: QuranAssignment = {
  type: 'SURAH',
  name: SURAH_NAMES[0],
  ayahFrom: 1,
  ayahTo: 7,
  grade: Grade.GOOD
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

  const maxAyahs = useMemo(() => {
    if (isSurah) {
      const s = SURAH_DATA.find(x => x.name === data.name);
      return s ? s.count : 286;
    }
    return 286;
  }, [data.name, isSurah]);

  const ayahOptions = useMemo(() => Array.from({ length: maxAyahs }, (_, i) => i + 1), [maxAyahs]);

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

      <div className="grid grid-cols-2 gap-2 mb-3">
        {['SURAH', 'RANGE', 'JUZ'].map(type => (
          <button
            key={type}
            className={`py-1 px-2 rounded-lg text-xs font-bold transition ${data.type === type ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}
            onClick={() => onChange('type', type)}
          >
            {type === 'SURAH' ? 'سورة' : type === 'RANGE' ? 'نطاق' : 'جزء'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {data.type === 'JUZ' ? (
           <select 
             className="w-full p-2 border rounded-lg bg-white"
             value={data.juzNumber || 1}
             onChange={(e) => onChange('juzNumber', parseInt(e.target.value))}
           >
             {JUZ_LIST.map((j, i) => <option key={i} value={i+1}>{j}</option>)}
           </select>
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

        {!hideGrade && (
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

// Expanded Competition Levels (All parts 1-30)
const COMPETITION_LEVELS = [
    // Special Categories
    'القرآن كاملاً',
    'نصف القرآن (15 جزء)',
    'ربع القرآن (5 أجزاء)',
    '10 أجزاء',
    '20 جزء',
    // Cumulative Parts 1 to 30
    ...Array.from({ length: 30 }, (_, i) => `${i + 1} أجزاء`),
    // Individual Juz 1 to 30
    ...Array.from({ length: 30 }, (_, i) => `الجزء ${i + 1}`),
    // Specific named Juz
    'جزء عم (30)',
    'جزء تبارك (29)',
    'جزء قد سمع (28)',
    'جزء الذاريات (27)',
    'جزء الأحقاف (26)'
];

const DeleteRow = ({ student, onDelete }: { student: Student, onDelete: (id: string) => void }) => {
    const [confirming, setConfirming] = useState(false);

    if (confirming) {
        return (
            <div className="flex gap-2">
                <Button variant="danger" onClick={() => onDelete(student.id)} className="text-xs px-3 py-1">تأكيد الحذف 🗑️</Button>
                <Button variant="outline" onClick={() => setConfirming(false)} className="text-xs px-3 py-1">إلغاء</Button>
            </div>
        )
    }
    return (
        <Button variant="danger" onClick={() => setConfirming(true)} className="text-xs px-4 py-2">حذف</Button>
    )
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherName,
  teacherId,
  students,
  allTeachers = [],
  announcements,
  onUpdateStudent,
  onAddStudent,
  onDeleteStudents,
  onMarkAbsences,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onLogout,
  onShowNotification,
  onPublishAdab,
  onQuickAnnouncement
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'ADD' | 'DELETE' | 'ANNOUNCEMENTS' | 'ADAB' | 'ATTENDANCE' | 'STATS'>('LIST');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sortMethod, setSortMethod] = useState<'ALPHABETICAL' | 'CODE'>('ALPHABETICAL');

  // Stats State
  const [statsDate, setStatsDate] = useState(new Date().toISOString().split('T')[0]);

  const [studentTab, setStudentTab] = useState<'LOG' | 'PLAN' | 'ARCHIVE' | 'CALC' | 'SCHEDULE' | 'FEES'>('LOG');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');

  const [adabTitle, setAdabTitle] = useState('مجلس الآداب');
  const [adabQuestionsList, setAdabQuestionsList] = useState<QuizItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCorrect, setCurrentCorrect] = useState('');
  const [currentWrong1, setCurrentWrong1] = useState('');
  const [currentWrong2, setCurrentWrong2] = useState('');

  const [announcementType, setAnnouncementType] = useState<'GENERAL' | 'EXAM' | 'COMPETITION'>('GENERAL');
  const [examProctorId, setExamProctorId] = useState('');
  const [examDate, setExamDate] = useState('');
  
  const [compDays, setCompDays] = useState<{id: number, date: string, levels: string[]}[]>([
      { id: Date.now(), date: '', levels: [] }
  ]);

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({ arrivalTime: '16:00', departureTime: '18:00' });
  const [jadeed, setJadeed] = useState<QuranAssignment>({ ...emptyAssignment });
  const [murajaahList, setMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
  const [notes, setNotes] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [nextJadeed, setNextJadeed] = useState<QuranAssignment>({ ...emptyAssignment, grade: Grade.GOOD });
  const [nextMurajaahList, setNextMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment }]);
  
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeMonth, setNewFeeMonth] = useState('يناير');
  const [newFeeNotes, setNewFeeNotes] = useState('');

  const [calcAmount, setCalcAmount] = useState('');
  const [calcWeeklyDays, setCalcWeeklyDays] = useState('3');
  const [calcNotes, setCalcNotes] = useState('');
  
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

  // Calculation for stats
  const statsData = useMemo(() => {
      const targetDate = new Date(statsDate).toDateString();
      const present = students.filter(s => s.logs.some(l => !l.isAbsent && new Date(l.date).toDateString() === targetDate));
      const absent = students.filter(s => s.logs.some(l => l.isAbsent && new Date(l.date).toDateString() === targetDate));
      return { present, absent };
  }, [students, statsDate]);

  const handleOpenStudent = (s: Student) => {
    setSelectedStudentId(s.id);
    setStudentTab('LOG'); 
    
    const todayStr = new Date().toDateString();
    const hasLogToday = s.logs.some(l => new Date(l.date).toDateString() === todayStr);

    if (!hasLogToday && s.nextPlan) {
        setJadeed({ ...s.nextPlan.jadeed, grade: Grade.GOOD });
        setMurajaahList(s.nextPlan.murajaah.map(m => ({ ...m, grade: Grade.GOOD })));
        if (s.nextPlan.murajaah.length === 0) {
            setMurajaahList([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
        }
    } else {
        setJadeed({ ...emptyAssignment });
        setMurajaahList([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
    }

    setNotes('');
    setCalcNotes(s.calculatorNotes || '');
    
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
  };

  const handleGenerateAIMessage = async () => {
    if (!selectedStudent) return;
    setIsGeneratingAI(true);
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

    const aiMessage = await generateEncouragement(selectedStudent.name, tempLog);
    const separator = notes ? '\n\n' : '';
    setNotes(notes + separator + "✨ " + aiMessage);
    setIsGeneratingAI(false);
  };

  const handleSaveLog = () => {
    if (!selectedStudent) return;

    const newLog: DailyLog = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      teacherId: selectedStudent.teacherId,
      teacherName: teacherName,
      seenByParent: false,
      attendance: attendance,
      jadeed: jadeed,
      murajaah: murajaahList,
      notes: notes,
      isAbsent: false,
      isAdab: false
    };

    const nextPlan = {
        jadeed: nextJadeed,
        murajaah: nextMurajaahList
    };

    const updatedStudent = {
      ...selectedStudent,
      logs: [newLog, ...selectedStudent.logs],
      nextPlan: nextPlan
    };

    onUpdateStudent(updatedStudent);
    onShowNotification('تم حفظ السجل اليومي والواجب القادم بنجاح', 'success');
    setSelectedStudentId(null);
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
    if (!selectedStudent || !selectedStudent.parentPhone) {
        onShowNotification('رقم ولي الأمر غير مسجل', 'error');
        return;
    }

    const jadeedText = jadeed.type === 'SURAH' ? `سورة ${jadeed.name} (${jadeed.ayahFrom}-${jadeed.ayahTo})` : jadeed.name;
    const murajaahText = murajaahList.map(m => m.name).join(' و ');
    
    const nextJadeedText = nextJadeed.type === 'SURAH' ? `سورة ${nextJadeed.name} (${nextJadeed.ayahFrom}-${nextJadeed.ayahTo})` : nextJadeed.name;
    const nextMurajaahText = nextMurajaahList.map(m => m.type === 'SURAH' ? `سورة ${m.name}` : m.name).join(' و ');

    let message = `*تقرير متابعة القرآن الكريم - دار التوحيد*\n`;
    message += `الطالب: ${selectedStudent.name}\n`;
    message += `------------------\n`;
    message += `📅 *${new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}*\n`;
    message += `🕒 الحضور: ${formatTime12Hour(attendance.arrivalTime)} - الانصراف: ${attendance.departureTime ? formatTime12Hour(attendance.departureTime) : '--'}\n\n`;
    
    message += `📊 *الأداء اليوم:*\n`;
    message += `✅ *الحفظ الجديد:* ${jadeedText} (التقدير: ${jadeed.grade})\n`;
    if (murajaahText) message += `🔄 *المراجعة:* ${murajaahText}\n`;
    
    message += `\n📝 *الواجب القادم (اللوح):*\n`;
    message += `📌 حفظ: ${nextJadeedText}\n`;
    if (nextMurajaahText) message += `📌 مراجعة: ${nextMurajaahText}\n`;

    if (notes) {
        message += `\n💬 *ملاحظات المعلم:*\n${notes}\n`;
    }
    
    message += `\nنسأل الله أن يبارك فيه ويجعله من أهل القرآن.`;
    
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

  const handlePublishAdabLesson = () => {
      if (adabQuestionsList.length === 0) {
          onShowNotification("يجب إضافة سؤال واحد على الأقل", "error");
          return;
      }
      if (typeof onPublishAdab === 'function') {
          onPublishAdab(adabTitle, adabQuestionsList);
          setAdabQuestionsList([]);
          setAdabTitle('مجلس الآداب');
          onShowNotification("تم نشر الدرس بنجاح", "success");
      }
  };

  const handleAddCompDay = () => {
      setCompDays([...compDays, { id: Date.now(), date: '', levels: [] }]);
  };

  const handleRemoveCompDay = (id: number) => {
      setCompDays(compDays.filter(d => d.id !== id));
  };

  const handleCompDateChange = (id: number, val: string) => {
      setCompDays(compDays.map(d => d.id === id ? { ...d, date: val } : d));
  };

  const handleAddLevelToDay = (dayId: number, level: string) => {
      if (!level) return;
      setCompDays(compDays.map(d => {
          if (d.id === dayId && !d.levels.includes(level)) {
              return { ...d, levels: [...d.levels, level] };
          }
          return d;
      }));
  };

  const handleRemoveLevelFromDay = (dayId: number, level: string) => {
      setCompDays(compDays.map(d => {
          if (d.id === dayId) {
              return { ...d, levels: d.levels.filter(l => l !== level) };
          }
          return d;
      }));
  };

  const renderStudentCard = (student: Student) => {
    const todayStr = new Date().toDateString();
    const todayLog = student.logs.find(l => new Date(l.date).toDateString() === todayStr);
    const hasLogToday = !!todayLog;
    const isAbsentToday = todayLog?.isAbsent;
    
    const lastLog = student.logs[0];

    let cardBg = "bg-white";
    let cardBorder = "border-gray-100";
    let iconBg = "bg-gray-100 text-gray-500 border-gray-200";
    let statusBadge = null;

    if (hasLogToday) {
        if (isAbsentToday) {
            cardBg = "bg-red-50";
            cardBorder = "border-l-4 border-l-red-500";
            iconBg = "bg-red-100 text-red-600 border-red-200";
            statusBadge = (
                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1 w-fit">
                    ❌ غائب اليوم
                </span>
            );
        } else {
            cardBg = "bg-emerald-50";
            cardBorder = "border-l-4 border-l-emerald-500";
            iconBg = "bg-emerald-100 text-emerald-700 border-emerald-200";
            statusBadge = (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 w-fit">
                    ✅ تم التسميع اليوم
                </span>
            );
        }
    } else {
         statusBadge = lastLog 
             ? <span className="text-gray-400 text-[10px] font-bold">🗓️ آخر: {new Date(lastLog.date).toLocaleDateString('ar-EG')}</span> 
             : <span className="text-blue-500 text-[10px] font-bold">🆕 طالب جديد</span>;
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
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded border border-gray-200 font-mono font-bold">
                    {student.parentCode}
                </span>
            </div>
            <div className="mt-1">
                {statusBadge}
            </div>
          </div>
          <div className="text-gray-300 bg-gray-50 p-2 rounded-full">
              ⬅
          </div>
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
                  <p className="text-3xl font-black text-indigo-700 dir-rtl">
                      {totalUnits} سطر
                  </p>
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
                    <button onClick={() => setSelectedStudentId(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-600 shadow-sm">
                        ⬅
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-800 truncate">{selectedStudent?.name}</h1>
                        <p className="text-[10px] text-gray-400 font-bold">ملف الطالب</p>
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
                    <TabButton id="STATS" icon="📊" label="احصائية الغياب" isActive={activeTab === 'STATS'} onClick={() => setActiveTab('STATS')} />
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
                                    <button 
                                        onClick={() => setSortMethod('ALPHABETICAL')}
                                        className={`flex-1 text-xs py-1.5 rounded-lg transition ${sortMethod === 'ALPHABETICAL' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-100'}`}
                                    >
                                        أبجدياً (أ-ي)
                                    </button>
                                    <button 
                                        onClick={() => setSortMethod('CODE')}
                                        className={`flex-1 text-xs py-1.5 rounded-lg transition ${sortMethod === 'CODE' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-100'}`}
                                    >
                                        بالكود (الأرقام)
                                    </button>
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
                                <input 
                                    className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition" 
                                    placeholder="الاسم الثلاثي" 
                                    value={newStudentName}
                                    onChange={e => setNewStudentName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">كود الطالب (لولي الأمر)</label>
                                <input 
                                    className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition font-mono text-center tracking-widest text-lg" 
                                    placeholder="مثال: 101" 
                                    value={newStudentCode}
                                    onChange={e => setNewStudentCode(e.target.value)}
                                />
                            </div>
                            <Button 
                                onClick={() => {
                                    if(newStudentName && newStudentCode) {
                                        onAddStudent(newStudentName, newStudentCode);
                                        setNewStudentName('');
                                        setNewStudentCode('');
                                        onShowNotification('تمت إضافة الطالب بنجاح', 'success');
                                    }
                                }}
                                className="w-full py-3 shadow-md text-lg"
                            >
                                تسجيل الطالب +
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'STATS' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3 text-lg">احصائية الحضور والغياب اليومية</h3>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-500">اختر التاريخ</label>
                                <input 
                                    type="date" 
                                    className="p-3 border rounded-lg bg-gray-50 w-full font-bold text-gray-700"
                                    value={statsDate}
                                    onChange={(e) => setStatsDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Present List */}
                            <div className="bg-white rounded-xl shadow-sm border-t-4 border-emerald-500 overflow-hidden">
                                <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center">
                                    <h4 className="font-bold text-emerald-800">✅ الحضور</h4>
                                    <span className="bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">{statsData.present.length}</span>
                                </div>
                                <div className="p-3 max-h-80 overflow-y-auto">
                                    {statsData.present.length === 0 ? (
                                        <p className="text-gray-400 text-sm text-center py-4">لا يوجد حضور مسجل</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {statsData.present.map(s => (
                                                <li key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition">
                                                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">{s.name.charAt(0)}</span>
                                                    <span className="text-gray-700 font-bold text-sm">{s.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Absent List */}
                            <div className="bg-white rounded-xl shadow-sm border-t-4 border-red-500 overflow-hidden">
                                <div className="bg-red-50 p-3 border-b border-red-100 flex justify-between items-center">
                                    <h4 className="font-bold text-red-800">❌ الغياب</h4>
                                    <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs font-bold">{statsData.absent.length}</span>
                                </div>
                                <div className="p-3 max-h-80 overflow-y-auto">
                                    {statsData.absent.length === 0 ? (
                                        <p className="text-gray-400 text-sm text-center py-4">لا يوجد غياب مسجل</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {statsData.absent.map(s => (
                                                <li key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100 transition">
                                                    <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">{s.name.charAt(0)}</span>
                                                    <span className="text-gray-700 font-bold text-sm">{s.name}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ADAB' && (
                    <div className="animate-slide-up">
                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-md">
                            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-lg">
                                🌟 مجلس الآداب
                            </h3>
                            <p className="text-xs text-amber-700 mb-4">سيتم إرسال الأسئلة لجميع الطلاب (دون تسجيلهم حضور تلقائياً)، ليجيبوا عليها من المنزل.</p>
                            
                            <div className="space-y-3">
                                <input 
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" 
                                    placeholder="عنوان الدرس (مثال: آداب الاستئذان)" 
                                    value={adabTitle}
                                    onChange={e => setAdabTitle(e.target.value)}
                                />
                                
                                <div className="bg-white p-3 rounded-lg border border-amber-100">
                                    <h4 className="text-sm font-bold text-gray-600 mb-2">إضافة سؤال جديد</h4>
                                    <textarea 
                                        className="w-full p-3 border rounded-lg h-24 mb-2 focus:ring-2 focus:ring-amber-400 outline-none" 
                                        placeholder="نص السؤال..." 
                                        value={currentQuestion}
                                        onChange={e => setCurrentQuestion(e.target.value)}
                                    ></textarea>
                                    <div className="grid gap-2 mb-2">
                                        <input 
                                            className="w-full p-3 border border-green-300 rounded-lg bg-green-50" 
                                            placeholder="الإجابة الصحيحة ✅" 
                                            value={currentCorrect}
                                            onChange={e => setCurrentCorrect(e.target.value)}
                                        />
                                        <input 
                                            className="w-full p-3 border border-red-200 rounded-lg bg-red-50" 
                                            placeholder="إجابة خاطئة 1 ❌" 
                                            value={currentWrong1}
                                            onChange={e => setCurrentWrong1(e.target.value)}
                                        />
                                        <input 
                                            className="w-full p-3 border border-red-200 rounded-lg bg-red-50" 
                                            placeholder="إجابة خاطئة 2 (اختياري) ❌" 
                                            value={currentWrong2}
                                            onChange={e => setCurrentWrong2(e.target.value)}
                                        />
                                    </div>
                                    <Button onClick={handleAddToQuestionList} className="w-full py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300">
                                        + إضافة السؤال للقائمة
                                    </Button>
                                </div>

                                {adabQuestionsList.length > 0 && (
                                    <div className="mt-4 border-t border-amber-200 pt-3">
                                        <h4 className="text-xs font-bold text-gray-500 mb-2">الأسئلة المضافة ({adabQuestionsList.length})</h4>
                                        <div className="space-y-2">
                                            {adabQuestionsList.map((q, idx) => (
                                                <div key={idx} className="bg-white p-2 rounded text-sm border flex justify-between items-center">
                                                    <span className="truncate flex-1 font-bold">{idx + 1}. {q.question}</span>
                                                    <button onClick={() => setAdabQuestionsList(adabQuestionsList.filter((_, i) => i !== idx))} className="text-red-500 px-2 font-bold">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button onClick={handlePublishAdabLesson} className="w-full mt-4 shadow-md bg-amber-600 hover:bg-amber-700 py-3 text-lg">
                                    نشر الدرس 📢
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ATTENDANCE' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-red-50 opacity-50 z-0 pointer-events-none"></div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-xl text-gray-800 mb-2">هل تريد تسجيل الغياب لهذا اليوم؟</h3>
                                <p className="text-gray-500 text-sm mb-4">سيتم تسجيل الغياب للطلاب التالية أسماؤهم:</p>
                                
                                {unloggedStudents.length === 0 ? (
                                    <div className="bg-green-100 text-green-700 p-2 rounded-lg mb-4 text-sm font-bold">
                                        ✨ جميع الطلاب تم تسجيلهم اليوم!
                                    </div>
                                ) : (
                                    <div className="bg-white/80 p-3 rounded-lg border border-red-100 mb-4 max-h-40 overflow-y-auto">
                                        <ul className="text-right space-y-1">
                                            {unloggedStudents.map(s => (
                                                <li key={s.id} className="text-xs text-red-600 font-bold flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                                                    {s.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <Button 
                                    variant="danger" 
                                    onClick={() => onMarkAbsences(unloggedStudents.map(s => s.id))} 
                                    disabled={unloggedStudents.length === 0}
                                    className="w-full py-4 text-lg shadow-xl hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {unloggedStudents.length === 0 ? 'لا يوجد غياب' : 'نعم، تسجيل الغياب'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ANNOUNCEMENTS' && (
                    <div className="animate-slide-up space-y-4">
                       <div className="bg-white p-4 rounded-lg shadow space-y-3 border-t-4 border-blue-500">
                           <h3 className="font-bold text-blue-800 text-lg">📢 إضافة إعلان جديد</h3>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">نوع الإعلان</label>
                               <select 
                                   className="w-full p-2 border rounded-lg bg-white"
                                   value={announcementType}
                                   onChange={(e) => setAnnouncementType(e.target.value as any)}
                               >
                                   <option value="GENERAL">اعلان عام</option>
                                   <option value="COMPETITION">اعلان مسابقة</option>
                                   <option value="EXAM">اختبار شهر</option>
                               </select>
                           </div>

                           {announcementType === 'EXAM' && (
                               <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                   <div>
                                       <label className="block text-xs font-bold text-gray-600 mb-1">اختر المحفظ المشرف على الاختبار</label>
                                       <select 
                                           className="w-full p-2 border rounded-lg bg-white"
                                           value={examProctorId}
                                           onChange={(e) => setExamProctorId(e.target.value)}
                                       >
                                           <option value="">-- اختر محفظاً آخر --</option>
                                           {allTeachers.filter(t => t.id !== teacherId).map(t => (
                                               <option key={t.id} value={t.id}>{t.name}</option>
                                           ))}
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ الاختبار</label>
                                       <input 
                                           type="date"
                                           className="w-full p-2 border rounded-lg bg-white"
                                           value={examDate}
                                           onChange={(e) => setExamDate(e.target.value)}
                                       />
                                   </div>
                               </div>
                           )}

                           {announcementType === 'COMPETITION' && (
                               <div className="space-y-3 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                   <h4 className="text-xs font-bold text-amber-800">جدول أيام المسابقة / الاختبار</h4>
                                   
                                   {compDays.map((day, idx) => (
                                       <div key={day.id} className="bg-white p-3 rounded border border-amber-200 shadow-sm relative">
                                           {compDays.length > 1 && (
                                               <button onClick={() => handleRemoveCompDay(day.id)} className="absolute top-2 left-2 text-red-400 hover:text-red-600 font-bold">×</button>
                                           )}
                                           <div className="mb-2">
                                               <label className="block text-[10px] font-bold text-gray-500 mb-1">تاريخ اليوم {idx + 1}</label>
                                               <input 
                                                    type="date" 
                                                    className="w-full p-1 border rounded text-sm"
                                                    value={day.date}
                                                    onChange={e => handleCompDateChange(day.id, e.target.value)}
                                               />
                                           </div>
                                           <div>
                                               <label className="block text-[10px] font-bold text-gray-500 mb-1">أضف الأجزاء/المستويات لهذا اليوم</label>
                                               <div className="flex gap-2 mb-2">
                                                    <select 
                                                        className="w-full p-1 border rounded text-xs"
                                                        onChange={(e) => {
                                                            handleAddLevelToDay(day.id, e.target.value);
                                                            e.target.value = '';
                                                        }}
                                                    >
                                                        <option value="">-- اختر الجزء/المستوى --</option>
                                                        {COMPETITION_LEVELS.map(lvl => (
                                                            <option key={lvl} value={lvl}>{lvl}</option>
                                                        ))}
                                                    </select>
                                               </div>
                                               <div className="flex flex-wrap gap-1">
                                                   {day.levels.map(lvl => (
                                                       <span key={lvl} className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                                                           {lvl}
                                                           <button onClick={() => handleRemoveLevelFromDay(day.id, lvl)} className="text-amber-600 hover:text-red-500">×</button>
                                                       </span>
                                                   ))}
                                               </div>
                                           </div>
                                       </div>
                                   ))}

                                   <button 
                                        onClick={handleAddCompDay} 
                                        className="w-full py-2 bg-white border border-dashed border-amber-400 text-amber-600 text-xs font-bold rounded hover:bg-amber-50"
                                   >
                                       + إضافة يوم آخر
                                   </button>
                               </div>
                           )}

                           <textarea id="annContent" className="w-full border p-3 rounded-lg bg-blue-50 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none h-24" placeholder="اكتب تفاصيل الإعلان الإضافية هنا..."></textarea>
                           
                           <Button onClick={() => {
                               const textContent = (document.getElementById('annContent') as HTMLTextAreaElement).value;
                               
                               const isValidExam = announcementType === 'EXAM' && examProctorId && examDate;
                               const isValidComp = announcementType === 'COMPETITION' && compDays.every(d => d.date && d.levels.length > 0);
                               const isValidGeneral = announcementType === 'GENERAL' && textContent;

                               if(isValidGeneral || isValidExam || isValidComp) {
                                   let finalContent = textContent;
                                   
                                   if (announcementType === 'EXAM') {
                                       const proctorName = allTeachers.find(t => t.id === examProctorId)?.name || 'محفظ آخر';
                                       finalContent = `🔴 *تنبيه: اختبار شهر*\n` +
                                                      `🗓️ موعد الاختبار: ${new Date(examDate).toLocaleDateString('ar-EG', {weekday: 'long', day:'numeric', month:'long'})}\n` +
                                                      `👤 المشرف على الاختبار: ${proctorName}\n` +
                                                      `------------------\n${textContent}`;
                                   } else if (announcementType === 'COMPETITION') {
                                       let scheduleText = "";
                                       compDays.forEach(d => {
                                            const dateStr = new Date(d.date).toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'numeric'});
                                            const levelsStr = d.levels.join(' ، ');
                                            scheduleText += `📌 ${dateStr}: ${levelsStr}\n`;
                                       });

                                       finalContent = `🏆 *اعلان مسابقة*\n` +
                                                      `جدول الاختبارات:\n` +
                                                      `${scheduleText}` + 
                                                      `------------------\n${textContent}`;
                                   }

                                   onAddAnnouncement({
                                       id: Date.now().toString(),
                                       teacherId, teacherName, date: new Date().toISOString(),
                                       content: finalContent, type: announcementType
                                   });
                                   onShowNotification('تم النشر', 'success');
                                   (document.getElementById('annContent') as HTMLTextAreaElement).value = '';
                                   setExamProctorId('');
                                   setExamDate('');
                                   setCompDays([{ id: Date.now(), date: '', levels: [] }]);
                               } else {
                                   onShowNotification('يرجى ملء جميع البيانات المطلوبة (تواريخ ومستويات)', 'error');
                               }
                           }} className="w-full">نشر الإعلان</Button>
                       </div>
                       
                       <div className="space-y-2">
                           {announcements.filter(a => a.teacherId === teacherId).map(a => (
                               <div key={a.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                                   <div>
                                       <span className="text-[10px] text-gray-400 font-bold block mb-1">{new Date(a.date).toLocaleDateString('ar-EG')}</span>
                                       <p className="text-gray-800 text-sm font-medium whitespace-pre-wrap">{a.content}</p>
                                   </div>
                                   <button onClick={() => onDeleteAnnouncement(a.id)} className="text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold transition">حذف</button>
                               </div>
                           ))}
                       </div>
                  </div>
                )}

                {activeTab === 'DELETE' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
                            <h3 className="text-red-900 font-bold text-lg mb-4 text-center">حذف الطلاب</h3>
                            
                            {sortedStudents.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-400 font-bold">لا يوجد طلاب في القائمة.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sortedStudents.map(s => (
                                        <div key={s.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{s.name}</p>
                                                    <p className="text-xs text-gray-500">كود: {s.parentCode}</p>
                                                </div>
                                            </div>
                                            <DeleteRow student={s} onDelete={(id) => onDeleteStudents([id])} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
                            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                تسجيل تسميع اليوم
                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{logDate}</span>
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">وقت الحضور</label>
                                <TimePicker value={attendance.arrivalTime} onChange={(v) => setAttendance({...attendance, arrivalTime: v})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">وقت الانصراف</label>
                                <TimePicker value={attendance.departureTime || ''} onChange={(v) => setAttendance({...attendance, departureTime: v})} />
                            </div>
                        </div>

                        <AssignmentForm 
                            title="📖 الحفظ الجديد (تسميع)"
                            data={jadeed}
                            onChange={(f, v) => setJadeed({ ...jadeed, [f]: v })}
                            colorClass="border-emerald-200 bg-emerald-50/50"
                        />

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">🔄 المراجعة</h4>
                                <button 
                                    onClick={() => setMurajaahList([...murajaahList, { ...emptyAssignment, grade: Grade.VERY_GOOD }])}
                                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 font-bold"
                                >
                                    + إضافة
                                </button>
                            </div>
                            {murajaahList.map((m, idx) => (
                                <AssignmentForm 
                                    key={idx}
                                    title={`مراجعة ${idx + 1}`}
                                    data={m}
                                    onChange={(f, v) => {
                                        const newList = [...murajaahList];
                                        newList[idx] = { ...newList[idx], [f]: v };
                                        setMurajaahList(newList);
                                    }}
                                    colorClass="border-amber-200 bg-amber-50/50"
                                    canRemove
                                    onRemove={() => setMurajaahList(murajaahList.filter((_, i) => i !== idx))}
                                />
                            ))}
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">ملاحظات / رسالة لولي الأمر</label>
                            <textarea 
                                className="w-full p-3 border rounded-lg text-sm h-24 mb-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="اكتب ملاحظاتك هنا..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            ></textarea>
                            
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <Button 
                                    onClick={handleGenerateAIMessage}
                                    className="w-full text-xs py-2 bg-purple-600 hover:bg-purple-700 flex justify-center"
                                    isLoading={isGeneratingAI}
                                >
                                    ✨ توليد رسالة تشجيعية (AI)
                                </Button>
                                {selectedStudent.parentPhone && (
                                    <button 
                                        onClick={handleSendWhatsApp}
                                        className="w-full bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 shadow flex items-center justify-center gap-2 text-xs font-bold transition"
                                        title="إرسال عبر واتساب"
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        إرسال التقرير
                                    </button>
                                )}
                            </div>
                        </div>

                        <Button onClick={handleSaveLog} className="w-full py-4 text-lg shadow-xl mb-4 bg-emerald-700 hover:bg-emerald-800">
                            💾 حفظ السجل
                        </Button>
                    </div>
                )}

                {studentTab === 'PLAN' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 border border-blue-100 relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-300"></div>
                        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                            📅 تحديد الواجب القادم (اللوح)
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">حدد ما يجب على الطالب حفظه أو مراجعته للمرة القادمة.</p>

                        <AssignmentForm 
                            title="حفظ للمرة القادمة"
                            data={nextJadeed}
                            onChange={(f, v) => setNextJadeed({ ...nextJadeed, [f]: v })}
                            colorClass="border-blue-200 bg-blue-50/50"
                            hideGrade
                        />

                        <div className="mb-2">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-gray-700 text-sm">مراجعة للمرة القادمة</h4>
                                <button 
                                    onClick={() => setNextMurajaahList([...nextMurajaahList, { ...emptyAssignment }])}
                                    className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded hover:bg-cyan-200 font-bold"
                                >
                                    + إضافة
                                </button>
                            </div>
                            {nextMurajaahList.map((m, idx) => (
                                <AssignmentForm 
                                    key={idx}
                                    title={`واجب مراجعة ${idx + 1}`}
                                    data={m}
                                    onChange={(f, v) => {
                                        const newList = [...nextMurajaahList];
                                        newList[idx] = { ...newList[idx], [f]: v };
                                        setNextMurajaahList(newList);
                                    }}
                                    colorClass="border-cyan-200 bg-cyan-50/50"
                                    canRemove
                                    onRemove={() => setNextMurajaahList(nextMurajaahList.filter((_, i) => i !== idx))}
                                    hideGrade
                                />
                            ))}
                        </div>
                        <Button onClick={handleSaveLog} className="w-full py-3 mt-4 text-lg bg-blue-600 hover:bg-blue-700">
                            حفظ الواجب القادم
                        </Button>
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
                                    <div key={log.id} className={`relative p-5 rounded-xl border-r-4 shadow-sm transition-all hover:shadow-md ${log.isAbsent ? 'bg-red-50 border-r-red-500' : 'bg-white border-r-emerald-500 border border-gray-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                    📅 {new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1">{new Date(log.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                            {log.isAbsent ? (
                                                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">غياب ❌</span>
                                            ) : log.isAdab ? (
                                                <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded font-bold">يوم آداب ✨</span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">حضور ✅</span>
                                            )}
                                        </div>
                                        
                                        {!log.isAbsent && !log.isAdab && (
                                            <div className="space-y-2 text-sm">
                                                {log.jadeed && (
                                                    <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded border border-emerald-100">
                                                        <span className="text-emerald-600 font-bold">الحفظ:</span>
                                                        <span className="text-gray-800 flex-1">
                                                            {log.jadeed.type === 'SURAH' ? `سورة ${log.jadeed.name} (${log.jadeed.ayahFrom}-${log.jadeed.ayahTo})` : log.jadeed.name}
                                                        </span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded text-white ${log.jadeed.grade === Grade.EXCELLENT ? 'bg-emerald-500' : 'bg-blue-500'}`}>{log.jadeed.grade}</span>
                                                    </div>
                                                )}
                                                {log.murajaah && log.murajaah.length > 0 && (
                                                    <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                                        <span className="text-amber-600 font-bold block mb-1">المراجعة:</span>
                                                        <div className="space-y-1">
                                                            {log.murajaah.map((m, i) => (
                                                                <div key={i} className="flex justify-between text-gray-700 text-xs">
                                                                    <span>• {m.name}</span>
                                                                    <span className="font-bold">{m.grade}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {log.notes && (
                                            <p className="mt-2 text-xs text-gray-500 italic border-t pt-2">"{log.notes.split('\n')[0]}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {studentTab === 'CALC' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 animate-fade-in">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">🧮 حاسبة إنجاز الشهر</h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">كمية الحفظ اليومية (أسطر)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="مثال: 5" 
                                    value={calcAmount} 
                                    onChange={e => setCalcAmount(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">* يرجى إدخال عدد الأسطر (15 سطر = 1 صفحة)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">عدد أيام الحضور في الأسبوع</label>
                                <select 
                                    className="w-full p-2 border rounded-lg bg-white"
                                    value={calcWeeklyDays} 
                                    onChange={e => setCalcWeeklyDays(e.target.value)}
                                >
                                    {[1,2,3,4,5,6,7].map(d => (
                                        <option key={d} value={d}>{d} يوم</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center animate-pulse">
                                {renderCalculatorResult()}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">حفظ ملاحظات الخطة الشهرية</label>
                            <textarea 
                                className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="اكتب الملاحظات أو الخطة هنا..."
                                value={calcNotes}
                                onChange={e => setCalcNotes(e.target.value)}
                            ></textarea>
                            <Button onClick={handleSaveCalculator} className="w-full mt-2 text-sm bg-indigo-600 hover:bg-indigo-700">
                                حفظ الملاحظات
                            </Button>
                        </div>
                    </div>
                )}

                {studentTab === 'SCHEDULE' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 animate-fade-in">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg">⏰ جدول الطالب والأنشطة</h3>
                        <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded">هذا الجدول يملؤه ولي الأمر ليظهر لك الأوقات المشغولة والأنشطة.</p>
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

                {studentTab === 'FEES' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 animate-fade-in">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg">💰 الرسوم والمدفوعات</h3>
                        
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
                            <h4 className="font-bold text-emerald-800 text-sm mb-3">تسجيل دفعة جديدة</h4>
                            <div className="flex flex-col gap-2 mb-2">
                                <div className="flex gap-2">
                                    <select 
                                        className="p-2 border rounded text-sm bg-white flex-1"
                                        value={newFeeMonth}
                                        onChange={e => setNewFeeMonth(e.target.value)}
                                    >
                                        <option value="يناير">يناير</option>
                                        <option value="فبراير">فبراير</option>
                                        <option value="مارس">مارس</option>
                                        <option value="أبريل">أبريل</option>
                                        <option value="مايو">مايو</option>
                                        <option value="يونيو">يونيو</option>
                                        <option value="يوليو">يوليو</option>
                                        <option value="أغسطس">أغسطس</option>
                                        <option value="سبتمبر">سبتمبر</option>
                                        <option value="أكتوبر">أكتوبر</option>
                                        <option value="نوفمبر">نوفمبر</option>
                                        <option value="ديسمبر">ديسمبر</option>
                                    </select>
                                    <input 
                                        type="number" 
                                        placeholder="المبلغ (ج.م)" 
                                        className="w-1/2 p-2 border rounded text-sm"
                                        value={newFeeAmount}
                                        onChange={e => setNewFeeAmount(e.target.value)}
                                    />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="ملاحظات (اختياري)" 
                                    className="w-full p-2 border rounded text-sm"
                                    value={newFeeNotes}
                                    onChange={e => setNewFeeNotes(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddPayment} className="w-full text-sm">تسجيل الدفع +</Button>
                        </div>

                        {!selectedStudent.isFeeOverdue ? (
                             <div className="mb-6">
                                 <button 
                                     onClick={handleSendFeeReminder}
                                     className="w-full bg-amber-100 text-amber-800 px-4 py-3 rounded-xl border border-amber-200 font-bold text-sm shadow-sm hover:bg-amber-200 transition flex items-center justify-center gap-2"
                                 >
                                     🔔 إرسال تذكير بالرسوم لولي الأمر
                                 </button>
                                 <p className="text-[10px] text-gray-500 text-center mt-1">سيظهر إشعار فوري عند ولي الأمر عند الضغط</p>
                             </div>
                        ) : (
                             <div className="mb-6 bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                                 <p className="text-amber-800 text-sm font-bold">⚠️ تم إرسال تذكير بالرسوم</p>
                                 <p className="text-xs text-amber-600">سيختفي تلقائياً عند تسجيل دفعة جديدة.</p>
                             </div>
                        )}

                        <div className="space-y-2">
                            <h4 className="font-bold text-gray-600 text-xs mb-2">سجل المدفوعات السابق</h4>
                            {selectedStudent.payments.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center">لا يوجد مدفوعات مسجلة.</p>
                            ) : (
                                selectedStudent.payments.map(pay => (
                                    <div key={pay.id} className="bg-white p-3 border rounded shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-gray-800 text-sm">{pay.title}</p>
                                            <span className="font-bold text-emerald-600">{pay.amount} ج.م</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400">{new Date(pay.date).toLocaleDateString('ar-EG')} - استلمها: {pay.recordedBy}</p>
                                        {pay.notes && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1 rounded">📝 {pay.notes}</p>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
