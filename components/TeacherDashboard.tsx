
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
  onSaveLog: (studentId: string, log: DailyLog, nextPlan: any) => Promise<void>; 
  onAddPayment: (studentId: string, payment: Payment) => Promise<void>;
  onAddStudent: (name: string, code: string) => Promise<Student>; 
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
  onSaveLog,
  onAddPayment,
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

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({ arrivalTime: '16:00', departureTime: '18:00' });
  const [jadeed, setJadeed] = useState<QuranAssignment>({ ...emptyAssignment });
  const [murajaahList, setMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
  const [notes, setNotes] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [nextJadeed, setNextJadeed] = useState<QuranAssignment>({ ...emptyAssignment, grade: Grade.GOOD });
  const [nextMurajaahList, setNextMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment }]);
  
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeMonth, setNewFeeMonth] = useState('يناير');
  const [newFeeNotes, setNewFeeNotes] = useState('');
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

  const handleSaveLogClick = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    const newLog: DailyLog = {
      id: '', 
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

    await onSaveLog(selectedStudent.id, newLog, nextPlan);
    setIsSaving(false);
    setSelectedStudentId(null);
  };

  const handleAddPayment = async () => {
      if(!selectedStudent || !newFeeAmount) return;
      const payment: Payment = {
          id: '',
          amount: parseFloat(newFeeAmount),
          date: new Date().toISOString(),
          title: `رسوم شهر ${newFeeMonth}`,
          recordedBy: teacherName,
          notes: newFeeNotes
      };
      
      await onAddPayment(selectedStudent.id, payment);
      
      const updatedStudent = {
          ...selectedStudent,
          isFeeOverdue: false 
      };
      onUpdateStudent(updatedStudent);
      setNewFeeAmount('');
      setNewFeeNotes('');
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
                            sortedStudents.map(student => {
                                const todayStr = new Date().toDateString();
                                const todayLog = student.logs.find(l => new Date(l.date).toDateString() === todayStr);
                                const isAbsentToday = todayLog?.isAbsent;
                                let cardBg = "bg-white";
                                let statusBadge = null;

                                if (todayLog) {
                                    if (isAbsentToday) {
                                        cardBg = "bg-red-50 border-l-4 border-l-red-500";
                                        statusBadge = <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1 w-fit">❌ غائب اليوم</span>;
                                    } else {
                                        cardBg = "bg-emerald-50 border-l-4 border-l-emerald-500";
                                        statusBadge = <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 w-fit">✅ تم التسميع اليوم</span>;
                                    }
                                }

                                return (
                                  <div key={student.id} className={`p-4 rounded-xl shadow-sm border flex justify-between items-center transition transform hover:scale-[1.01] cursor-pointer ${cardBg} mb-3`} onClick={() => handleOpenStudent(student)}>
                                    <div className="flex items-center gap-3 w-full">
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 bg-gray-100 text-gray-500`}>{student.name.charAt(0)}</div>
                                      <div className="flex-1">
                                        <div className="flex justify-between items-center"><h3 className="font-bold text-gray-800 text-lg">{student.name}</h3><span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded border border-gray-200 font-mono font-bold">{student.parentCode}</span></div>
                                        <div className="mt-1">{statusBadge}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                            })
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
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم الطالب</label><input className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition" placeholder="الاسم الثلاثي" value={newStudentName} onChange={e => setNewStudentName(e.target.value)}/></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">كود الطالب (لولي الأمر)</label><input className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white transition font-mono text-center tracking-widest text-lg" placeholder="مثال: 101" value={newStudentCode} onChange={e => setNewStudentCode(e.target.value)}/></div>
                            <Button 
                                onClick={async () => {
                                    if(newStudentName && newStudentCode) {
                                        await onAddStudent(newStudentName, newStudentCode);
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

                {activeTab === 'ADAB' && (
                    <div className="animate-slide-up">
                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-md">
                            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-lg">🌟 مجلس الآداب</h3>
                            <p className="text-xs text-amber-700 mb-4">سيتم إرسال الأسئلة لجميع الطلاب.</p>
                            <div className="space-y-3">
                                <input className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" placeholder="عنوان الدرس" value={adabTitle} onChange={e => setAdabTitle(e.target.value)}/>
                                <div className="bg-white p-3 rounded-lg border border-amber-100">
                                    <textarea className="w-full p-3 border rounded-lg h-24 mb-2 focus:ring-2 focus:ring-amber-400 outline-none" placeholder="نص السؤال..." value={currentQuestion} onChange={e => setCurrentQuestion(e.target.value)}></textarea>
                                    <div className="grid gap-2 mb-2">
                                        <input className="w-full p-3 border border-green-300 rounded-lg bg-green-50" placeholder="الإجابة الصحيحة ✅" value={currentCorrect} onChange={e => setCurrentCorrect(e.target.value)}/>
                                        <input className="w-full p-3 border border-red-200 rounded-lg bg-red-50" placeholder="إجابة خاطئة 1 ❌" value={currentWrong1} onChange={e => setCurrentWrong1(e.target.value)}/>
                                        <input className="w-full p-3 border border-red-200 rounded-lg bg-red-50" placeholder="إجابة خاطئة 2 (اختياري) ❌" value={currentWrong2} onChange={e => setCurrentWrong2(e.target.value)}/>
                                    </div>
                                    <Button onClick={() => {
                                        if (!currentQuestion || !currentCorrect || !currentWrong1) { onShowNotification("يرجى ملء السؤال", "error"); return; }
                                        setAdabQuestionsList([...adabQuestionsList, { id: 'q_'+Date.now(), question: currentQuestion, correctAnswer: currentCorrect, wrongAnswers: [currentWrong1, currentWrong2].filter(x=>x) }]);
                                        setCurrentQuestion(''); setCurrentCorrect(''); setCurrentWrong1(''); setCurrentWrong2('');
                                    }} className="w-full py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300">+ إضافة السؤال</Button>
                                </div>
                                {adabQuestionsList.length > 0 && (
                                    <div className="mt-4 border-t border-amber-200 pt-3"><h4 className="text-xs font-bold text-gray-500 mb-2">الأسئلة ({adabQuestionsList.length})</h4>
                                        {adabQuestionsList.map((q, idx) => (<div key={idx} className="bg-white p-2 rounded text-sm border mb-1 flex justify-between">{q.question}<button onClick={() => setAdabQuestionsList(l => l.filter((_,i)=>i!==idx))} className="text-red-500">×</button></div>))}
                                    </div>
                                )}
                                <Button onClick={() => {
                                    onPublishAdab(adabTitle, adabQuestionsList);
                                    setAdabQuestionsList([]);
                                    setAdabTitle('مجلس الآداب');
                                }} className="w-full mt-4 shadow-md bg-amber-600 hover:bg-amber-700 py-3 text-lg">نشر الدرس 📢</Button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'ATTENDANCE' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-500 text-center relative overflow-hidden">
                            <h3 className="font-bold text-xl text-gray-800 mb-2">تسجيل الغياب</h3>
                            <p className="text-gray-500 text-sm mb-4">للطلاب الذين لم يسجل لهم حضور اليوم:</p>
                            {unloggedStudents.length === 0 ? (
                                <div className="bg-green-100 text-green-700 p-2 rounded-lg mb-4 text-sm font-bold">✨ جميع الطلاب تم تسجيلهم!</div>
                            ) : (
                                <div className="bg-white/80 p-3 rounded-lg border border-red-100 mb-4 max-h-40 overflow-y-auto">
                                    <ul className="text-right space-y-1">{unloggedStudents.map(s => <li key={s.id} className="text-xs text-red-600 font-bold">❌ {s.name}</li>)}</ul>
                                </div>
                            )}
                            <Button variant="danger" onClick={() => onMarkAbsences(unloggedStudents.map(s => s.id))} disabled={unloggedStudents.length === 0} className="w-full py-4 text-lg shadow-xl">تسجيل الغياب</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'DELETE' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
                            <h3 className="text-red-900 font-bold text-lg mb-4 text-center">حذف الطلاب</h3>
                            {sortedStudents.map(s => (
                                <div key={s.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs">{s.name.charAt(0)}</div><p className="font-bold text-gray-800 text-sm">{s.name}</p></div>
                                    <DeleteRow student={s} onDelete={(id) => onDeleteStudents([id])} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'STATS' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-3 text-lg">احصائية الحضور</h3>
                            <input type="date" className="p-3 border rounded-lg bg-gray-50 w-full font-bold text-gray-700" value={statsDate} onChange={(e) => setStatsDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white rounded-xl shadow-sm border-t-4 border-emerald-500 overflow-hidden">
                                <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center"><h4 className="font-bold text-emerald-800">✅ الحضور</h4><span className="bg-emerald-200 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">{statsData.present.length}</span></div>
                                <div className="p-3 max-h-80 overflow-y-auto"><ul className="space-y-2">{statsData.present.map(s => <li key={s.id} className="text-gray-700 font-bold text-sm">🔹 {s.name}</li>)}</ul></div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm border-t-4 border-red-500 overflow-hidden">
                                <div className="bg-red-50 p-3 border-b border-red-100 flex justify-between items-center"><h4 className="font-bold text-red-800">❌ الغياب</h4><span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs font-bold">{statsData.absent.length}</span></div>
                                <div className="p-3 max-h-80 overflow-y-auto"><ul className="space-y-2">{statsData.absent.map(s => <li key={s.id} className="text-gray-700 font-bold text-sm">🔹 {s.name}</li>)}</ul></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ANNOUNCEMENTS' && (
                    <div className="animate-slide-up space-y-4">
                         <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                            <h3 className="font-bold text-gray-800 mb-2">📢 الإعلانات</h3>
                            <p className="text-xs text-gray-500 mb-4">إرسال تنبيهات عامة لأولياء الأمور</p>
                            
                            <div className="space-y-2 mb-4">
                                <Button onClick={() => onQuickAnnouncement('HOLIDAY')} className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                                    📢 إرسال تنبيه: عطلة غداً
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {announcements.length === 0 ? <p className="text-center text-gray-400 text-sm">لا توجد إعلانات سابقة</p> : 
                                announcements.map(ann => (
                                    <div key={ann.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{ann.content}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">{new Date(ann.date).toLocaleDateString('ar-EG')}</p>
                                        </div>
                                        <button onClick={() => onDeleteAnnouncement(ann.id)} className="text-red-500 text-xs">حذف</button>
                                    </div>
                                ))}
                            </div>
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
                    <TabButton compact id="CALC" label="حاسبة" icon="🧮" isActive={studentTab === 'CALC'} onClick={() => setStudentTab('CALC')} />
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
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">وقت الحضور</label><TimePicker value={attendance.arrivalTime} onChange={(v) => setAttendance({...attendance, arrivalTime: v})} /></div>
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">وقت الانصراف</label><TimePicker value={attendance.departureTime || ''} onChange={(v) => setAttendance({...attendance, departureTime: v})} /></div>
                        </div>

                        <AssignmentForm title="📖 الحفظ الجديد (تسميع)" data={jadeed} onChange={(f, v) => setJadeed({ ...jadeed, [f]: v })} colorClass="border-emerald-200 bg-emerald-50/50" />

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-gray-700 text-sm">🔄 المراجعة</h4><button onClick={() => setMurajaahList([...murajaahList, { ...emptyAssignment, grade: Grade.VERY_GOOD }])} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200 font-bold">+ إضافة</button></div>
                            {murajaahList.map((m, idx) => (<AssignmentForm key={idx} title={`مراجعة ${idx + 1}`} data={m} onChange={(f, v) => { const newList = [...murajaahList]; newList[idx] = { ...newList[idx], [f]: v }; setMurajaahList(newList); }} colorClass="border-amber-200 bg-amber-50/50" canRemove onRemove={() => setMurajaahList(murajaahList.filter((_, i) => i !== idx))} />))}
                        </div>

                        <div className="mb-4">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">ملاحظات / رسالة لولي الأمر</label>
                            <textarea className="w-full p-3 border rounded-lg text-sm h-24 mb-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="اكتب ملاحظاتك هنا..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <Button onClick={handleGenerateAIMessage} className="w-full text-xs py-2 bg-purple-600 hover:bg-purple-700 flex justify-center" isLoading={isGeneratingAI}>✨ توليد رسالة (AI)</Button>
                            </div>
                        </div>

                        <Button onClick={handleSaveLogClick} className="w-full py-4 text-lg shadow-xl mb-4 bg-emerald-700 hover:bg-emerald-800" isLoading={isSaving}>💾 حفظ السجل</Button>
                    </div>
                )}
                
                {studentTab === 'ARCHIVE' && (
                    <div className="bg-white rounded-xl shadow-lg p-4 animate-fade-in">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2 flex items-center gap-2">🗄️ سجل التسميع السابق</h3>
                        {selectedStudent.logs.length === 0 ? <p className="text-center text-gray-400 py-8">لا يوجد سجلات.</p> : (
                            <div className="space-y-4">{selectedStudent.logs.map(log => (
                                <div key={log.id} className={`relative p-5 rounded-xl border-r-4 shadow-sm ${log.isAbsent ? 'bg-red-50 border-r-red-500' : 'bg-white border-r-emerald-500 border border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div><h4 className="font-bold text-gray-800 flex items-center gap-2">📅 {new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</h4></div>
                                        {log.isAbsent ? <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">غياب ❌</span> : <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">حضور ✅</span>}
                                    </div>
                                    {!log.isAbsent && <div className="space-y-2 text-sm"><div className="flex items-center gap-2 bg-emerald-50 p-2 rounded border border-emerald-100"><span className="text-emerald-600 font-bold">الحفظ:</span><span className="text-gray-800 flex-1">{log.jadeed?.name}</span><span className={`text-[10px] px-2 py-0.5 rounded text-white ${log.jadeed?.grade === Grade.EXCELLENT ? 'bg-emerald-500' : 'bg-blue-500'}`}>{log.jadeed?.grade}</span></div></div>}
                                </div>
                            ))}</div>
                        )}
                    </div>
                )}

                {studentTab === 'FEES' && (
                     <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">إدارة الرسوم</h3>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStudent.isFeeOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {selectedStudent.isFeeOverdue ? 'مطلوب السداد ⚠️' : 'خالص ✅'}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                            <h4 className="font-bold text-gray-700 mb-3">تسجيل دفعة جديدة</h4>
                            <div className="space-y-3">
                                <input type="number" placeholder="المبلغ" className="w-full p-2 border rounded" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)} />
                                <select className="w-full p-2 border rounded" value={newFeeMonth} onChange={e => setNewFeeMonth(e.target.value)}>
                                    {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input placeholder="ملاحظات" className="w-full p-2 border rounded" value={newFeeNotes} onChange={e => setNewFeeNotes(e.target.value)} />
                                <Button onClick={handleAddPayment} className="w-full">تسجيل الدفع 💰</Button>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">سجل المدفوعات</h4>
                            {selectedStudent.payments.length === 0 ? <p className="text-gray-400 text-sm">لا توجد مدفوعات.</p> : selectedStudent.payments.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 mb-2 bg-white border border-gray-100 rounded shadow-sm">
                                    <div><p className="font-bold text-gray-800 text-sm">{p.title}</p><p className="text-xs text-gray-500">{new Date(p.date).toLocaleDateString('ar-EG')}</p></div>
                                    <span className="font-bold text-emerald-600">{p.amount} ج.م</span>
                                </div>
                            ))}
                        </div>
                     </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
