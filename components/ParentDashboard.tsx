import React, { useState, useEffect, useMemo } from 'react';
import { Student, Grade, WeeklySchedule, Announcement, DailyLog, CalendarEvent, QuizItem, QuranAssignment } from '../types';
import { Button } from './Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MONTHS_LIST, formatTime12Hour, JUZ_LIST, formatSimpleDate } from '../constants';
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
    const [feeNotification, setFeeNotification] = useState<{ message: string, level: 1 | 2 | 3 } | null>(null);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [newPhone, setNewPhone] = useState('');

    // Quiz State
    const [activeQuizLogId, setActiveQuizLogId] = useState<string | null>(null);
    const [quizStep, setQuizStep] = useState(0); 
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [quizStatus, setQuizStatus] = useState<'IDLE' | 'CONFIRMING' | 'RESULT'>('IDLE');
    const [currentScore, setCurrentScore] = useState(0);
    const [currentShuffledAnswers, setCurrentShuffledAnswers] = useState<string[]>([]);
    const [showQuizSuccess, setShowQuizSuccess] = useState(false);
    
    // Schedule Editing State
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [tempSchedule, setTempSchedule] = useState<WeeklySchedule[]>([]);

    useEffect(() => {
        setTempSchedule(JSON.parse(JSON.stringify(student.weeklySchedule)));
    }, [student.weeklySchedule]);

    const sortedLogs = useMemo(() => {
        return [...student.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.logs]);

    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
    const isLatestAbsent = latestLog && latestLog.isAbsent && !latestLog.seenByParent;

    const formatAssignment = (ass: QuranAssignment) => {
        if (!ass) return '';
        if (ass.type === 'MULTI') {
             return (
                 <div className="space-y-1">
                     {(ass.multiSurahs || []).map((ms, idx) => (
                         <div key={idx} className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-1">
                             <span className="text-gray-800 text-sm font-bold">{ms.name}</span>
                             {ms.grade && (<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ms.grade === Grade.EXCELLENT ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{ms.grade}</span>)}
                         </div>
                     ))}
                 </div>
             );
        }
        
        let title = ass.name;
        let subtitle = '';

        if (ass.type === 'JUZ') {
            const juzIdx = (ass.juzNumber || 1) - 1;
            title = JUZ_LIST[juzIdx] || `الجزء ${ass.juzNumber}`;
        } else if (ass.type === 'RANGE') {
            title = `من ${ass.name} إلى ${ass.endName}`;
        } else if (ass.type === 'SURAH') {
            title = `سورة ${ass.name}`;
            subtitle = `(${ass.ayahFrom} - ${ass.ayahTo})`;
        }

        return (
            <div className="flex justify-between items-center w-full">
                <div>
                    <span className="font-bold text-gray-800 text-sm block">{title}</span>
                    {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
                </div>
                {ass.grade && (<span className={`px-2 py-1 rounded text-xs font-bold ${ass.grade === Grade.EXCELLENT ? 'bg-emerald-500 text-white' : ass.grade === Grade.VERY_GOOD ? 'bg-blue-500 text-white' : ass.grade === Grade.NEEDS_WORK ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{ass.grade}</span>)}
            </div>
        );
    };

    const isQuizCompleted = (log: DailyLog) => {
        return log.parentQuizScore != null; 
    };

    const currentQuizLog = useMemo(() => {
        return student.logs.find(l => l.id === activeQuizLogId);
    }, [student.logs, activeQuizLogId]);

    useEffect(() => {
        if (currentQuizLog && currentQuizLog.adabSession && currentQuizLog.adabSession.quizzes[quizStep]) {
             const q = currentQuizLog.adabSession.quizzes[quizStep];
             const answers = [q.correctAnswer, ...q.wrongAnswers];
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
          if (student.isFeeOverdue) {
              setFeeNotification({ message: `تنبيه: يرجى التواصل مع الإدارة لسداد الرسوم المستحقة.`, level: 3 });
              return;
          }
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

    const handleStartQuiz = (logId: string) => {
        setQuizStep(0);
        setCurrentScore(0);
        setQuizStatus('IDLE');
        setSelectedAnswer(null);
        setShowQuizSuccess(false);
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
            setShowQuizSuccess(true);
            setTimeout(() => {
                setShowQuizSuccess(false);
                setActiveQuizLogId(null);
            }, 3000);
        }
    };

    const handleUpdatePhone = () => {
        if (newPhone.trim().length >= 10) {
            onUpdateStudent({ ...student, parentPhone: newPhone });
            setIsEditingPhone(false);
        }
    };
  
    const handleSaveSchedule = () => {
        onUpdateStudent({ ...student, weeklySchedule: tempSchedule });
        setIsEditingSchedule(false);
    };

    const handleAddEvent = (dayIndex: number) => {
        const newSchedule = [...tempSchedule];
        if (!newSchedule[dayIndex].events) newSchedule[dayIndex].events = [];
        newSchedule[dayIndex].events.push({ id: Date.now().toString(), title: 'موعد جديد', time: '16:00' });
        setTempSchedule(newSchedule);
    };

    const handleRemoveEvent = (dayIndex: number, eventId: string) => {
        const newSchedule = [...tempSchedule];
        newSchedule[dayIndex].events = newSchedule[dayIndex].events.filter(e => e.id !== eventId);
        setTempSchedule(newSchedule);
    };

    const handleEventChange = (dayIndex: number, eventId: string, field: 'title' | 'time', val: string) => {
        const newSchedule = [...tempSchedule];
        const evt = newSchedule[dayIndex].events.find(e => e.id === eventId);
        if (evt) {
            // @ts-ignore
            evt[field] = val;
            setTempSchedule(newSchedule);
        }
    };

    const handleToggleDayOff = (dayIndex: number) => {
        const newSchedule = [...tempSchedule];
        newSchedule[dayIndex].isDayOff = !newSchedule[dayIndex].isDayOff;
        setTempSchedule(newSchedule);
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

    const hasCompletedAdabToday = useMemo(() => {
        const todayStr = new Date().toDateString();
        // Check for ANY completed Adab session (score is present)
        return student.logs.some(l => 
            new Date(l.date).toDateString() === todayStr && 
            l.isAdab && 
            l.parentQuizScore !== undefined
        );
    }, [student.logs]);

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(a => {
            if ((a.content.includes("مشاركة") || a.content.includes("آداب")) && hasCompletedAdabToday) {
                return false;
            }
            return true;
        });
    }, [announcements, hasCompletedAdabToday]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
             <div className="bg-white shadow-md sticky top-0 z-20 px-4 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-700 border-2 border-emerald-50">
                        {student.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 text-lg">{student.name}</h1>
                        <div className="flex items-center gap-1">
                             {isEditingPhone ? (
                                 <div className="flex items-center gap-1 scale-90 origin-right">
                                     <input className="w-56 p-3 text-2xl font-bold border-2 border-blue-200 focus:border-blue-500 rounded-lg text-center tracking-widest" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01xxxxxxxxx" autoFocus />
                                     <button onClick={handleUpdatePhone} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md">حفظ</button>
                                     <button onClick={() => setIsEditingPhone(false)} className="text-red-500 text-sm font-bold px-2">إلغاء</button>
                                 </div>
                             ) : (
                                <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                    {student.parentPhone} 
                                    <button onClick={() => { setIsEditingPhone(true); setNewPhone(student.parentPhone || ''); }} className="text-blue-500 hover:text-blue-700">✎</button>
                                </p>
                             )}
                        </div>
                    </div>
                </div>
                <Button onClick={onLogout} variant="danger" className="text-xs px-3 py-2 shadow-sm">خروج 🚪</Button>
             </div>

             <div className="p-4 max-w-lg mx-auto animate-fade-in relative">
                
                {currentQuizLog && !showQuizSuccess && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                            <div className="bg-amber-400 p-4 text-center">
                                <h3 className="text-white font-bold text-lg">📝 اختبار المجلس</h3>
                            </div>
                            <div className="p-6">
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                                        <span>السؤال {quizStep + 1} من {currentQuizLog.adabSession?.quizzes.length}</span>
                                        <span>النتيجة: {currentScore}</span>
                                    </div>
                                    <h4 className="font-bold text-xl text-gray-800 mb-6 text-center leading-relaxed">
                                        {currentQuizLog.adabSession?.quizzes[quizStep].question}
                                    </h4>
                                    
                                    <div className="space-y-3">
                                        {currentShuffledAnswers.map((ans, idx) => {
                                            let btnClass = "w-full p-4 rounded-xl border-2 text-right font-bold transition-all ";
                                            if (quizStatus === 'RESULT') {
                                                if (ans === currentQuizLog.adabSession?.quizzes[quizStep].correctAnswer) btnClass += "bg-green-100 border-green-500 text-green-700";
                                                else if (ans === selectedAnswer) btnClass += "bg-red-100 border-red-500 text-red-700";
                                                else btnClass += "bg-gray-50 border-gray-200 text-gray-400";
                                            } else {
                                                if (selectedAnswer === ans) btnClass += "bg-amber-100 border-amber-500 text-amber-800 shadow-md transform scale-[1.02]";
                                                else btnClass += "bg-white border-gray-200 text-gray-700 hover:border-amber-300";
                                            }
                                            
                                            return (
                                                <button key={idx} onClick={() => { if(quizStatus === 'IDLE') setSelectedAnswer(ans); }} className={btnClass} disabled={quizStatus !== 'IDLE'}>{ans}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                {quizStatus === 'IDLE' && (
                                    <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="w-full py-3 text-lg mt-4">تأكيد الإجابة</Button>
                                )}
                                {quizStatus === 'CONFIRMING' && (
                                     <Button onClick={handleConfirmAnswer} className="w-full py-3 text-lg mt-4 bg-blue-600 hover:bg-blue-700">هل أنت متأكد؟</Button>
                                )}
                                {quizStatus === 'RESULT' && (
                                    <Button onClick={handleNextQuestion} className="w-full py-3 text-lg mt-4 bg-green-600 hover:bg-green-700">
                                        {quizStep < (currentQuizLog.adabSession?.quizzes.length || 0) - 1 ? 'السؤال التالي ⬅' : 'إنهاء الاختبار 🏁'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {filteredAnnouncements.length > 0 && (
                   <div className="mb-4 space-y-2">
                       {filteredAnnouncements.map(a => (
                           <div key={a.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
                               <div className="flex items-start gap-3 relative z-10">
                                   <span className="text-2xl">📢</span>
                                   <div className="w-full">
                                       <div className="flex justify-between">
                                            <p className="text-xs font-bold text-blue-800 mb-1">{a.teacherName}</p>
                                            <p className="text-[10px] text-gray-400">{formatSimpleDate(a.date)}</p>
                                       </div>
                                       
                                       {a.type === 'EXAM' && a.examDetails ? (
                                           <div className="mt-2 bg-white/50 p-3 rounded-lg border border-blue-100">
                                               <p className="font-bold text-indigo-900 mb-2">🗓️ جدول اختبار الشهر</p>
                                               <p className="text-xs text-gray-600 mb-2">المختبر: {a.examDetails.testerTeacherName}</p>
                                               <div className="space-y-1">
                                                   {a.examDetails.schedule.map((d, i) => (
                                                       <div key={i} className="flex justify-between text-sm border-b border-blue-100 pb-1 last:border-0">
                                                           <span>{formatSimpleDate(d.date)}</span>
                                                           <span className="font-bold text-blue-700">{d.description}</span>
                                                       </div>
                                                   ))}
                                               </div>
                                           </div>
                                       ) : <p className="text-sm text-gray-800 font-medium leading-relaxed">{a.content}</p>}
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
                )}

                <div className="flex justify-center mb-6">
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md shadow-inner overflow-x-auto no-scrollbar border border-gray-200">
                        <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'timeline' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>📊 التقارير</button>
                        <button onClick={() => setActiveTab('next')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'next' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>📝 اللوح</button>
                        <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'schedule' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>📅 المواعيد</button>
                        <button onClick={() => setActiveTab('fees')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'fees' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}>💰 الرسوم</button>
                    </div>
                </div>

                {isLatestAbsent && !latestLog?.isAdab && (<div className="mb-6 bg-red-600 text-white p-4 rounded-xl shadow-lg animate-pulse flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-3xl">⚠️</span><div><h4 className="font-bold text-lg">تنبيه هام: غياب الطالب اليوم</h4><p className="text-white/90 text-sm">نرجو التواصل مع الإدارة لمعرفة السبب.</p></div></div><button onClick={() => onMarkSeen(student.id, [latestLog!.id])} className="bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100">علمت بذلك</button></div>)}
                
                {feeNotification && (<div className={`mb-6 p-4 rounded-xl shadow-lg border-r-4 animate-fade-in flex items-center gap-3 ${feeNotification.level === 3 ? 'bg-red-50 border-red-500 text-red-900' : feeNotification.level === 2 ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-blue-50 border-blue-500 text-blue-900'}`}><div className={`p-2 rounded-full ${feeNotification.level === 3 ? 'bg-red-200' : feeNotification.level === 2 ? 'bg-orange-200' : 'bg-blue-200'}`}>✉️</div><div><h4 className="font-bold text-sm opacity-80">رسالة من الإدارة</h4><p className="font-bold">{feeNotification.message}</p></div></div>)}
                
                {activeTab === 'timeline' && (
                    <div className="space-y-6 animate-slide-up">
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
                                    {!log.seenByParent && !isAdabLog && (<div className="bg-red-50 p-2 text-center border-b border-red-100 flex justify-between items-center px-4"><p className="text-red-600 font-bold text-sm">🔔 تقرير جديد!</p><button onClick={() => onMarkSeen(student.id, [log.id])} className="bg-red-500 text-white text-xs px-4 py-1.5 rounded-full hover:bg-red-600 transition shadow-sm">أؤكد الاطلاع</button></div>)}
                                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center"><div><span className="font-bold text-gray-800 block">📅 {formatSimpleDate(log.date)}</span><span className="text-xs text-gray-500">المعلم: {log.teacherName}</span></div>{log.seenByParent && (<span className="text-green-600 text-xs font-bold border border-green-200 px-2 py-1 rounded bg-green-50">تم الاطلاع ✅</span>)}</div>
                                    
                                    {isAdabLog ? (
                                        <div className="p-0 text-center relative">
                                            <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-6 relative overflow-hidden">
                                                 <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                                 <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl"></div>
                                                 <span className="text-5xl mb-2 block animate-bounce">✨</span>
                                                 <h3 className="font-bold text-2xl mb-2 relative z-10">{log.adabSession?.title || 'مجلس آداب'}</h3>
                                                 <p className="text-white/90 text-sm relative z-10 mb-4">درس تربوي لتعزيز القيم والأخلاق</p>
                                                 {isDone ? (
                                                    <div className="bg-white/90 backdrop-blur rounded-xl p-4 text-amber-800 shadow-lg mx-auto max-w-[200px]">
                                                        <p className="text-xs font-bold uppercase mb-1">النتيجة النهائية</p>
                                                        <p className="text-4xl font-black">{log.parentQuizScore} <span className="text-lg text-amber-600">/ {log.parentQuizMax}</span></p>
                                                    </div>
                                                 ) : hasQuestions ? (
                                                     <button onClick={() => handleStartQuiz(log.id)} className="bg-white text-amber-600 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 hover:scale-105 transition transform relative z-10">🚀 بدء الاختبار الآن</button>
                                                 ) : <p className="text-white/80 text-sm italic">لا يوجد اختبار لهذا الدرس</p>}
                                                 
                                                 {/* SUCCESS MESSAGE INSIDE CARD */}
                                                 {showQuizSuccess && (
                                                    <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-4 animate-fade-in text-emerald-800">
                                                        <span className="text-5xl mb-2 animate-bounce">🎉</span>
                                                        <h3 className="font-bold text-2xl mb-1">جزاكم الله خيراً</h3>
                                                        <p className="text-sm text-center">شكراً لمشاركتكم وحرصكم على مصلحة الطالب</p>
                                                    </div>
                                                 )}
                                            </div>
                                        </div>
                                    ) : log.isAbsent ? (
                                        <div className="p-6 text-center bg-red-50">
                                            <p className="text-red-600 font-bold text-lg">غائب ❌</p>
                                            <p className="text-gray-500 mt-2 text-sm">{teacherNotes || 'لم يحضر الطالب للحلقة.'}</p>
                                        </div>
                                    ) : (
                                        <div className="p-4 grid gap-4 md:grid-cols-2">
                                            {log.jadeed && (<div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-600 font-bold mb-1">الحفظ الجديد</p>{formatAssignment(log.jadeed)}</div>)}
                                            {log.murajaah && log.murajaah.length > 0 && (<div className="bg-amber-50 p-3 rounded-lg border border-amber-100"><p className="text-xs text-amber-600 font-bold mb-1">المراجعة</p>{log.murajaah.map((m, idx) => (<div key={idx} className="mb-2 last:mb-0 border-b last:border-0 border-amber-200/50 pb-1 last:pb-0">{formatAssignment(m)}</div>))}</div>)}
                                            {log.attendance && log.attendance.length > 0 && (<div className="md:col-span-2 bg-gray-100 p-3 rounded-xl border border-gray-200 shadow-inner"><div className="flex items-center gap-2 mb-2"><span className="text-2xl">🕒</span><span className="text-gray-600 font-bold text-sm">سجل الحضور اليوم</span></div><div className="space-y-2">{log.attendance.map((att, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-sm"><div className="flex flex-col"><span className="text-[10px] text-emerald-600 font-bold uppercase">حضور {idx + 1}</span><span className="font-bold text-gray-800">{formatTime12Hour(att.arrival)}</span></div><span className="text-gray-300">⬅</span><div className="flex flex-col items-end"><span className="text-[10px] text-red-600 font-bold uppercase">انصراف {idx + 1}</span><span className="font-bold text-gray-800">{att.departure ? formatTime12Hour(att.departure) : '--'}</span></div></div>))}</div></div>)}
                                            {/* @ts-ignore */}
                                            {log.attendance && !Array.isArray(log.attendance) && log.attendance.arrivalTime && (<div className="md:col-span-2 flex justify-between gap-4 text-sm font-bold text-gray-600 bg-gray-100 p-3 rounded-xl border border-gray-200 shadow-inner">{/* @ts-ignore */}<div className="flex items-center gap-2"><span className="text-2xl">🕒</span><div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase">وقت الحضور</span><span className="text-emerald-700">{formatTime12Hour(log.attendance.arrivalTime)}</span></div></div>{/* @ts-ignore */}{log.attendance.departureTime && (<div className="flex items-center gap-2"><div className="flex flex-col items-end"><span className="text-[10px] text-gray-500 uppercase">وقت الانصراف</span><span className="text-red-700">{formatTime12Hour(log.attendance.departureTime)}</span></div><span className="text-2xl">⬅️</span></div>)}</div>)}
                                            {teacherNotes && (<div className="md:col-span-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap"><span className="font-bold block mb-1">📝 ملاحظات المعلم:</span>{teacherNotes}</div>)}
                                            {aiMessage && (<div className="md:col-span-2 bg-gradient-to-r from-purple-100 to-indigo-50 p-4 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-purple-200 rounded-full opacity-50 blur-xl"></div><div className="relative z-10 flex items-start gap-3"><span className="text-2xl">✨</span><div><h4 className="text-purple-800 font-bold text-sm mb-1">رسالة خاصة</h4><p className="text-purple-900 text-sm italic leading-relaxed whitespace-pre-line">"{aiMessage.trim()}"</p></div></div></div>)}
                                        </div>
                                    )}
                                </div>
                            )})
                        )}
                    </div>
                )}
                {activeTab === 'next' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up text-center">
                        {!student.nextPlan ? (<div className="py-10"><p className="text-gray-400 text-lg">لم يحدد المعلم الواجب القادم بعد.</p></div>) : (
                            <div className="space-y-6">
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                                    <h3 className="text-2xl font-bold text-blue-800 mb-2">اللوح (الحفظ الجديد)</h3>
                                    {student.nextPlan.jadeed.type === 'MULTI' ? (<div className="flex flex-wrap gap-2 justify-center">{(student.nextPlan.jadeed.multiSurahs || []).map((ms, i) => (<span key={i} className="bg-white text-blue-800 px-3 py-1 rounded-full border border-blue-100 font-bold shadow-sm">{ms.name}</span>))}</div>) : student.nextPlan.jadeed.type === 'JUZ' ? (<p className="text-xl text-gray-800 font-bold">{JUZ_LIST[(student.nextPlan.jadeed.juzNumber || 1) - 1]}</p>) : (<><p className="text-xl text-gray-800 font-bold">{student.nextPlan.jadeed.type === 'RANGE' ? `من ${student.nextPlan.jadeed.name} إلى ${student.nextPlan.jadeed.endName}` : student.nextPlan.jadeed.type === 'SURAH' ? `سورة ${student.nextPlan.jadeed.name}` : student.nextPlan.jadeed.name}</p>{student.nextPlan.jadeed.type === 'SURAH' && (<div className="mt-2 inline-block bg-white px-4 py-1 rounded-full border border-blue-200 text-blue-700 font-bold">{`من آية ${student.nextPlan.jadeed.ayahFrom} إلى ${student.nextPlan.jadeed.ayahTo}`}</div>)}</>)}
                                </div>
                                <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                                    <h3 className="text-xl font-bold text-amber-800 mb-4">المراجعة المطلوبة</h3>
                                    {student.nextPlan.murajaah.map((m, idx) => (<div key={idx} className="bg-white p-3 rounded-lg shadow-sm mb-2 text-gray-800">{m.type === 'MULTI' ? (<span className="font-bold text-sm">متعدد: {(m.multiSurahs || []).map(s => s.name).join('، ')}</span>) : m.type === 'JUZ' ? (<span className="font-bold">{JUZ_LIST[(m.juzNumber || 1) - 1]}</span>) : (<><span className="font-bold">{m.type === 'RANGE' ? `من ${m.name} إلى ${m.endName}` : m.type === 'SURAH' ? `سورة ${m.name}` : m.name}</span>{m.type === 'SURAH' && <span className="text-sm text-gray-500 mr-2">({m.ayahFrom} - {m.ayahTo})</span>}</>)}</div>))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'schedule' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 animate-slide-up">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                             <h3 className="font-bold text-gray-800 text-lg">⏰ المواعيد والأنشطة</h3>
                             {!isEditingSchedule ? (
                                 <button onClick={() => setIsEditingSchedule(true)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">تعديل ✎</button>
                             ) : (
                                 <div className="flex gap-2">
                                     <button onClick={handleSaveSchedule} className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">حفظ</button>
                                     <button onClick={() => setIsEditingSchedule(false)} className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">إلغاء</button>
                                 </div>
                             )}
                        </div>
                        <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">قم بتسجيل الأوقات المشغولة للطالب (مثل المدرسة أو تمارين أخرى) ليراها المعلم.</p>
                        
                        <div className="space-y-3">
                            {(isEditingSchedule ? tempSchedule : student.weeklySchedule).map((sched, dayIdx) => (
                                <div key={sched.day} className={`p-4 rounded-lg border ${sched.isDayOff ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-gray-800">{sched.day}</h4>
                                        <div className="flex items-center gap-2">
                                            {isEditingSchedule && (
                                                <label className="text-xs flex items-center gap-1 cursor-pointer select-none">
                                                    <input type="checkbox" checked={sched.isDayOff} onChange={() => handleToggleDayOff(dayIdx)} />
                                                    مشغول طوال اليوم
                                                </label>
                                            )}
                                            {sched.isDayOff && !isEditingSchedule && <span className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded">إجازة / مشغول</span>}
                                        </div>
                                    </div>

                                    {!sched.isDayOff && (
                                        <div className="space-y-2">
                                            {(sched.events || []).map(event => (
                                                <div key={event.id} className="flex flex-col gap-1 bg-blue-50 px-2 py-2 rounded border border-blue-100 text-sm">
                                                    {isEditingSchedule ? (
                                                        <div className="flex gap-2 items-center">
                                                            <input className="flex-1 p-1 border rounded text-xs" value={event.title} onChange={e => handleEventChange(dayIdx, event.id, 'title', e.target.value)} placeholder="النشاط" />
                                                            <TimePicker value={event.time} onChange={val => handleEventChange(dayIdx, event.id, 'time', val)} />
                                                            <button onClick={() => handleRemoveEvent(dayIdx, event.id)} className="text-red-500 font-bold px-1">×</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-blue-900">{event.title}</span>
                                                            <span className="font-mono font-bold text-blue-700 bg-white px-1 rounded">{formatTime12Hour(event.time)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {isEditingSchedule && (
                                                <button onClick={() => handleAddEvent(dayIdx)} className="w-full text-center text-xs text-blue-600 font-bold py-1 border border-dashed border-blue-300 rounded hover:bg-blue-50">+ إضافة موعد</button>
                                            )}
                                            {!isEditingSchedule && (!sched.events || sched.events.length === 0) && <p className="text-xs text-gray-400 italic">--</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'fees' && (
                    <div className="bg-white rounded-xl shadow-lg p-5 animate-slide-up">
                        <h3 className="font-bold text-gray-800 mb-4 text-lg text-center border-b pb-2">💰 الرسوم والمدفوعات</h3>
                        {student.isFeeOverdue ? (<div className="mb-4 bg-amber-50 p-4 rounded-xl border border-amber-200 text-center animate-pulse"><p className="text-amber-800 text-lg font-bold">⚠️ تنبيه دفع الرسوم</p><p className="text-amber-700 text-sm mt-1">يرجى مراجعة إدارة الدار لسداد الرسوم المستحقة.</p></div>) : (<div className="mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center"><p className="text-emerald-800 text-sm font-bold">✅ حالة الدفع منتظمة</p></div>)}
                        <div className="space-y-3">
                            {student.payments.length === 0 ? (<div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl"><p className="text-gray-400">لا يوجد سجل مدفوعات سابق.</p></div>) : (student.payments.map(pay => (<div key={pay.id} className="bg-white p-3 border rounded-lg shadow-sm flex flex-col gap-1"><div className="flex justify-between items-center"><p className="font-bold text-gray-800">{pay.title}</p><span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm">{pay.amount} ج.م</span></div><div className="flex justify-between items-center text-xs text-gray-500"><span>{formatSimpleDate(pay.date)}</span><span>استلمها: {pay.recordedBy}</span></div>{pay.notes && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1.5 rounded">📝 {pay.notes}</p>}</div>)))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};