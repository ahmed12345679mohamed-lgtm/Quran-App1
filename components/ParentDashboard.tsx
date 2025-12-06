
import React, { useState, useEffect, useMemo } from 'react';
import { Student, Grade, WeeklySchedule, Announcement, DailyLog, CalendarEvent, QuizItem } from '../types';
import { Button } from './Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MONTHS_LIST, formatTime12Hour } from '../constants';
import { TimePicker } from './TimePicker';

interface ParentDashboardProps {
  student: Student;
  announcements: Announcement[];
  onUpdateStudent: (student: Student) => void;
  onLogout: () => void;
  onMarkSeen: (studentId: string, logIds: string[]) => void;
}

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

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ 
    student, 
    announcements, 
    onUpdateStudent, 
    onLogout, 
    onMarkSeen 
}) => {
    const [activeTab, setActiveTab] = useState<'timeline' | 'schedule' | 'fees' | 'next'>('timeline');
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [tempSchedule, setTempSchedule] = useState<WeeklySchedule[]>([]);
    
    // New Event State
    const [newEventName, setNewEventName] = useState('');
    const [newEventTime, setNewEventTime] = useState('16:00');
    const [addingEventDayIndex, setAddingEventDayIndex] = useState<number | null>(null);

    const [feeNotification, setFeeNotification] = useState<{ message: string, level: 1 | 2 | 3 } | null>(null);

    // Quiz State
    const [activeQuizLogId, setActiveQuizLogId] = useState<string | null>(null);
    const [quizStep, setQuizStep] = useState(0); // Current question index
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [quizStatus, setQuizStatus] = useState<'IDLE' | 'CONFIRMING' | 'RESULT'>('IDLE');
    const [currentScore, setCurrentScore] = useState(0);
    const [currentShuffledAnswers, setCurrentShuffledAnswers] = useState<string[]>([]);

    const sortedLogs = useMemo(() => {
        return [...student.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.logs]);

    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
    const isLatestAbsent = latestLog && latestLog.isAbsent && !latestLog.seenByParent;

    // Helper to check if a quiz is completed safely
    const isQuizCompleted = (log: DailyLog) => {
        // We consider it completed if parentQuizScore is not null/undefined
        return log.parentQuizScore != null; 
    };

    // Determine the quiz currently being taken (can be any log ID selected by user)
    const currentQuizLog = useMemo(() => {
        return student.logs.find(l => l.id === activeQuizLogId);
    }, [student.logs, activeQuizLogId]);

    // Stable shuffled answers for current question
    useEffect(() => {
        if (currentQuizLog && currentQuizLog.adabSession && currentQuizLog.adabSession.quizzes[quizStep]) {
             const q = currentQuizLog.adabSession.quizzes[quizStep];
             // Create a new shuffle
             const answers = [q.correctAnswer, ...q.wrongAnswers];
             // Simple shuffle
             for (let i = answers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [answers[i], answers[j]] = [answers[j], answers[i]];
             }
             setCurrentShuffledAnswers(answers);
        }
    }, [currentQuizLog?.id, quizStep]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDay(); 
        const daysSinceSaturday = (currentDay + 1) % 7; 
        const saturdayDate = new Date(now);
        saturdayDate.setDate(now.getDate() - daysSinceSaturday);
        saturdayDate.setHours(0,0,0,0);
        const weekPresence = student.logs.filter(l => {
            const d = new Date(l.date);
            return !l.isAbsent && d >= saturdayDate;
        }).length;
        const currentMonth = now.getMonth();
        const monthPresence = student.logs.filter(l => {
            const d = new Date(l.date);
            return !l.isAbsent && d.getMonth() === currentMonth && d.getFullYear() === now.getFullYear();
        }).length;
        return { weekPresence, monthPresence };
    }, [student.logs]);
  
    useEffect(() => {
      const checkFeeStatus = () => {
          // 1. Manual Flag from Teacher (Higher Priority)
          if (student.isFeeOverdue) {
              setFeeNotification({ message: `تنبيه: يرجى التواصل مع الإدارة لسداد الرسوم المستحقة.`, level: 3 });
              return;
          }

          // 2. Automatic Date Check
          const now = new Date();
          const day = now.getDate();
          if (day < 20) {
              setFeeNotification(null);
              return;
          }
          const currentMonth = MONTHS_LIST[now.getMonth()];
          const hasPaid = student.payments.some(p => p.title.includes(currentMonth));
          if (!hasPaid) {
              if (day >= 30) { setFeeNotification({ message: `تنبيه: نود تذكيركم بضرورة سداد رسوم شهر ${currentMonth} المستحقة.`, level: 3 }); } 
              else if (day >= 25) { setFeeNotification({ message: `تنويه: يرجى التكرم بسداد رسوم شهر ${currentMonth}.`, level: 2 }); } 
              else { setFeeNotification({ message: `تذكير: حان موعد سداد رسوم شهر ${currentMonth}.`, level: 1 }); }
          } else {
              setFeeNotification(null);
          }
      };
      checkFeeStatus();
    }, [student.payments, student.isFeeOverdue]);
  
    const handleStartEditSchedule = () => { 
        const currentSched = student.weeklySchedule.map(s => {
            // @ts-ignore
            if (s.expectedTime && (!s.events || s.events.length === 0)) {
               return {
                   ...s,
                   // @ts-ignore
                   events: [{ id: 'mig_' + Date.now(), title: 'موعد الحلقة', time: s.expectedTime }]
               }
            }
            return s;
        });
        setTempSchedule(currentSched); 
        setEditingSchedule(true); 
    };

    const handleAddEvent = (dayIndex: number) => {
        if (!newEventName) return;
        const newSched = [...tempSchedule];
        const newEvent: CalendarEvent = {
            id: 'evt_' + Date.now(),
            title: newEventName,
            time: newEventTime
        };
        const currentEvents = newSched[dayIndex].events || [];
        newSched[dayIndex] = {
            ...newSched[dayIndex],
            events: [...currentEvents, newEvent]
        };
        setTempSchedule(newSched);
        setNewEventName('');
        setAddingEventDayIndex(null);
    };

    const handleRemoveEvent = (dayIndex: number, eventId: string) => {
        const newSched = [...tempSchedule];
        newSched[dayIndex] = {
            ...newSched[dayIndex],
            events: newSched[dayIndex].events.filter(e => e.id !== eventId)
        };
        setTempSchedule(newSched);
    };

    const handleToggleDayOff = (dayIndex: number) => {
        const newSched = [...tempSchedule];
        newSched[dayIndex] = {
            ...newSched[dayIndex],
            isDayOff: !newSched[dayIndex].isDayOff
        };
        setTempSchedule(newSched);
    };

    const handleSaveSchedule = () => { 
        onUpdateStudent({ ...student, weeklySchedule: tempSchedule }); 
        setEditingSchedule(false); 
    };

    // --- QUIZ LOGIC ---
    const handleStartQuiz = (logId: string) => {
        // Reset everything before opening
        setQuizStep(0);
        setCurrentScore(0);
        setQuizStatus('IDLE');
        setSelectedAnswer(null);
        setActiveQuizLogId(logId);
    };

    const handleSubmitAnswer = () => {
        if (!currentQuizLog || !currentQuizLog.adabSession) return;
        setQuizStatus('CONFIRMING');
    };

    const handleConfirmAnswer = () => {
        if (!currentQuizLog || !currentQuizLog.adabSession) return;
        const currentQ = currentQuizLog.adabSession.quizzes[quizStep];
        
        const isCorrect = selectedAnswer === currentQ.correctAnswer;
        if (isCorrect) {
            setCurrentScore(prev => prev + 1);
        }
        setQuizStatus('RESULT');
    };

    const handleNextQuestion = () => {
        if (!currentQuizLog || !currentQuizLog.adabSession) return;
        
        if (quizStep < currentQuizLog.adabSession.quizzes.length - 1) {
            setQuizStep(prev => prev + 1);
            setQuizStatus('IDLE');
            setSelectedAnswer(null);
        } else {
            // Finish Quiz
            const updatedLogs = student.logs.map(l => {
                if (l.id === currentQuizLog.id) {
                    return { 
                        ...l, 
                        parentQuizScore: currentScore, 
                        parentQuizMax: currentQuizLog.adabSession!.quizzes.length, 
                        seenByParent: true, 
                        seenAt: new Date().toISOString() 
                    };
                }
                return l;
            });
            onUpdateStudent({ ...student, logs: updatedLogs });
            setActiveQuizLogId(null);
        }
    };
  
    const chartData = [...student.logs]
      .filter(l => !l.isAbsent && l.jadeed && !l.isAdab)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7)
      .map(log => {
        const murajaahTotal = log.murajaah?.reduce((acc, cur) => acc + gradeToScore(cur.grade), 0) || 0;
        const murajaahAvg = (log.murajaah?.length || 0) > 0 ? murajaahTotal / log.murajaah!.length : 0;
        return { date: new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'short' }), jadeedScore: log.jadeed ? gradeToScore(log.jadeed.grade) : 0, murajaahScore: murajaahAvg };
      });

    // Check if user has a completed Adab log for today (to filter announcements)
    const hasCompletedAdabToday = useMemo(() => {
        const todayStr = new Date().toDateString();
        return student.logs.some(l => 
            new Date(l.date).toDateString() === todayStr && 
            l.isAdab && 
            l.parentQuizScore !== undefined
        );
    }, [student.logs]);

    // Filter announcements: Hide "Please participate" if already done today
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(a => {
            // If announcement mentions "مشاركة" or "آداب" AND user has completed adab today, hide it
            if ((a.content.includes("مشاركة") || a.content.includes("آداب")) && hasCompletedAdabToday) {
                return false;
            }
            return true;
        });
    }, [announcements, hasCompletedAdabToday]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
             {/* Header */}
             <div className="bg-white shadow-md sticky top-0 z-20 px-4 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-700 border-2 border-emerald-50">
                        {student.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 text-lg">{student.name}</h1>
                        <p className="text-xs text-gray-500 font-bold">بوابة ولي الأمر</p>
                    </div>
                </div>
                <Button onClick={onLogout} variant="danger" className="text-xs px-3 py-2 shadow-sm">
                    خروج 🚪
                </Button>
             </div>

             <div className="p-4 max-w-lg mx-auto animate-fade-in relative">
                
                {/* --- QUIZ MODAL (FULL SCREEN OVERLAY) --- */}
                {/* This renders whenever activeQuizLogId is set */}
                {currentQuizLog && currentQuizLog.adabSession && (
                    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 border-amber-400 relative overflow-hidden flex flex-col max-h-[90vh]">
                             
                             {/* Header */}
                             <div className="flex justify-between items-center mb-6 border-b pb-4">
                                 <div>
                                    <h3 className="font-bold text-amber-900 text-lg">مسابقة اليوم 🌟</h3>
                                    <p className="text-xs text-amber-600">سؤال {quizStep + 1} من {currentQuizLog.adabSession.quizzes.length}</p>
                                 </div>
                                 <button onClick={() => setActiveQuizLogId(null)} className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold">✕</button>
                             </div>
                             
                             <div className="overflow-y-auto flex-1">
                                 {/* Question Text */}
                                 <div className="mb-8">
                                     <p className="text-xl font-bold text-gray-800 text-center leading-relaxed">
                                         {currentQuizLog.adabSession.quizzes[quizStep].question}
                                     </p>
                                 </div>

                                 {/* Answers Area */}
                                 {quizStatus !== 'RESULT' ? (
                                     <div className="space-y-3 mb-6">
                                         {currentShuffledAnswers.map((ans, idx) => (
                                             <button 
                                                key={idx}
                                                onClick={() => setSelectedAnswer(ans)}
                                                className={`w-full p-4 rounded-xl border-2 text-right font-bold transition-all transform active:scale-95 ${
                                                    selectedAnswer === ans 
                                                    ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-md ring-2 ring-amber-200' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white hover:border-amber-300'
                                                }`}
                                             >
                                                 {ans}
                                             </button>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="mb-6 text-center animate-bounce-in">
                                         {selectedAnswer === currentQuizLog.adabSession.quizzes[quizStep].correctAnswer ? (
                                             <div className="bg-green-100 p-6 rounded-2xl border-2 border-green-400 text-green-900 shadow-inner">
                                                 <p className="text-5xl mb-2">🎉</p>
                                                 <p className="font-bold text-2xl">إجابة صحيحة!</p>
                                                 <p className="text-sm mt-2 opacity-80">ممتاز يا بطل!</p>
                                             </div>
                                         ) : (
                                             <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-300 text-red-900 shadow-inner">
                                                 <p className="text-5xl mb-2">😢</p>
                                                 <p className="font-bold text-2xl">إجابة خاطئة</p>
                                                 <div className="mt-4 bg-white p-3 rounded-xl border border-red-100">
                                                     <p className="text-xs text-gray-500 mb-1">الإجابة الصحيحة هي:</p>
                                                     <p className="font-bold text-green-700 text-lg">{currentQuizLog.adabSession.quizzes[quizStep].correctAnswer}</p>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>

                             {/* Footer Actions */}
                             <div className="pt-4 border-t mt-auto">
                                 {quizStatus === 'IDLE' && (
                                     <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="w-full text-lg py-4 shadow-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                                         تأكيد الإجابة
                                     </Button>
                                 )}
                                 {quizStatus === 'CONFIRMING' && (
                                     <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setQuizStatus('IDLE')} className="flex-1 py-3 border-gray-300">تراجع</Button>
                                        <Button onClick={handleConfirmAnswer} className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 shadow-lg text-lg">
                                            نعم، متأكد ✅
                                        </Button>
                                     </div>
                                 )}
                                 {quizStatus === 'RESULT' && (
                                     <Button onClick={handleNextQuestion} className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg rounded-xl">
                                         {quizStep < currentQuizLog.adabSession.quizzes.length - 1 ? 'السؤال التالي ⬅' : 'إنهاء وعرض النتيجة 🏁'}
                                     </Button>
                                 )}
                             </div>
                        </div>
                    </div>
                )}
                {/* ------------------------------------- */}

                {/* Announcements */}
                {filteredAnnouncements.length > 0 && (
                   <div className="mb-4 space-y-2">
                       {filteredAnnouncements.map(a => (
                           <div key={a.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
                               <div className="flex items-start gap-3 relative z-10">
                                   <span className="text-2xl">📢</span>
                                   <div>
                                       <p className="text-xs font-bold text-blue-800 mb-1">{a.teacherName}</p>
                                       <p className="text-sm text-gray-800 font-medium leading-relaxed">{a.content}</p>
                                       <p className="text-[10px] text-gray-400 mt-2">{new Date(a.date).toLocaleDateString('ar-EG')}</p>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
                )}

                {/* Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md shadow-inner overflow-x-auto no-scrollbar border border-gray-200">
                        <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'timeline' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>📊 التقارير</button>
                        <button onClick={() => setActiveTab('next')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'next' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>📝 اللوح</button>
                        <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'schedule' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>📅 المواعيد</button>
                        <button onClick={() => setActiveTab('fees')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'fees' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>💰 الرسوم</button>
                    </div>
                </div>

                {/* IMPORTANT: Check if there is an absent log, but only show alert if it is NOT an adab log or if we want to be explicit. 
                    However, with the new logic, Adab cards show even if absent. 
                    So we only show this big red banner if the latest log is strictly absent AND NOT Adab. 
                */}
                {isLatestAbsent && !latestLog?.isAdab && (<div className="mb-6 bg-red-600 text-white p-4 rounded-xl shadow-lg animate-pulse flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-3xl">⚠️</span><div><h4 className="font-bold text-lg">تنبيه هام: غياب الطالب اليوم</h4><p className="text-white/90 text-sm">نرجو التواصل مع الإدارة لمعرفة السبب.</p></div></div><button onClick={() => onMarkSeen(student.id, [latestLog!.id])} className="bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100">علمت بذلك</button></div>)}
                
                {feeNotification && (<div className={`mb-6 p-4 rounded-xl shadow-lg border-r-4 animate-fade-in flex items-center gap-3 ${feeNotification.level === 3 ? 'bg-red-50 border-red-500 text-red-900' : feeNotification.level === 2 ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-blue-50 border-blue-500 text-blue-900'}`}><div className={`p-2 rounded-full ${feeNotification.level === 3 ? 'bg-red-200' : feeNotification.level === 2 ? 'bg-orange-200' : 'bg-blue-200'}`}>✉️</div><div><h4 className="font-bold text-sm opacity-80">رسالة من الإدارة</h4><p className="font-bold">{feeNotification.message}</p></div></div>)}
                
                {/* Timeline */}
                {activeTab === 'timeline' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 text-center"><p className="text-emerald-800 font-bold text-sm">حضور الأسبوع</p><p className="text-3xl font-bold text-emerald-600 mt-1">{stats.weekPresence} أيام</p></div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 text-center"><p className="text-blue-800 font-bold text-sm">حضور الشهر</p><p className="text-3xl font-bold text-blue-600 mt-1">{stats.monthPresence} يوم</p></div>
                        </div>

                        {chartData.length > 0 && (<div className="bg-white rounded-2xl shadow-md p-6 border border-emerald-50"><h3 className="text-lg font-bold text-gray-700 mb-4">مستوى الأداء هذا الأسبوع</h3><div className="h-48 w-full" dir="ltr"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="colorJadeed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.2}/><stop offset="95%" stopColor="#059669" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{fontSize: 12}} /><YAxis hide domain={[0, 6]} /><Tooltip /><Area type="monotone" dataKey="jadeedScore" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorJadeed)" name="الحفظ" /><Area type="monotone" dataKey="murajaahScore" stroke="#d97706" strokeWidth={2} fill="none" name="المراجعة" /></AreaChart></ResponsiveContainer></div></div>)}
                        
                        {sortedLogs.length === 0 ? (<div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm">لا توجد سجلات حتى الآن</div>) : (sortedLogs.map(log => {
                                const fullNotes = log.notes || ''; const parts = fullNotes.split('\n\n✨'); const teacherNotes = parts[0]; const aiMessage = parts.length > 1 ? parts[1] : null;
                                const isAdabLog = log.isAdab;
                                const isDone = isQuizCompleted(log);
                                const hasQuestions = log.adabSession && log.adabSession.quizzes && log.adabSession.quizzes.length > 0;

                                return (
                                <div key={log.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative transition-all duration-500 ${!log.seenByParent ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
                                    
                                    {/* SEEN/UNSEEN HEADER */}
                                    {!log.seenByParent && !isAdabLog && (<div className="bg-red-50 p-2 text-center border-b border-red-100 flex justify-between items-center px-4"><p className="text-red-600 font-bold text-sm">🔔 تقرير جديد!</p><button onClick={() => onMarkSeen(student.id, [log.id])} className="bg-red-500 text-white text-xs px-4 py-1.5 rounded-full hover:bg-red-600 transition shadow-sm">أؤكد الاطلاع</button></div>)}
                                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center"><div><span className="font-bold text-gray-800 block">📅 {new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span><span className="text-xs text-gray-500">المعلم: {log.teacherName}</span></div>{log.seenByParent && (<span className="text-green-600 text-xs font-bold border border-green-200 px-2 py-1 rounded bg-green-50">تم الاطلاع ✅</span>)}</div>
                                    
                                    {/* 
                                        PRIORITY LOGIC: 
                                        1. Is it Adab? Show Adab Card (Even if absent).
                                        2. Else, is it Absent? Show Absent Card.
                                        3. Else, Show Normal Daily Log.
                                    */}

                                    {isAdabLog ? (
                                        <div className="p-6 text-center bg-gradient-to-b from-amber-50 to-orange-50 border-t-4 border-amber-400 relative">
                                            {/* Beautiful Header for Adab */}
                                            <div className="flex justify-center items-center gap-2 mb-4">
                                                <span className="text-3xl">🌟</span>
                                                <h3 className="text-amber-900 font-bold text-xl drop-shadow-sm">{log.adabSession?.title || "مجلس الآداب"}</h3>
                                            </div>

                                            {/* Removed the 'Absent' text badge here as requested */}

                                            {/* CARD LOGIC: If questions exist and NOT done -> Show clickable Challenge Card */}
                                            {hasQuestions && !isDone ? (
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); handleStartQuiz(log.id); }}
                                                    className="bg-white rounded-2xl p-5 shadow-lg border-2 border-amber-300 cursor-pointer transform hover:scale-[1.02] transition-all group relative overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100 rounded-full -mr-8 -mt-8 opacity-50 blur-xl"></div>
                                                    
                                                    <p className="text-amber-800 font-bold text-lg mb-3 leading-relaxed relative z-10">
                                                        "{log.adabSession!.quizzes[0].question}"
                                                    </p>
                                                    
                                                    <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold shadow-md group-hover:shadow-lg transition-all flex items-center justify-center gap-2 animate-pulse">
                                                        <span>إجابة السؤال والمشاركة</span>
                                                        <span className="text-xl">👈</span>
                                                    </button>
                                                    
                                                    <p className="text-[10px] text-gray-400 mt-2 text-center">اضغط هنا لفتح المسابقة</p>
                                                </div>
                                            ) : (
                                                <div className="mt-2 bg-white/50 p-4 rounded-xl border border-amber-200">
                                                     <p className="text-amber-800 font-bold text-sm mb-2 flex items-center justify-center gap-2">
                                                         <span>✅</span>
                                                         شكراً لكم، تم تسجيل المشاركة بنجاح
                                                     </p>
                                                     {isDone && (
                                                         <div className="inline-block bg-white text-amber-700 px-6 py-2 rounded-full font-black text-xl shadow-sm border border-amber-200">
                                                             {log.parentQuizScore} / {log.parentQuizMax}
                                                         </div>
                                                     )}
                                                </div>
                                            )}
                                        </div>
                                    ) : log.isAbsent ? (
                                        <div className="p-6 text-center bg-red-50">
                                            <p className="text-red-600 font-bold text-lg">غائب ❌</p>
                                            <p className="text-gray-500 mt-2 text-sm">{teacherNotes || 'لم يحضر الطالب للحلقة.'}</p>
                                        </div>
                                    ) : (
                                        <div className="p-4 grid gap-4 md:grid-cols-2">
                                            {log.jadeed && (<div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-600 font-bold mb-1">الحفظ الجديد</p><div className="flex justify-between items-center"><p className="font-bold text-gray-800">{log.jadeed.type === 'RANGE' ? `من ${log.jadeed.name} إلى ${log.jadeed.endName}` : log.jadeed.type === 'SURAH' ? `سورة ${log.jadeed.name}` : log.jadeed.name}<span className="block text-xs font-normal text-gray-500">{log.jadeed.type === 'SURAH' ? `الآيات ${log.jadeed.ayahFrom} - ${log.jadeed.ayahTo}` : ''}</span></p><span className={`px-3 py-1 rounded-full text-xs font-bold ${log.jadeed.grade === Grade.EXCELLENT ? 'bg-emerald-500 text-white' : log.jadeed.grade === Grade.VERY_GOOD ? 'bg-blue-500 text-white' : log.jadeed.grade === Grade.NEEDS_WORK ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{log.jadeed.grade}</span></div></div>)}
                                            {log.murajaah && log.murajaah.length > 0 && (<div className="bg-amber-50 p-3 rounded-lg border border-amber-100"><p className="text-xs text-amber-600 font-bold mb-1">المراجعة</p>{log.murajaah.map((m, idx) => (<div key={idx} className="flex justify-between items-center mb-2 last:mb-0 border-b last:border-0 border-amber-200/50 pb-1 last:pb-0"><p className="font-bold text-gray-800 text-sm">{m.type === 'RANGE' ? `من ${m.name} إلى ${m.endName}` : m.type === 'SURAH' ? `سورة ${m.name}` : m.name}<span className="text-xs font-normal text-gray-500 mx-1">{m.type === 'SURAH' ? `(${m.ayahFrom} - ${m.ayahTo})` : ''}</span></p><span className="text-xs font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">{m.grade}</span></div>))}</div>)}
                                            {log.attendance && (<div className="md:col-span-2 flex justify-between gap-4 text-sm font-bold text-gray-600 bg-gray-100 p-3 rounded-xl border border-gray-200 shadow-inner"><div className="flex items-center gap-2"><span className="text-2xl">🕒</span><div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase">وقت الحضور</span><span className="text-emerald-700">{formatTime12Hour(log.attendance.arrivalTime)}</span></div></div>{log.attendance.departureTime && (<div className="flex items-center gap-2"><div className="flex flex-col items-end"><span className="text-[10px] text-gray-500 uppercase">وقت الانصراف</span><span className="text-red-700">{formatTime12Hour(log.attendance.departureTime)}</span></div><span className="text-2xl">⬅️</span></div>)}</div>)}
                                            {teacherNotes && (<div className="md:col-span-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap"><span className="font-bold block mb-1">📝 ملاحظات المعلم:</span>{teacherNotes}</div>)}
                                            {aiMessage && (<div className="md:col-span-2 bg-gradient-to-r from-purple-100 to-indigo-50 p-4 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-purple-200 rounded-full opacity-50 blur-xl"></div><div className="relative z-10 flex items-start gap-3"><span className="text-2xl">✨</span><div><h4 className="text-purple-800 font-bold text-sm mb-1">رسالة خاصة</h4><p className="text-purple-900 text-sm italic leading-relaxed whitespace-pre-line">"{aiMessage.trim()}"</p></div></div></div>)}
                                        </div>
                                    )}
                                </div>
                            )})
                        )}
                    </div>
                )}

                {activeTab === 'next' && (<div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in text-center">{!student.nextPlan ? (<div className="py-10"><p className="text-gray-400 text-lg">لم يحدد المعلم الواجب القادم بعد.</p></div>) : (<div className="space-y-6"><div className="bg-blue-50 p-6 rounded-xl border border-blue-200"><h3 className="text-2xl font-bold text-blue-800 mb-2">اللوح (الحفظ الجديد)</h3><p className="text-xl text-gray-800 font-bold">{student.nextPlan.jadeed.type === 'RANGE' ? `من ${student.nextPlan.jadeed.name} إلى ${student.nextPlan.jadeed.endName}` : student.nextPlan.jadeed.type === 'SURAH' ? `سورة ${student.nextPlan.jadeed.name}` : student.nextPlan.jadeed.name}</p>{student.nextPlan.jadeed.type === 'SURAH' && (<div className="mt-2 inline-block bg-white px-4 py-1 rounded-full border border-blue-200 text-blue-700 font-bold">{`من آية ${student.nextPlan.jadeed.ayahFrom} إلى ${student.nextPlan.jadeed.ayahTo}`}</div>)}</div><div className="bg-amber-50 p-6 rounded-xl border border-amber-200"><h3 className="text-xl font-bold text-amber-800 mb-4">المراجعة المطلوبة</h3>{student.nextPlan.murajaah.map((m, idx) => (<div key={idx} className="bg-white p-3 rounded-lg shadow-sm mb-2 text-gray-800"><span className="font-bold">{m.type === 'RANGE' ? `من ${m.name} إلى ${m.endName}` : m.type === 'SURAH' ? `سورة ${m.name}` : m.name}</span>{m.type === 'SURAH' && <span className="text-sm text-gray-500 mr-2">({m.ayahFrom} - {m.ayahTo})</span>}</div>))}</div></div>)}</div>)}
                
                {activeTab === 'schedule' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">جدول الأنشطة والدروس</h3>
                            {!editingSchedule ? (
                                <Button onClick={handleStartEditSchedule} variant="outline" className="text-xs">تعديل الجدول</Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button onClick={() => setEditingSchedule(false)} variant="outline" className="text-xs">إلغاء</Button>
                                    <Button onClick={handleSaveSchedule} className="text-xs">حفظ</Button>
                                </div>
                            )}
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded">
                            سجل هنا كل الدروس (مدرسة، رياضة، دروس خصوصية) ليعرف المحفظ أوقات الفراغ والانشغال.
                        </p>

                        <div className="space-y-4">
                            {(!editingSchedule ? student.weeklySchedule : tempSchedule).map((sched, idx) => (
                                <div key={sched.day} className={`border rounded-lg p-4 transition-all ${sched.isDayOff ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800 text-lg">{sched.day}</h4>
                                            {sched.isDayOff && <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded">مشغول طوال اليوم</span>}
                                        </div>
                                        {editingSchedule && (
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={sched.isDayOff || false} 
                                                    onChange={() => handleToggleDayOff(idx)}
                                                    className="rounded text-red-600 focus:ring-red-500"
                                                />
                                                <span className="text-xs text-red-600 font-bold">يوم إجازة/مشغول</span>
                                            </label>
                                        )}
                                    </div>

                                    {!sched.isDayOff && (
                                        <div className="space-y-2">
                                            {/* List Events */}
                                            {sched.events?.map(event => (
                                                <div key={event.id} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                                    <div>
                                                        <span className="font-bold text-blue-900 block text-sm">{event.title}</span>
                                                        <span className="text-xs text-blue-600 font-mono">{formatTime12Hour(event.time)}</span>
                                                    </div>
                                                    {editingSchedule && (
                                                        <button 
                                                            onClick={() => handleRemoveEvent(idx, event.id)}
                                                            className="text-red-500 hover:text-red-700 bg-white rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-sm"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Add Event Form */}
                                            {editingSchedule && addingEventDayIndex === idx && (
                                                <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200 animate-fade-in">
                                                    <input 
                                                        className="w-full p-2 mb-2 border rounded text-sm" 
                                                        placeholder="اسم النشاط (مثال: درس رياضيات)" 
                                                        value={newEventName}
                                                        onChange={e => setNewEventName(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <div className="w-1/2">
                                                            <TimePicker value={newEventTime} onChange={setNewEventTime} />
                                                        </div>
                                                        <Button onClick={() => handleAddEvent(idx)} className="w-1/2 py-1 text-xs">إضافة</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {editingSchedule && addingEventDayIndex !== idx && (
                                                <button 
                                                    onClick={() => { setAddingEventDayIndex(idx); setNewEventName(''); setNewEventTime('16:00'); }}
                                                    className="w-full py-2 text-xs font-bold text-gray-500 border border-dashed border-gray-300 rounded hover:bg-gray-50 hover:text-emerald-600 transition"
                                                >
                                                    + إضافة درس / نشاط
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'fees' && (<div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in"><h3 className="font-bold text-xl text-gray-800 mb-6">سجل المدفوعات</h3>{student.payments.length === 0 ? (<p className="text-gray-500 text-center py-8">لا توجد مدفوعات مسجلة.</p>) : (<div className="space-y-3">{student.payments.map(pay => (<div key={pay.id} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                        <p className="font-bold text-gray-800 text-sm">{pay.title}</p>
                        <span className="font-bold text-xl text-emerald-700">{pay.amount} ج.م</span>
                    </div>
                    <p className="text-sm text-gray-500">{new Date(pay.date).toLocaleDateString('ar-EG')} - استلمها: {pay.recordedBy}</p>
                    {pay.notes && <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border border-emerald-100">{pay.notes}</p>}
                </div>))}</div>)}</div>)}
            </div>
        </div>
    );
};