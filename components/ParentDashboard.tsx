
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
  onSaveQuizResult: (studentId: string, logId: string, score: number, max: number) => Promise<void>;
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
    onMarkSeen,
    onSaveQuizResult
}) => {
    const [activeTab, setActiveTab] = useState<'timeline' | 'schedule' | 'fees' | 'next'>('timeline');
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [tempSchedule, setTempSchedule] = useState<WeeklySchedule[]>([]);
    const [feeNotification, setFeeNotification] = useState<{ message: string, level: 1 | 2 | 3 } | null>(null);

    // Quiz State
    const [activeQuizLogId, setActiveQuizLogId] = useState<string | null>(null);
    const [quizStep, setQuizStep] = useState(0); 
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [quizStatus, setQuizStatus] = useState<'IDLE' | 'CONFIRMING' | 'RESULT'>('IDLE');
    const [currentScore, setCurrentScore] = useState(0);
    const [currentShuffledAnswers, setCurrentShuffledAnswers] = useState<string[]>([]);

    const sortedLogs = useMemo(() => {
        return [...student.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.logs]);

    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
    const isLatestAbsent = latestLog && latestLog.isAbsent && !latestLog.seenByParent;
    const isQuizCompleted = (log: DailyLog) => log.parentQuizScore != null; 

    const currentQuizLog = useMemo(() => student.logs.find(l => l.id === activeQuizLogId), [student.logs, activeQuizLogId]);

    // Stable shuffled answers
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

    // Stats
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const monthPresence = student.logs.filter(l => !l.isAbsent && new Date(l.date).getMonth() === currentMonth).length;
        const weekPresence = student.logs.filter(l => !l.isAbsent).length; // Simplified
        return { weekPresence, monthPresence };
    }, [student.logs]);
  
    // Fees check
    useEffect(() => {
      const checkFeeStatus = () => {
          if (student.isFeeOverdue) {
              setFeeNotification({ message: `تنبيه: يرجى التواصل مع الإدارة لسداد الرسوم.`, level: 3 });
              return;
          }
          const now = new Date();
          const currentMonth = MONTHS_LIST[now.getMonth()];
          const hasPaid = student.payments.some(p => p.title.includes(currentMonth));
          if (!hasPaid && now.getDate() >= 25) {
               setFeeNotification({ message: `تذكير: يرجى سداد رسوم شهر ${currentMonth}.`, level: 2 });
          } else {
               setFeeNotification(null);
          }
      };
      checkFeeStatus();
    }, [student.payments, student.isFeeOverdue]);

    // --- QUIZ LOGIC ---
    const handleStartQuiz = (logId: string) => {
        setQuizStep(0);
        setCurrentScore(0);
        setQuizStatus('IDLE');
        setSelectedAnswer(null);
        setActiveQuizLogId(logId);
    };

    const handleConfirmAnswer = () => {
        if (!currentQuizLog || !currentQuizLog.adabSession) return;
        const currentQ = currentQuizLog.adabSession.quizzes[quizStep];
        if (selectedAnswer === currentQ.correctAnswer) {
            setCurrentScore(prev => prev + 1);
        }
        setQuizStatus('RESULT');
    };

    const handleNextQuestion = async () => {
        if (!currentQuizLog || !currentQuizLog.adabSession) return;
        if (quizStep < currentQuizLog.adabSession.quizzes.length - 1) {
            setQuizStep(prev => prev + 1);
            setQuizStatus('IDLE');
            setSelectedAnswer(null);
        } else {
            // FINISH QUIZ
            // We use currentScore + 1 if the LAST answer was correct? 
            // NO, currentScore is updated in 'handleConfirmAnswer' before 'RESULT' state.
            // So currentScore is final.
            const finalScore = currentScore;
            await onSaveQuizResult(student.id, currentQuizLog.id, finalScore, currentQuizLog.adabSession.quizzes.length);
            setActiveQuizLogId(null);
        }
    };
  
    const chartData = [...student.logs].filter(l => !l.isAbsent && l.jadeed).slice(-7).map(log => ({ date: new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'short' }), score: log.jadeed ? gradeToScore(log.jadeed.grade) : 0 }));

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
             <div className="bg-white shadow-md sticky top-0 z-20 px-4 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-3"><div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-bold text-emerald-700 border-2 border-emerald-50">{student.name.charAt(0)}</div><div><h1 className="font-bold text-gray-800 text-lg">{student.name}</h1><p className="text-xs text-gray-500 font-bold">بوابة ولي الأمر</p></div></div>
                <Button onClick={onLogout} variant="danger" className="text-xs px-3 py-2 shadow-sm">خروج 🚪</Button>
             </div>

             <div className="p-4 max-w-lg mx-auto animate-fade-in relative">
                
                {/* --- QUIZ MODAL --- */}
                {currentQuizLog && currentQuizLog.adabSession && (
                    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-4 border-amber-400 relative overflow-hidden flex flex-col max-h-[90vh]">
                             <div className="flex justify-between items-center mb-6 border-b pb-4">
                                 <div><h3 className="font-bold text-amber-900 text-lg">مسابقة اليوم 🌟</h3><p className="text-xs text-amber-600">سؤال {quizStep + 1} من {currentQuizLog.adabSession.quizzes.length}</p></div>
                                 <button onClick={() => setActiveQuizLogId(null)} className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold">✕</button>
                             </div>
                             <div className="overflow-y-auto flex-1">
                                 <div className="mb-8"><p className="text-xl font-bold text-gray-800 text-center leading-relaxed">{currentQuizLog.adabSession.quizzes[quizStep].question}</p></div>
                                 {quizStatus !== 'RESULT' ? (
                                     <div className="space-y-3 mb-6">{currentShuffledAnswers.map((ans, idx) => (<button key={idx} onClick={() => setSelectedAnswer(ans)} className={`w-full p-4 rounded-xl border-2 text-right font-bold transition-all transform active:scale-95 ${selectedAnswer === ans ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-md ring-2 ring-amber-200' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white hover:border-amber-300'}`}>{ans}</button>))}</div>
                                 ) : (
                                     <div className="mb-6 text-center animate-bounce-in">{selectedAnswer === currentQuizLog.adabSession.quizzes[quizStep].correctAnswer ? <div className="bg-green-100 p-6 rounded-2xl border-2 border-green-400 text-green-900 shadow-inner"><p className="text-5xl mb-2">🎉</p><p className="font-bold text-2xl">إجابة صحيحة!</p></div> : <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-300 text-red-900 shadow-inner"><p className="text-5xl mb-2">😢</p><p className="font-bold text-2xl">إجابة خاطئة</p></div>}</div>
                                 )}
                             </div>
                             <div className="pt-4 border-t mt-auto">
                                 {quizStatus === 'IDLE' && <Button onClick={() => setQuizStatus('CONFIRMING')} disabled={!selectedAnswer} className="w-full text-lg py-4 shadow-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl">تأكيد الإجابة</Button>}
                                 {quizStatus === 'CONFIRMING' && <div className="flex gap-3"><Button variant="outline" onClick={() => setQuizStatus('IDLE')} className="flex-1 py-3 border-gray-300">تراجع</Button><Button onClick={handleConfirmAnswer} className="flex-[2] py-3 bg-amber-500 hover:bg-amber-600 shadow-lg text-lg">نعم، متأكد ✅</Button></div>}
                                 {quizStatus === 'RESULT' && <Button onClick={handleNextQuestion} className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg rounded-xl">{quizStep < currentQuizLog.adabSession.quizzes.length - 1 ? 'السؤال التالي ⬅' : 'إنهاء وعرض النتيجة 🏁'}</Button>}
                             </div>
                        </div>
                    </div>
                )}

                {/* --- TABS --- */}
                <div className="flex justify-center mb-6">
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-md shadow-inner overflow-x-auto no-scrollbar border border-gray-200">
                        <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'timeline' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>📊 التقارير</button>
                        <button onClick={() => setActiveTab('next')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'next' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>📝 اللوح</button>
                        <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'schedule' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>📅 المواعيد</button>
                        <button onClick={() => setActiveTab('fees')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'fees' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>💰 الرسوم</button>
                    </div>
                </div>

                {isLatestAbsent && !latestLog?.isAdab && (<div className="mb-6 bg-red-600 text-white p-4 rounded-xl shadow-lg animate-pulse flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-3xl">⚠️</span><div><h4 className="font-bold text-lg">تنبيه: غياب الطالب اليوم</h4></div></div><button onClick={() => onMarkSeen(student.id, [latestLog!.id])} className="bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100">علمت بذلك</button></div>)}
                {feeNotification && (<div className={`mb-6 p-4 rounded-xl shadow-lg border-r-4 animate-fade-in flex items-center gap-3 ${feeNotification.level === 3 ? 'bg-red-50 border-red-500 text-red-900' : 'bg-blue-50 border-blue-500 text-blue-900'}`}><div><h4 className="font-bold text-sm opacity-80">رسالة من الإدارة</h4><p className="font-bold">{feeNotification.message}</p></div></div>)}
                
                {activeTab === 'timeline' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4"><div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 text-center"><p className="text-emerald-800 font-bold text-sm">حضور الأسبوع</p><p className="text-3xl font-bold text-emerald-600 mt-1">{stats.weekPresence}</p></div><div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 text-center"><p className="text-blue-800 font-bold text-sm">حضور الشهر</p><p className="text-3xl font-bold text-blue-600 mt-1">{stats.monthPresence}</p></div></div>
                        {chartData.length > 0 && (<div className="bg-white rounded-2xl shadow-md p-6 border border-emerald-50"><h3 className="text-lg font-bold text-gray-700 mb-4">الأداء</h3><div className="h-48 w-full" dir="ltr"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{fontSize: 12}} /><YAxis hide /><Tooltip /><Area type="monotone" dataKey="score" stroke="#059669" fill="#059669" fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div></div>)}
                        
                        {sortedLogs.length === 0 ? (<div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm">لا توجد سجلات حتى الآن</div>) : (sortedLogs.map(log => {
                                const isAdabLog = log.isAdab;
                                const isDone = isQuizCompleted(log);
                                return (
                                <div key={log.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative transition-all duration-500 ${!log.seenByParent ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
                                    {!log.seenByParent && !isAdabLog && (<div className="bg-red-50 p-2 text-center border-b border-red-100 flex justify-between items-center px-4"><p className="text-red-600 font-bold text-sm">🔔 تقرير جديد!</p><button onClick={() => onMarkSeen(student.id, [log.id])} className="bg-red-500 text-white text-xs px-4 py-1.5 rounded-full hover:bg-red-600 transition shadow-sm">أؤكد الاطلاع</button></div>)}
                                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center"><div><span className="font-bold text-gray-800 block">📅 {new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>{log.seenByParent && (<span className="text-green-600 text-xs font-bold border border-green-200 px-2 py-1 rounded bg-green-50">تم الاطلاع ✅</span>)}</div>
                                    
                                    {isAdabLog ? (
                                        <div className="p-6 text-center bg-gradient-to-b from-amber-50 to-orange-50 border-t-4 border-amber-400 relative">
                                            <div className="flex justify-center items-center gap-2 mb-4"><span className="text-3xl">🌟</span><h3 className="text-amber-900 font-bold text-xl drop-shadow-sm">{log.adabSession?.title || "مجلس الآداب"}</h3></div>
                                            {log.adabSession && log.adabSession.quizzes && !isDone ? (
                                                <div onClick={(e) => { e.stopPropagation(); handleStartQuiz(log.id); }} className="bg-white rounded-2xl p-5 shadow-lg border-2 border-amber-300 cursor-pointer transform hover:scale-[1.02] transition-all group relative overflow-hidden">
                                                    <p className="text-amber-800 font-bold text-lg mb-3 leading-relaxed relative z-10">"{log.adabSession.quizzes[0].question}"</p>
                                                    <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold shadow-md animate-pulse">إجابة السؤال والمشاركة 👈</button>
                                                </div>
                                            ) : (
                                                <div className="mt-2 bg-white/50 p-4 rounded-xl border border-amber-200"><p className="text-amber-800 font-bold text-sm mb-2">✅ شكراً للمشاركة</p>{isDone && <div className="inline-block bg-white text-amber-700 px-6 py-2 rounded-full font-black text-xl shadow-sm border border-amber-200">{log.parentQuizScore} / {log.parentQuizMax}</div>}</div>
                                            )}
                                        </div>
                                    ) : log.isAbsent ? (
                                        <div className="p-6 text-center bg-red-50"><p className="text-red-600 font-bold text-lg">غائب ❌</p></div>
                                    ) : (
                                        <div className="p-4 grid gap-4 md:grid-cols-2">
                                            {log.jadeed && (<div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-600 font-bold mb-1">الحفظ الجديد</p><p className="font-bold text-gray-800">{log.jadeed.name} <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">{log.jadeed.grade}</span></p></div>)}
                                            {log.murajaah && log.murajaah.length > 0 && (<div className="bg-amber-50 p-3 rounded-lg border border-amber-100"><p className="text-xs text-amber-600 font-bold mb-1">المراجعة</p>{log.murajaah.map((m, idx) => <div key={idx} className="flex justify-between text-sm font-bold text-gray-700 border-b border-amber-200/50 pb-1 mb-1 last:mb-0 last:border-0 last:pb-0"><span>{m.name}</span><span>{m.grade}</span></div>)}</div>)}
                                        </div>
                                    )}
                                </div>
                            )})
                        )}
                    </div>
                )}
                
                {activeTab === 'next' && (<div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in text-center">{!student.nextPlan ? (<div className="py-10"><p className="text-gray-400 text-lg">لم يحدد المعلم الواجب القادم بعد.</p></div>) : (<div className="space-y-6"><div className="bg-blue-50 p-6 rounded-xl border border-blue-200"><h3 className="text-2xl font-bold text-blue-800 mb-2">اللوح (الحفظ الجديد)</h3><p className="text-xl text-gray-800 font-bold">{student.nextPlan.jadeed.name}</p></div><div className="bg-amber-50 p-6 rounded-xl border border-amber-200"><h3 className="text-xl font-bold text-amber-800 mb-4">المراجعة المطلوبة</h3>{student.nextPlan.murajaah.map((m, idx) => <div key={idx} className="bg-white p-3 rounded-lg shadow-sm mb-2 text-gray-800 font-bold">{m.name}</div>)}</div></div>)}</div>)}
                {activeTab === 'schedule' && <div className="bg-white p-6 rounded-xl shadow-lg text-center text-gray-500">خاصية الجدول قيد التحديث...</div>}
                {activeTab === 'fees' && (<div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in"><h3 className="font-bold text-xl text-gray-800 mb-6">سجل المدفوعات</h3>{student.payments.length === 0 ? <p className="text-gray-500 text-center">لا توجد مدفوعات.</p> : student.payments.map(p => <div key={p.id} className="bg-emerald-50 p-3 mb-2 rounded border border-emerald-100 flex justify-between font-bold"><span>{p.title}</span><span className="text-emerald-700">{p.amount} ج.م</span></div>)}</div>)}
            </div>
        </div>
    );
};
