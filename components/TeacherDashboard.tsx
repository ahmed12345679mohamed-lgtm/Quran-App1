
import React, { useState, useMemo, useEffect } from 'react';
import { Student, DailyLog, Grade, QuranAssignment, Payment, Announcement, AnnouncementType } from '../types';
import { SURAH_NAMES, JUZ_LIST, SURAH_DATA, MONTHS_LIST, DAYS_OF_WEEK } from '../constants';
import { Button } from './Button';
import { TimePicker } from './TimePicker';
import { generateEncouragement } from '../services/geminiService';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface TeacherDashboardProps {
  teacherName: string;
  teacherId: string;
  students: Student[];
  announcements: Announcement[];
  onUpdateStudent: (student: Student) => void;
  onAddStudent: (name: string, code: string) => Student; 
  onDeleteStudents: (ids: string[]) => void;
  onMarkAbsences: () => void;
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

const emptyAssignment: QuranAssignment = {
  type: 'SURAH',
  name: SURAH_NAMES[0],
  ayahFrom: 1,
  ayahTo: 7,
  grade: Grade.GOOD
};

const gradeToScore = (g: Grade) => {
    switch(g) {
      case Grade.EXCELLENT: return 5;
      case Grade.VERY_GOOD: return 4;
      case Grade.GOOD: return 3;
      case Grade.ACCEPTABLE: return 2;
      case Grade.NEEDS_WORK: return 1;
      default: return 0;
    }
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

// Sub-component for rendering a single assignment form
const AssignmentForm: React.FC<AssignmentFormProps> = ({ 
  data, 
  onChange, 
  title, 
  colorClass, 
  canRemove, 
  onRemove,
  hideGrade
}) => {
  const isSurah = data.type === 'SURAH';
  const isRange = data.type === 'RANGE';

  const maxAyahs = useMemo(() => {
    if (!isSurah) return 0;
    const surah = SURAH_DATA.find(s => s.name === data.name);
    return surah ? surah.count : 286; 
  }, [data.name, isSurah]);

  const ayahOptions = useMemo(() => {
    if (!isSurah) return [];
    return Array.from({ length: maxAyahs }, (_, i) => i + 1);
  }, [maxAyahs, isSurah]);
  
  return (
    <div className={`p-4 rounded-xl border ${colorClass} mb-4 relative shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        {/* Title and Remove Button Container */}
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800">{title}</h3>
            {canRemove && (
                <button 
                type="button"
                onClick={onRemove}
                className="text-red-400 hover:text-red-600 font-bold transition text-xl px-2"
                title="حذف هذا البند"
                >
                ✕
                </button>
            )}
        </div>

        <div className="flex bg-white rounded-lg p-1 border text-sm shadow-sm">
           <button 
             type="button"
             onClick={() => { 
                 onChange('type', 'SURAH'); 
                 onChange('name', SURAH_NAMES[0]); 
                 onChange('ayahFrom', 1);
                 onChange('ayahTo', 7);
             }}
             className={`px-3 py-1 rounded ${isSurah ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-gray-500'}`}
           >
             سورة
           </button>
           <button 
             type="button"
             onClick={() => { 
                 onChange('type', 'RANGE'); 
                 onChange('name', SURAH_NAMES[0]);
                 onChange('endName', SURAH_NAMES[1]); 
             }}
             className={`px-3 py-1 rounded ${isRange ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-gray-500'}`}
           >
             فرعي
           </button>
           <button 
             type="button"
             onClick={() => { 
                 onChange('type', 'JUZ'); 
                 onChange('name', JUZ_LIST[0]); 
             }}
             className={`px-3 py-1 rounded ${!isSurah && !isRange ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-gray-500'}`}
           >
             جزء
           </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* NAME SELECTION */}
        <div className={(!isSurah && !isRange) ? "md:col-span-2" : ""}>
          <label className="block text-sm font-bold text-gray-700 mb-1">
             {isSurah ? 'اسم السورة' : isRange ? 'من سورة' : 'اسم الجزء'}
          </label>
          <select 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            value={data.name}
            onChange={(e) => {
                const newName = e.target.value;
                onChange('name', newName);
                if (isSurah) {
                    onChange('ayahFrom', 1);
                    const newMax = SURAH_DATA.find(s => s.name === newName)?.count || 7;
                    onChange('ayahTo', newMax);
                }
            }}
          >
            {isSurah || isRange
              ? SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)
              : JUZ_LIST.map(j => <option key={j} value={j}>{j}</option>)
            }
          </select>
        </div>

        {/* RANGE END SELECTION */}
        {isRange && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">إلى سورة</label>
              <select 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                value={data.endName || SURAH_NAMES[0]}
                onChange={(e) => onChange('endName', e.target.value)}
              >
                {SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
        )}
        
        {/* GRADE */}
        {!hideGrade && (
            <div className={isRange ? "md:col-span-2" : ""}>
                <label className="block text-sm font-bold text-gray-700 mb-1">التقدير</label>
                <select 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                    value={data.grade}
                    onChange={(e) => onChange('grade', e.target.value as Grade)}
                >
                    {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
        )}

        {/* AYAH SELECTION (Only for Surah) */}
        {isSurah && (
            <div className="flex gap-4 md:col-span-2">
            <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">من آية</label>
                <select 
                className="w-full p-3 border rounded-lg text-center bg-white"
                value={data.ayahFrom}
                onChange={(e) => onChange('ayahFrom', Number(e.target.value))}
                >
                    {ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
            <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">إلى آية</label>
                <select 
                className="w-full p-3 border rounded-lg text-center bg-white"
                value={data.ayahTo}
                onChange={(e) => onChange('ayahTo', Number(e.target.value))}
                >
                    {ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
    teacherName,
    teacherId,
    students,
    announcements,
    onUpdateStudent, 
    onAddStudent,
    onDeleteStudents,
    onMarkAbsences,
    onAddAnnouncement,
    onDeleteAnnouncement,
    onLogout,
    onShowNotification
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'entry' | 'announcements'>('list');
  const [subTab, setSubTab] = useState<'log' | 'plan' | 'fees' | 'schedule'>('log');
  
  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false); // Edit Student Modal
  const [showDeleteStudent, setShowDeleteStudent] = useState(false);
  const [showAbsenceReport, setShowAbsenceReport] = useState(false); 
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]); 
  const [reportSubTab, setReportSubTab] = useState<'present' | 'absent'>('present');

  const [studentToDeleteId, setStudentToDeleteId] = useState<string>('');

  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState(''); 
  const [isFirstTimeStudent, setIsFirstTimeStudent] = useState(false);

  // Edit Student State
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentCode, setEditStudentCode] = useState('');
  
  // Daily Log State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogDate, setEditingLogDate] = useState<string | null>(null);

  const [jadeed, setJadeed] = useState<QuranAssignment>({ ...emptyAssignment });
  const [murajaahList, setMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment }]);
  const [notes, setNotes] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  const [isLogDirty, setIsLogDirty] = useState(false);
  const [isPlanDirty, setIsPlanDirty] = useState(false);
  
  const [nextJadeed, setNextJadeed] = useState<QuranAssignment>({ ...emptyAssignment });
  const [nextMurajaahList, setNextMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment }]);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const [feeAmount, setFeeAmount] = useState('');
  const [feeMonth, setFeeMonth] = useState(MONTHS_LIST[new Date().getMonth()] || MONTHS_LIST[0]);
  const [feeNotes, setFeeNotes] = useState('');

  // Announcements State
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState<AnnouncementType>('GENERAL');
  
  const [examMonth, setExamMonth] = useState(MONTHS_LIST[0]);
  const [examDays, setExamDays] = useState<string[]>([]);
  const [currentExamDay, setCurrentExamDay] = useState(DAYS_OF_WEEK[0]);

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === selectedStudentId), 
    [students, selectedStudentId]
  );

  const reportStats = useMemo(() => {
    const targetDateStr = new Date(reportDate).toDateString();
    
    const absentStudents = students.filter(s => 
        s.teacherId === teacherId && 
        s.logs.some(l => new Date(l.date).toDateString() === targetDateStr && l.isAbsent)
    ).sort((a, b) => a.name.localeCompare(b.name));
    
    const presentStudents = students.filter(s => 
        s.teacherId === teacherId && 
        s.logs.some(l => new Date(l.date).toDateString() === targetDateStr && !l.isAbsent)
    ).sort((a, b) => a.name.localeCompare(b.name));
    
    const total = students.filter(s => s.teacherId === teacherId).length;
    
    const isRecorded = absentStudents.length > 0 || presentStudents.length > 0;

    return {
        absent: absentStudents,
        present: presentStudents,
        total: total,
        isRecorded
    };
  }, [students, teacherId, reportDate]);

  const chartData = useMemo(() => {
    if (!selectedStudent) return [];
    return [...selectedStudent.logs]
        .filter(l => !l.isAbsent && l.jadeed)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7)
        .map(log => {
            const murajaahTotal = log.murajaah?.reduce((acc, cur) => acc + gradeToScore(cur.grade), 0) || 0;
            const murajaahAvg = (log.murajaah?.length || 0) > 0 ? murajaahTotal / log.murajaah!.length : 0;
            return {
                date: new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'short' }),
                jadeedScore: log.jadeed ? gradeToScore(log.jadeed.grade) : 0,
                murajaahScore: murajaahAvg
            };
        });
  }, [selectedStudent]);

  useEffect(() => {
    setIsLogDirty(false);
    setIsPlanDirty(false);
    resetLogForm(); 

    if (selectedStudent) {
        const todayStr = new Date().toDateString();
        const todayLog = selectedStudent.logs.find(l => new Date(l.date).toDateString() === todayStr);

        if (todayLog && !todayLog.isAbsent) {
            setEditingLogId(todayLog.id);
            setEditingLogDate(todayLog.date);
            if (todayLog.jadeed) setJadeed(todayLog.jadeed);
            if (todayLog.murajaah) setMurajaahList(todayLog.murajaah);
            if (todayLog.attendance) {
                setArrivalTime(todayLog.attendance.arrivalTime);
                setDepartureTime(todayLog.attendance.departureTime || '');
            }
            setNotes(todayLog.notes?.split('\n\n*رسالة المساعد الذكي:*')[0] || '');
        } else {
            if (selectedStudent.nextPlan) {
                const planJadeed = selectedStudent.nextPlan.jadeed;
                setJadeed({ ...planJadeed, grade: Grade.GOOD }); 
                
                const planMurajaah = selectedStudent.nextPlan.murajaah.map(m => ({
                    ...m,
                    grade: Grade.GOOD 
                }));
                setMurajaahList(planMurajaah);
            }
        }

        if (selectedStudent.nextPlan) {
            setNextJadeed(selectedStudent.nextPlan.jadeed);
            setNextMurajaahList(selectedStudent.nextPlan.murajaah);
        } else {
            setNextJadeed({ ...emptyAssignment });
            setNextMurajaahList([{ ...emptyAssignment }]);
        }
    }
  }, [selectedStudentId, students]);

  const resetLogForm = () => {
      setEditingLogId(null);
      setEditingLogDate(null);
      setJadeed({ ...emptyAssignment });
      setMurajaahList([{ ...emptyAssignment }]);
      setNotes('');
      setAiMessage('');
      setArrivalTime('');
      setDepartureTime('');
      setNextJadeed({ ...emptyAssignment });
      setNextMurajaahList([{ ...emptyAssignment }]);
  };

  const handleBackToList = () => {
      if (isLogDirty || isPlanDirty) {
          if (!window.confirm("هناك تغييرات غير محفوظة في السجل أو الخطة. هل أنت متأكد من الخروج دون حفظ؟")) {
              return;
          }
      }
      setActiveTab('list');
      setSelectedStudentId(null);
      setIsLogDirty(false);
      setIsPlanDirty(false);
  };

  const handleJadeedChange = (field: keyof QuranAssignment, val: any) => {
    setJadeed(prev => ({ ...prev, [field]: val }));
    setIsLogDirty(true);
  };
  const handleMurajaahChange = (index: number, field: keyof QuranAssignment, val: any) => {
    setMurajaahList(prev => {
        const newList = [...prev];
        newList[index] = { ...newList[index], [field]: val };
        return newList;
    });
    setIsLogDirty(true);
  };
  const addMurajaahItem = () => {
      setMurajaahList(prev => [...prev, { ...emptyAssignment }]);
      setIsLogDirty(true);
  };
  const removeMurajaahItem = (index: number) => {
      setMurajaahList(prev => prev.filter((_, i) => i !== index));
      setIsLogDirty(true);
  };

  const handleNextJadeedChange = (field: keyof QuranAssignment, val: any) => {
    setNextJadeed(prev => ({ ...prev, [field]: val }));
    setIsPlanDirty(true);
  };
  const handleNextMurajaahChange = (index: number, field: keyof QuranAssignment, val: any) => {
    setNextMurajaahList(prev => {
        const newList = [...prev];
        newList[index] = { ...newList[index], [field]: val };
        return newList;
    });
    setIsPlanDirty(true);
  };
  const addNextMurajaahItem = () => {
      setNextMurajaahList(prev => [...prev, { ...emptyAssignment }]);
      setIsPlanDirty(true);
  };
  const removeNextMurajaahItem = (index: number) => {
      setNextMurajaahList(prev => prev.filter((_, i) => i !== index));
      setIsPlanDirty(true);
  };


  const handleAddStudentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStudentName.trim() || !newStudentCode.trim()) {
          onShowNotification("يرجى إدخال الاسم وكود الطالب", 'error');
          return;
      }
      
      const codeExists = students.some(s => s.parentCode === newStudentCode);
      if (codeExists) {
          onShowNotification("هذا الكود مستخدم بالفعل لطالب آخر", 'error');
          return;
      }

      const newStudent = onAddStudent(newStudentName, newStudentCode);
      
      setShowAddStudent(false);
      setNewStudentName('');
      setNewStudentCode('');
      
      setSelectedStudentId(newStudent.id);
      setActiveTab('entry');
      
      if (isFirstTimeStudent) {
          setSubTab('plan');
          onShowNotification('تم إضافة الطالب بنجاح. يرجى تحديد الخطة.', 'success');
      } else {
          setSubTab('log');
          onShowNotification('تم إضافة الطالب بنجاح', 'success');
      }
      setIsFirstTimeStudent(false);
  };

  // Handle Edit Student
  const handleOpenEditStudent = () => {
      if (!selectedStudent) return;
      setEditStudentName(selectedStudent.name);
      setEditStudentCode(selectedStudent.parentCode);
      setShowEditStudent(true);
  };

  const handleEditStudentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent) return;
      if (!editStudentName.trim() || !editStudentCode.trim()) {
          onShowNotification("يرجى إدخال الاسم وكود الطالب", 'error');
          return;
      }

      // Check for code uniqueness (excluding current student)
      const codeExists = students.some(s => s.parentCode === editStudentCode && s.id !== selectedStudent.id);
      if (codeExists) {
          onShowNotification("هذا الكود مستخدم بالفعل لطالب آخر", 'error');
          return;
      }

      const updatedStudent = {
          ...selectedStudent,
          name: editStudentName,
          parentCode: editStudentCode
      };

      onUpdateStudent(updatedStudent);
      setShowEditStudent(false);
      onShowNotification('تم تحديث بيانات الطالب بنجاح', 'success');
  };

  const handleDeleteStudentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!studentToDeleteId) return;
      onDeleteStudents([studentToDeleteId]);
      setShowDeleteStudent(false);
      setStudentToDeleteId('');
  };

  const handleMarkAbsencesWrapper = () => {
      onMarkAbsences();
      setReportDate(new Date().toISOString().split('T')[0]);
      setReportSubTab('absent');
      setTimeout(() => {
          setShowAbsenceReport(true);
      }, 100);
  };

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedStudent) return;

    const logId = editingLogId || Date.now().toString();
    const logDate = editingLogId && editingLogDate ? editingLogDate : new Date().toISOString();

    const newLog: DailyLog = {
      id: logId,
      date: logDate,
      teacherId: teacherId,
      teacherName: teacherName,
      jadeed,
      murajaah: murajaahList,
      attendance: arrivalTime ? { arrivalTime, departureTime } : undefined,
      notes: aiMessage ? `${notes}\n\n*رسالة المساعد الذكي:* ${aiMessage}` : notes,
      seenByParent: false,
      isAbsent: false 
    };

    let updatedLogs;
    if (editingLogId) {
        updatedLogs = selectedStudent.logs.map(l => l.id === editingLogId ? newLog : l);
    } else {
        updatedLogs = [newLog, ...selectedStudent.logs];
    }

    const updatedStudent = {
      ...selectedStudent,
      logs: updatedLogs,
    };

    onUpdateStudent(updatedStudent);
    setIsLogDirty(false); 
    
    if (editingLogId) {
        onShowNotification('تم تحديث السجل بنجاح وإشعار ولي الأمر', 'success');
    } else {
        onShowNotification('تم حفظ السجل اليومي وتأكيد الحضور بنجاح!', 'success');
        setEditingLogId(logId);
        setEditingLogDate(logDate);
    }
  };

  const handleDeleteLog = (logId: string) => {
      if (!selectedStudent || !window.confirm('هل أنت متأكد من حذف هذا السجل؟ سيتم إزالته من عند ولي الأمر أيضاً.')) return;
      
      const updatedLogs = selectedStudent.logs.filter(l => l.id !== logId);
      const updatedStudent = { ...selectedStudent, logs: updatedLogs };
      onUpdateStudent(updatedStudent);
      
      if (editingLogId === logId) {
          resetLogForm();
      }
      setIsLogDirty(false);
      onShowNotification('تم حذف السجل بنجاح', 'success');
  };

  const handleSubmitPlan = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId || !selectedStudent) return;

      const updatedStudent = {
          ...selectedStudent,
          nextPlan: {
              jadeed: nextJadeed,
              murajaah: nextMurajaahList
          }
      };

      onUpdateStudent(updatedStudent);
      setIsPlanDirty(false); 
      onShowNotification('تم حفظ اللوح (خطة الغد) بنجاح!', 'success');
  };

  const handleAddPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudentId || !feeAmount || !feeMonth || !selectedStudent) return;

      const newPayment: Payment = {
          id: Date.now().toString(),
          title: "رسوم شهر " + feeMonth,
          amount: Number(feeAmount),
          date: new Date().toISOString(),
          recordedBy: teacherName,
          notes: feeNotes
      };

      const updatedStudent = {
          ...selectedStudent,
          payments: [newPayment, ...selectedStudent.payments]
      };

      onUpdateStudent(updatedStudent);
      setFeeAmount('');
      setFeeNotes('');
      onShowNotification('تم تسجيل الرسوم', 'success');
  };

  // Edit Announcement
  const handleEditAnnouncement = (ann: Announcement) => {
      setEditingAnnouncementId(ann.id);
      setNewAnnouncementType(ann.type);
      setNewAnnouncementContent(ann.content); // Simplified for general, for Exam it's tricky but workable
      
      // If exam, try to parse
      if (ann.type === 'EXAM') {
          // Rudimentary parsing, or just let user rewrite
          // For simplicity, we just load content and let them overwrite
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddAnnouncementSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      let finalContent = newAnnouncementContent;

      if (newAnnouncementType === 'EXAM') {
          if (examDays.length > 0) {
              finalContent = `اختبار شهر ${examMonth}\nالأيام المحددة: ${examDays.join('، ')}\n\nتفاصيل إضافية: ${newAnnouncementContent}`;
          }
      }
      
      if (!finalContent.trim()) return;

      if (editingAnnouncementId) {
          // Update existing
          // We need to pass this up to App.tsx really, but for now we'll simulate by deleting and adding (bad practice but quick)
          // Better: use onAddAnnouncement which sets state in App.tsx. 
          // Since onAddAnnouncement appends, we need an update method.
          // For now, let's delete old and add new to simulate update
          onDeleteAnnouncement(editingAnnouncementId);
          onAddAnnouncement({
            id: editingAnnouncementId, // Keep ID
            teacherId,
            teacherName,
            content: finalContent,
            type: newAnnouncementType,
            date: new Date().toISOString()
          });
          onShowNotification('تم تحديث الإعلان بنجاح', 'success');
      } else {
          onAddAnnouncement({
              id: Date.now().toString(),
              teacherId,
              teacherName,
              content: finalContent,
              type: newAnnouncementType,
              date: new Date().toISOString()
          });
          onShowNotification('تم نشر الإعلان بنجاح', 'success');
      }

      setNewAnnouncementContent('');
      setExamDays([]);
      setEditingAnnouncementId(null);
  };

  const handleGenerateAI = async () => {
    if (!selectedStudent) return;
    setIsGeneratingAI(true);
    const tempLog: DailyLog = {
        id: 'temp', date: new Date().toISOString(), teacherId: 'temp', teacherName: 'temp',
        jadeed, murajaah: murajaahList, seenByParent: false
    };
    const message = await generateEncouragement(selectedStudent.name, tempLog);
    setAiMessage(message);
    setIsGeneratingAI(false);
    setIsLogDirty(true);
  };

  const addExamDay = () => {
      if (!examDays.includes(currentExamDay)) {
          setExamDays([...examDays, currentExamDay]);
      }
  };

  const hasStudents = students.length > 0;

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {/* Dynamic Navbar */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 py-3">
            
            {/* VIEW 1: STUDENT LIST / MAIN DASHBOARD */}
            {activeTab === 'list' && (
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-200 text-xl">
                                 {teacherName.charAt(0)}
                             </div>
                             <div>
                                <h1 className="text-lg font-bold text-gray-800 font-serif leading-tight">{teacherName}</h1>
                                <p className="text-xs text-gray-500">مشرف الحلقة</p>
                             </div>
                        </div>
                        <Button variant="outline" onClick={onLogout} className="text-xs px-2 py-1 h-8">خروج</Button>
                    </div>

                    <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar items-center">
                         <button 
                            onClick={() => setShowAddStudent(true)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm whitespace-nowrap hover:bg-emerald-700 transition flex items-center gap-1 active:scale-95 transform"
                         >
                             + طالب جديد
                         </button>
                         <button 
                            onClick={handleMarkAbsencesWrapper}
                            className="bg-gray-800 text-white px-4 py-2 rounded-full text-sm font-bold border hover:bg-gray-900 transition whitespace-nowrap active:scale-95 transform shadow-sm"
                         >
                             إنهاء اليوم (غياب)
                         </button>
                         <button 
                            onClick={() => {
                                setReportDate(new Date().toISOString().split('T')[0]);
                                setShowAbsenceReport(true);
                            }}
                            className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50 transition whitespace-nowrap active:scale-95 transform shadow-sm"
                         >
                             📜 سجل الغياب
                         </button>
                         <button 
                            onClick={() => setActiveTab('announcements')}
                            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold border border-purple-200 hover:bg-purple-200 transition whitespace-nowrap active:scale-95 transform"
                         >
                             📢 الإعلانات
                         </button>
                         <button 
                            onClick={() => { setStudentToDeleteId(''); setShowDeleteStudent(true); }}
                            className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-100 transition whitespace-nowrap active:scale-95 transform"
                         >
                             حذف طالب
                         </button>
                    </div>
                </div>
            )}

            {/* VIEW 2: SELECTED STUDENT DETAIL */}
            {activeTab === 'entry' && selectedStudent && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                         <button 
                            onClick={handleBackToList} 
                            className="text-gray-500 hover:text-emerald-600 flex items-center gap-1 text-sm font-bold transition p-2"
                         >
                             <span className="text-xl leading-none">➜</span> عودة
                         </button>
                         <div className="text-center flex flex-col items-center">
                             <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-emerald-800">{selectedStudent.name}</h2>
                                <button 
                                  onClick={handleOpenEditStudent}
                                  className="text-gray-400 hover:text-blue-500 transition"
                                  title="تعديل بيانات الطالب"
                                >
                                    ✏️
                                </button>
                             </div>
                             {selectedStudent.parentPhone && <p className="text-lg font-bold text-gray-700 font-mono" dir="ltr">{selectedStudent.parentPhone}</p>}
                         </div>
                         <div className="w-12"></div> 
                    </div>
                    
                    {/* Centered Segmented Controls */}
                    <div className="flex justify-center">
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-md shadow-inner overflow-x-auto no-scrollbar">
                            <button 
                                onClick={() => setSubTab('log')}
                                className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap ${subTab==='log' ? 'bg-white text-emerald-700 shadow-sm transform scale-[1.02]' : 'text-gray-500 hover:bg-gray-200'} relative`}
                            >
                                السجل
                                {isLogDirty && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                            </button>
                            <button 
                                onClick={() => setSubTab('plan')}
                                className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap ${subTab==='plan' ? 'bg-white text-emerald-700 shadow-sm transform scale-[1.02]' : 'text-gray-500 hover:bg-gray-200'} relative`}
                            >
                                اللوح
                                {isPlanDirty && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                            </button>
                            <button 
                                onClick={() => setSubTab('schedule')}
                                className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap ${subTab==='schedule' ? 'bg-white text-emerald-700 shadow-sm transform scale-[1.02]' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                المواعيد
                            </button>
                            <button 
                                onClick={() => setSubTab('fees')}
                                className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap ${subTab==='fees' ? 'bg-white text-emerald-700 shadow-sm transform scale-[1.02]' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                الرسوم
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 3: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
                 <div className="flex items-center justify-between animate-fade-in">
                     <h2 className="text-lg font-bold text-purple-800">إدارة الإعلانات</h2>
                     <button onClick={() => setActiveTab('list')} className="text-gray-500 font-bold text-sm">↩ عودة للقائمة</button>
                 </div>
            )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-20">
        
        {/* ADD STUDENT MODAL */}
        {showAddStudent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
                    <h2 className="text-xl font-bold mb-4">إضافة طالب جديد</h2>
                    <form onSubmit={handleAddStudentSubmit}>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-bold">اسم الطالب (ثلاثي) <span className="text-red-500">*</span></label>
                            <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500"
                            placeholder="مثال: أحمد محمد علي"
                            value={newStudentName}
                            onChange={e => setNewStudentName(e.target.value)}
                            autoFocus
                            required
                            />
                            <p className="text-xs text-gray-500 mt-1">يرجى كتابة الاسم ثلاثياً لتجنب التشابه.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-bold">كود الطالب (رقم الدخول لولي الأمر)</label>
                            <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 font-mono"
                            value={newStudentCode}
                            onChange={e => setNewStudentCode(e.target.value)}
                            placeholder="مثال: 1050"
                            required
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 mb-6 bg-purple-50 p-3 rounded-xl border border-purple-100">
                            <input 
                              type="checkbox" 
                              id="firstTime"
                              checked={isFirstTimeStudent}
                              onChange={e => setIsFirstTimeStudent(e.target.checked)}
                              className="w-5 h-5 text-purple-600 rounded"
                            />
                            <label htmlFor="firstTime" className="text-sm font-bold text-purple-800 cursor-pointer select-none">
                                طالب جديد (أول مرة)
                                <span className="block text-xs font-normal text-gray-500 mt-1">
                                    عند التفعيل، سيتم تخطي السجل اليومي والانتقال مباشرة لتحديد "الخطة القادمة" (اللوح).
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowAddStudent(false)}>إلغاء</Button>
                            <Button type="submit">حفظ وإضافة</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* ... (Existing modals for Edit Student, Absence Report, Delete Student - NO CHANGES) ... */}
        {showEditStudent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
                    <h2 className="text-xl font-bold mb-4 text-emerald-800">تعديل بيانات الطالب</h2>
                    <form onSubmit={handleEditStudentSubmit}>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-bold">اسم الطالب</label>
                            <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500"
                            value={editStudentName}
                            onChange={e => setEditStudentName(e.target.value)}
                            required
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-bold">كود الطالب (رقم الدخول)</label>
                            <div className="bg-yellow-50 p-2 rounded mb-2 text-xs text-yellow-800 border border-yellow-200">
                                ⚠️ تنبيه: تغيير الكود سيجبر ولي الأمر على استخدام الكود الجديد للدخول.
                            </div>
                            <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 font-mono"
                            value={editStudentCode}
                            onChange={e => setEditStudentCode(e.target.value)}
                            required
                            />
                        </div>
                        
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowEditStudent(false)}>إلغاء</Button>
                            <Button type="submit">حفظ التعديلات</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showAbsenceReport && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white p-0 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold">📝 سجل الغياب والحضور</h2>
                            <p className="text-xs text-gray-300 mt-1">تقرير مفصل لليوم</p>
                        </div>
                        <button onClick={() => setShowAbsenceReport(false)} className="text-white/70 hover:text-white text-2xl">×</button>
                    </div>
                    
                    <div className="p-4 bg-gray-100 border-b">
                        <label className="block text-xs font-bold text-gray-600 mb-1">اختر التاريخ لعرض التقرير:</label>
                        <input 
                            type="date" 
                            className="w-full p-2 rounded-lg border border-gray-300 font-bold text-center text-gray-800"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]} 
                        />
                    </div>

                    <div className="p-4 flex-1 overflow-hidden flex flex-col">
                        {!reportStats.isRecorded ? (
                             <div className="text-center py-8 flex-1 flex flex-col justify-center">
                                 <p className="text-gray-400 text-4xl mb-3">📂</p>
                                 <p className="text-gray-500">لا توجد سجلات محفوظة لهذا اليوم.</p>
                                 <p className="text-xs text-gray-400 mt-2">لم يتم أخذ الغياب أو تسجيل بيانات في هذا التاريخ.</p>
                             </div>
                        ) : (
                            <>
                                {/* Tabs for Present / Absent */}
                                <div className="flex bg-gray-200 p-1 rounded-lg mb-4 shrink-0">
                                    <button 
                                        onClick={() => setReportSubTab('present')}
                                        className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${reportSubTab==='present' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <span>✅ الحضور</span>
                                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">{reportStats.present.length}</span>
                                    </button>
                                    <button 
                                        onClick={() => setReportSubTab('absent')}
                                        className={`flex-1 py-2 px-2 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${reportSubTab==='absent' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <span>❌ الغياب</span>
                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">{reportStats.absent.length}</span>
                                    </button>
                                </div>

                                <div className="overflow-y-auto flex-1 pr-1">
                                    {reportSubTab === 'absent' && (
                                        <>
                                            <h3 className="font-bold text-red-700 mb-2 text-sm border-b pb-1">
                                                قائمة الغائبين ({reportStats.absent.length})
                                            </h3>
                                            {reportStats.absent.length === 0 ? (
                                                <p className="text-center text-gray-400 py-4 bg-gray-50 rounded-lg">الجميع حضور، ما شاء الله! 🎉</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {reportStats.absent.map(s => (
                                                        <li key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                                                            <span className="font-bold text-gray-800">{s.name}</span>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] text-gray-500">كود: {s.parentCode}</span>
                                                                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded mt-1">تم إبلاغ الولي</span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}

                                    {reportSubTab === 'present' && (
                                        <>
                                            <h3 className="font-bold text-emerald-700 mb-2 text-sm border-b pb-1">
                                                قائمة الحضور ({reportStats.present.length})
                                            </h3>
                                            {reportStats.present.length === 0 ? (
                                                <p className="text-center text-gray-400 py-4 bg-gray-50 rounded-lg">لا يوجد حضور مسجل.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {reportStats.present.map(s => (
                                                        <li key={s.id} className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 text-sm">
                                                                    {s.name.charAt(0)}
                                                                </div>
                                                                <span className="font-bold text-gray-800">{s.name}</span>
                                                            </div>
                                                            <span className="text-emerald-600 text-xl">✓</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="p-4 border-t bg-gray-50 text-center">
                        <Button onClick={() => setShowAbsenceReport(false)} className="w-full bg-gray-700 hover:bg-gray-800">إغلاق التقرير</Button>
                    </div>
                </div>
            </div>
        )}

        {showDeleteStudent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                    <h2 className="text-xl font-bold mb-4 text-red-600">حذف طالب</h2>
                    <p className="mb-4 text-gray-600 text-sm">اختر اسم الطالب الذي تريد حذفه. هذا الإجراء لا يمكن التراجع عنه.</p>
                    <form onSubmit={handleDeleteStudentSubmit}>
                        <label className="block mb-2 text-sm font-bold">اختر الاسم</label>
                        <select 
                          className="w-full p-3 border rounded-xl mb-6 bg-gray-50"
                          value={studentToDeleteId}
                          onChange={e => setStudentToDeleteId(e.target.value)}
                          required
                        >
                            <option value="">-- اختر الطالب --</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        
                        <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={() => setShowDeleteStudent(false)}>إلغاء</Button>
                            <Button type="submit" className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50" disabled={!studentToDeleteId}>
                                تأكيد الحذف
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {activeTab === 'announcements' && (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4 text-purple-800">{editingAnnouncementId ? 'تعديل الإعلان' : 'نشر إعلان جديد'}</h2>
                    <form onSubmit={handleAddAnnouncementSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1">نوع الإعلان</label>
                            <select 
                              value={newAnnouncementType}
                              onChange={e => setNewAnnouncementType(e.target.value as AnnouncementType)}
                              className="w-full p-3 border rounded-lg bg-white"
                            >
                                <option value="GENERAL">عام</option>
                                <option value="EXAM">اختبار شهري</option>
                                <option value="COMPETITION">مسابقة</option>
                            </select>
                        </div>

                        {newAnnouncementType === 'EXAM' && (
                            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-1">شهر الاختبار</label>
                                <select 
                                  value={examMonth}
                                  onChange={e => setExamMonth(e.target.value)}
                                  className="w-full p-3 border rounded-lg mb-3 bg-white"
                                >
                                    {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>

                                <label className="block text-sm font-bold text-gray-700 mb-1">أيام الاختبار</label>
                                <div className="flex gap-2 mb-2">
                                    <select 
                                      value={currentExamDay}
                                      onChange={e => setCurrentExamDay(e.target.value)}
                                      className="flex-1 p-3 border rounded-lg bg-white"
                                    >
                                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <Button type="button" onClick={addExamDay} variant="secondary">أضف يوم</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {examDays.map(day => (
                                        <span key={day} className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                            {day}
                                            <button 
                                              type="button" 
                                              onClick={() => setExamDays(examDays.filter(d => d !== day))}
                                              className="text-red-500 font-bold hover:text-red-700"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                {newAnnouncementType === 'EXAM' ? 'ملاحظات إضافية (اختياري)' : 'نص الإعلان'}
                            </label>
                            <textarea 
                              value={newAnnouncementContent}
                              onChange={e => setNewAnnouncementContent(e.target.value)}
                              className="w-full p-3 border rounded-lg h-24"
                              placeholder="تفاصيل الإعلان..."
                              required={newAnnouncementType !== 'EXAM'}
                            />
                        </div>
                        <div className="flex gap-2">
                            {editingAnnouncementId && (
                                <Button type="button" variant="outline" onClick={() => { setEditingAnnouncementId(null); setNewAnnouncementContent(''); }} className="flex-1">إلغاء</Button>
                            )}
                            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 text-lg">{editingAnnouncementId ? 'تحديث الإعلان' : 'نشر الإعلان'}</Button>
                        </div>
                    </form>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-gray-700">الإعلانات السابقة</h3>
                    {announcements.filter(a => a.teacherId === teacherId).length === 0 ? (
                        <p className="text-gray-500 text-center">لا توجد إعلانات منشورة</p>
                    ) : (
                        announcements.filter(a => a.teacherId === teacherId).map(ann => (
                            <div key={ann.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-start">
                                <div className="whitespace-pre-wrap">
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                                        ann.type === 'EXAM' ? 'bg-red-100 text-red-800' : 
                                        ann.type === 'COMPETITION' ? 'bg-gold-100 text-gold-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {ann.type === 'EXAM' ? 'اختبار' : ann.type === 'COMPETITION' ? 'مسابقة' : 'عام'}
                                    </span>
                                    <p className="mt-2 font-bold text-gray-800">{ann.content}</p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(ann.date).toLocaleDateString('ar-EG')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleEditAnnouncement(ann)}
                                      className="text-blue-500 hover:bg-blue-50 px-2 py-1 rounded text-sm font-bold"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                      onClick={() => onDeleteAnnouncement(ann.id)}
                                      className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-sm font-bold"
                                    >
                                        ❌
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {activeTab === 'list' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100 min-h-[60vh] relative">
            
            {!hasStudents ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <h2 className="text-5xl md:text-7xl font-bold text-gray-200 opacity-30 select-none mb-8">لا يوجد طلاب</h2>
                  <div className="bg-white/80 p-6 rounded-xl shadow-sm backdrop-blur-sm border border-gray-100">
                      <p className="text-gray-500 mb-4">قائمتك فارغة. ابدأ بإضافة طلاب.</p>
                      <Button onClick={() => setShowAddStudent(true)} className="text-lg px-8 py-3 shadow-md transform hover:scale-105">+ أضف طالب جديد</Button>
                  </div>
              </div>
            ) : (
              <>
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-700">قائمة طلاب مجموعتي</h2>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">{students.length} طالب</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                      {students.map(student => (
                      <div 
                          key={student.id} 
                          className="flex items-center justify-between p-4 rounded-xl border bg-emerald-50/50 border-emerald-100 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                          onClick={() => {
                               setSelectedStudentId(student.id); 
                               setActiveTab('entry'); 
                               setSubTab('log'); 
                          }}
                      >
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 font-bold shadow-sm">
                                  {student.name.charAt(0)}
                              </div>
                              <div>
                                  <p className="font-bold text-lg text-emerald-900">{student.name}</p>
                                  <div className="flex items-center gap-2">
                                      <p className="text-sm text-gray-600">كود: <span className="font-mono font-bold">{student.parentCode}</span></p>
                                      {student.parentPhone && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">📞</span>}
                                  </div>
                              </div>
                          </div>
                          <span className="text-emerald-600 text-xl font-bold">➜</span>
                      </div>
                      ))}
                  </div>
              </>
            )}
          </div>
        )}

        {/* ... (Entry View logic remains largely the same, handled by AssignmentForm updates) ... */}
        {activeTab === 'entry' && selectedStudent && (
          <div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                  
                  {subTab === 'log' && (
                      <form onSubmit={handleSubmitLog}>
                          {/* Attendance Time - Fixed Layout */}
                          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                  🕒 تسجيل الحضور
                              </h3>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-bold text-emerald-700 mb-1 text-center">وقت الحضور</label>
                                      <div className="flex justify-center">
                                          <TimePicker value={arrivalTime} onChange={(val) => { setArrivalTime(val); setIsLogDirty(true); }} />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-red-700 mb-1 text-center">وقت الانصراف</label>
                                      <div className="flex justify-center">
                                          <TimePicker value={departureTime} onChange={(val) => { setDepartureTime(val); setIsLogDirty(true); }} />
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Auto-filled info message */}
                          {!editingLogId && selectedStudent.nextPlan && (
                             <div className="mb-4 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-100 flex items-center gap-2">
                                 <span>ℹ️</span>
                                 <span>تم تعبئة الحفظ والمراجعة تلقائياً بناءً على خطة الأمس (اللوح).</span>
                             </div>
                          )}

                          {/* Jadeed Section */}
                          <div className="mb-6">
                               <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl">📖</span>
                                  <h3 className="text-lg font-bold text-emerald-800">الحفظ الجديد (تسميع اليوم)</h3>
                               </div>
                               <AssignmentForm 
                                  title="تفاصيل الحفظ" 
                                  data={jadeed} 
                                  onChange={handleJadeedChange}
                                  colorClass="bg-emerald-50 border-emerald-100"
                               />
                          </div>

                          {/* Murajaah Section */}
                          <div className="mb-6">
                               <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                      <span className="text-2xl">🔄</span>
                                      <h3 className="text-lg font-bold text-emerald-800">المراجعة (تسميع اليوم)</h3>
                                  </div>
                                  <button type="button" onClick={addMurajaahItem} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-emerald-200 transition">+ إضافة جزء</button>
                               </div>
                               
                               {murajaahList.map((item, index) => (
                                   <AssignmentForm 
                                      key={index}
                                      title={`المراجعة ${index + 1}`} 
                                      data={item} 
                                      onChange={(field, val) => handleMurajaahChange(index, field, val)}
                                      colorClass="bg-amber-50 border-amber-100"
                                      canRemove={murajaahList.length > 1}
                                      onRemove={() => removeMurajaahItem(index)}
                                   />
                               ))}
                          </div>

                          {/* Notes & AI */}
                          <div className="mb-6">
                              <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات المعلم</label>
                              <textarea 
                                  className="w-full p-3 border rounded-xl h-24 mb-2 bg-gray-50 focus:bg-white transition"
                                  placeholder="اكتب ملاحظاتك هنا..."
                                  value={notes}
                                  onChange={(e) => { setNotes(e.target.value); setIsLogDirty(true); }}
                              />
                              
                              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mt-2">
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="font-bold text-purple-800 flex items-center gap-2 text-sm">
                                          ✨ رسالة تشجيعية (ذكاء اصطناعي)
                                      </h4>
                                      <Button 
                                          type="button" 
                                          onClick={handleGenerateAI} 
                                          disabled={isGeneratingAI}
                                          variant="secondary"
                                          className="text-xs py-1 px-3"
                                      >
                                          {isGeneratingAI ? 'جاري الصياغة...' : 'اكتب لي رسالة'}
                                      </Button>
                                  </div>
                                  {aiMessage && (
                                      <div className="bg-white p-3 rounded-lg border border-purple-100 text-sm text-gray-700 italic relative shadow-sm">
                                          "{aiMessage}"
                                          <button 
                                              type="button" 
                                              onClick={() => setAiMessage('')}
                                              className="absolute top-1 left-2 text-gray-400 hover:text-red-500"
                                          >
                                              ×
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="flex gap-4">
                              <Button type="submit" className="flex-1 py-4 text-lg font-bold shadow-lg" disabled={!isLogDirty && !editingLogId}>
                                  {editingLogId ? 'حفظ التعديلات' : 'حفظ السجل اليومي'}
                              </Button>
                              {editingLogId && (
                                  <Button type="button" variant="danger" onClick={() => handleDeleteLog(editingLogId)}>
                                      حذف
                                  </Button>
                              )}
                          </div>
                          {editingLogId && selectedStudent.logs.find(l => l.id === editingLogId)?.seenByParent && (
                               <div className="mt-2 text-center text-xs text-green-600 font-bold">
                                   ✅ تم اطلاع ولي الأمر على هذا السجل
                               </div>
                          )}
                      </form>
                  )}

                  {subTab === 'plan' && (
                       <form onSubmit={handleSubmitPlan} className="space-y-6">
                           <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center mb-2">
                               <p className="text-blue-800 font-bold">📝 اللوح: تحديد واجب الحفظ والمراجعة لليوم القادم</p>
                           </div>

                           {/* Next Jadeed - Using AssignmentForm but hiding Grade */}
                           <div className="bg-white p-1 rounded-xl">
                               <h3 className="text-lg font-bold text-emerald-800 mb-2 border-b pb-2 flex items-center gap-2">
                                   <span>📖</span> واجب الحفظ الجديد (غداً)
                               </h3>
                               <AssignmentForm 
                                  title="الحفظ المطلوب" 
                                  data={nextJadeed} 
                                  onChange={handleNextJadeedChange}
                                  colorClass="bg-white border-emerald-200 shadow-md ring-1 ring-emerald-50"
                                  hideGrade={true} 
                               />
                           </div>

                           {/* Next Murajaah */}
                           <div className="bg-white p-1 rounded-xl">
                               <div className="flex justify-between items-center mb-2 border-b pb-2">
                                   <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                                       <span>🔄</span> واجب المراجعة (غداً)
                                   </h3>
                                   <button type="button" onClick={addNextMurajaahItem} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold hover:bg-blue-200 transition">+ بند إضافي</button>
                               </div>
                               
                               {nextMurajaahList.map((item, index) => (
                                   <AssignmentForm 
                                      key={index}
                                      title={`مراجعة ${index + 1}`} 
                                      data={item} 
                                      onChange={(field, val) => handleNextMurajaahChange(index, field, val)}
                                      colorClass="bg-white border-amber-200 shadow-md ring-1 ring-amber-50"
                                      canRemove={nextMurajaahList.length > 1}
                                      onRemove={() => removeNextMurajaahItem(index)}
                                      hideGrade={true} 
                                   />
                               ))}
                           </div>

                           <Button type="submit" className="w-full py-4 text-lg font-bold bg-emerald-700 hover:bg-emerald-800 shadow-lg mt-4" disabled={!isPlanDirty}>
                               💾 حفظ الخطة (اللوح)
                           </Button>
                       </form>
                  )}
                  
                  {subTab === 'schedule' && (
                      <div className="bg-white rounded-xl">
                          {/* ... schedule view ... */}
                          <h3 className="text-lg font-bold text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg text-center">
                              📅 الجدول المحدد من ولي الأمر
                          </h3>
                          <div className="space-y-3">
                              {selectedStudent.weeklySchedule.map((sched, idx) => (
                                  <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${sched.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                      <div className="font-bold text-gray-800 w-24">{sched.day}</div>
                                      <div className="flex-1 text-left font-mono font-bold">
                                          {sched.isActive ? (
                                              <span className="text-emerald-700 bg-white px-3 py-1 rounded shadow-sm">
                                                  {new Date(`2000/01/01 ${sched.expectedTime}`).toLocaleTimeString('ar-EG', {hour: 'numeric', minute:'2-digit'})}
                                              </span>
                                          ) : (
                                              <span className="text-gray-400 text-sm">مشغول / غياب</span>
                                          )}
                                      </div>
                                      <div className="text-2xl">
                                          {sched.isActive ? '✅' : '❌'}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {subTab === 'fees' && (
                      <div className="space-y-6">
                           {/* ... fees form ... */}
                           <div className="bg-gray-50 p-6 rounded-xl border">
                              <h3 className="font-bold text-lg mb-4">تسجيل دفعة جديدة</h3>
                              <form onSubmit={handleAddPayment} className="grid gap-4 md:grid-cols-2">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-600 mb-1">عن شهر</label>
                                      <select 
                                          value={feeMonth}
                                          onChange={e => setFeeMonth(e.target.value)}
                                          className="w-full p-3 border rounded-lg bg-white"
                                      >
                                          {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-600 mb-1">المبلغ (جنية)</label>
                                      <input 
                                          type="number"
                                          value={feeAmount}
                                          onChange={e => setFeeAmount(e.target.value)}
                                          className="w-full p-3 border rounded-lg"
                                          placeholder="0"
                                      />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-sm font-bold text-gray-600 mb-1">ملاحظات (اختياري)</label>
                                      <input 
                                          type="text"
                                          value={feeNotes}
                                          onChange={e => setFeeNotes(e.target.value)}
                                          className="w-full p-3 border rounded-lg"
                                          placeholder="مثال: تم دفع نصف المبلغ..."
                                      />
                                  </div>
                                  <div className="md:col-span-2">
                                      <Button type="submit" className="w-full py-3">تسجيل الدفع</Button>
                                  </div>
                              </form>
                          </div>

                          <div>
                              <h3 className="font-bold text-lg mb-4">سجل المدفوعات السابق</h3>
                              {selectedStudent.payments.length === 0 ? (
                                  <p className="text-gray-500">لا توجد مدفوعات مسجلة.</p>
                              ) : (
                                  <div className="space-y-2">
                                      {selectedStudent.payments.map(pay => (
                                          <div key={pay.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                                              <div>
                                                  <p className="font-bold text-gray-800">{pay.title}</p>
                                                  <p className="text-xs text-gray-500">{new Date(pay.date).toLocaleDateString('ar-EG')} - {pay.recordedBy}</p>
                                                  {pay.notes && <p className="text-xs text-blue-600 mt-1">{pay.notes}</p>}
                                              </div>
                                              <span className="font-bold text-emerald-600">{pay.amount} ج.م</span>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              {/* Simple Student Stats (Reduced) */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 pb-12">
                  <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                      <p className="text-gray-500 text-xs font-bold">الحضور (هذا الشهر)</p>
                      <p className="text-3xl font-bold text-emerald-600 mt-2">
                          {selectedStudent.logs.filter(l => !l.isAbsent && new Date(l.date).getMonth() === new Date().getMonth()).length}
                      </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                      <p className="text-gray-500 text-xs font-bold">إجمالي السجلات</p>
                      <p className="text-3xl font-bold text-blue-600 mt-2">{selectedStudent.logs.length}</p>
                  </div>
                   <div className="bg-white p-4 rounded-xl shadow-sm border text-center col-span-2">
                      <p className="text-gray-500 text-xs font-bold">مستوى التقدم (آخر 7 أيام)</p>
                      <div className="h-16 mt-2">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                  <Area type="monotone" dataKey="jadeedScore" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                              </AreaChart>
                           </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
