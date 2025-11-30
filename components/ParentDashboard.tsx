
import React, { useState, useEffect } from 'react';
import { Student, Grade, WeeklySchedule, Announcement } from '../types';
import { Button } from './Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MONTHS_LIST } from '../constants';
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

const formatTime12Hour = (time24: string) => {
    if (!time24) return '-- : --';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
};

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ student, announcements, onUpdateStudent, onLogout, onMarkSeen }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'schedule' | 'fees' | 'next'>('timeline');
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [tempSchedule, setTempSchedule] = useState<WeeklySchedule[]>([]);

  // Fee Notification State
  const [feeNotification, setFeeNotification] = useState<{ message: string, level: 1 | 2 | 3 } | null>(null);

  const sortedLogs = [...student.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
  const isLatestAbsent = latestLog && latestLog.isAbsent && !latestLog.seenByParent;
  
  // Notification Count (Unseen Logs)
  const unseenCount = student.logs.filter(l => !l.seenByParent).length;

  // Calculate Total Presence
  const totalPresence = student.logs.filter(l => !l.isAbsent).length;

  // Filter announcements: Match Teacher ID AND ensure it is the current month
  const relevantAnnouncements = announcements
    .filter(a => a.teacherId === student.teacherId)
    .filter(a => {
        const now = new Date();
        const annDate = new Date(a.date);
        // Only show if the announcement is from the current month and year
        return annDate.getMonth() === now.getMonth() && annDate.getFullYear() === now.getFullYear();
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Check Fees Automatically
  useEffect(() => {
    const checkFeeStatus = () => {
        const now = new Date();
        const day = now.getDate();
        
        // Only trigger if day >= 20
        if (day < 20) return;

        const currentMonth = MONTHS_LIST[now.getMonth()];
        const hasPaid = student.payments.some(p => p.title.includes(currentMonth));

        if (!hasPaid) {
            if (day >= 30) {
                setFeeNotification({
                    message: `تنبيه: نود تذكيركم بضرورة سداد رسوم شهر ${currentMonth} المستحقة.`,
                    level: 3
                });
            } else if (day >= 25) {
                setFeeNotification({
                    message: `تنويه: يرجى التكرم بسداد رسوم شهر ${currentMonth}.`,
                    level: 2
                });
            } else {
                setFeeNotification({
                    message: `تذكير: حان موعد سداد رسوم شهر ${currentMonth}.`,
                    level: 1
                });
            }
        }
    };

    checkFeeStatus();
  }, [student.payments]);

  const handleStartEditSchedule = () => {
      setTempSchedule([...student.weeklySchedule]);
      setEditingSchedule(true);
  };

  const handleScheduleTimeChange = (index: number, val: string) => {
      const newSched = [...tempSchedule];
      newSched[index] = { ...newSched[index], expectedTime: val };
      setTempSchedule(newSched);
  };

  const handleScheduleActiveChange = (index: number, isActive: boolean) => {
      const newSched = [...tempSchedule];
      newSched[index] = { ...newSched[index], isActive: isActive };
      setTempSchedule(newSched);
  };

  const handleSaveSchedule = () => {
      onUpdateStudent({ ...student, weeklySchedule: tempSchedule });
      setEditingSchedule(false);
      alert('تم تحديث الجدول بنجاح');
  };

  // Chart Data
  const chartData = [...student.logs]
    .filter(l => !l.isAbsent && l.jadeed) // Filter out absent days
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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Redesigned Header to Match Teacher View */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3">
            {/* Top Row: Name and Logout */}
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-xl font-bold font-serif text-emerald-800 flex-1 text-center">{student.name}</h1>
              <div className="absolute left-4 top-3 flex gap-2 items-center">
                <Button variant="outline" onClick={onLogout} className="text-xs px-2 py-1 h-8">
                    خروج
                </Button>
              </div>
              {/* Spacer for symmetry if needed, or notification dot */}
               <div className="absolute right-4 top-3">
                    {unseenCount > 0 && (
                        <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse shadow-md">
                            {unseenCount} جديد
                        </div>
                    )}
               </div>
            </div>
            
            {/* Tab Navigation - Centered Segmented Control */}
            <div className="flex justify-center">
                <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-md shadow-inner overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('timeline')}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'timeline' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        📊 التقارير
                    </button>
                    <button 
                        onClick={() => setActiveTab('next')}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'next' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        📝 اللوح
                    </button>
                    <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'schedule' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        📅 المواعيد
                    </button>
                    <button 
                        onClick={() => setActiveTab('fees')}
                        className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'fees' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        💰 الرسوم
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* Absence Alert Banner (Requirement: Message for absence) */}
        {isLatestAbsent && (
             <div className="mb-6 bg-red-600 text-white p-4 rounded-xl shadow-lg animate-pulse flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     <span className="text-3xl">⚠️</span>
                     <div>
                         <h4 className="font-bold text-lg">تنبيه هام: غياب الطالب اليوم</h4>
                         <p className="text-white/90 text-sm">نرجو التواصل مع الإدارة لمعرفة السبب.</p>
                     </div>
                 </div>
                 <button 
                    onClick={() => onMarkSeen(student.id, [latestLog!.id])}
                    className="bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100"
                 >
                     علمت بذلك
                 </button>
             </div>
        )}

        {/* Fee Notification Banner */}
        {feeNotification && (
            <div className={`mb-6 p-4 rounded-xl shadow-lg border-r-4 animate-fade-in flex items-center gap-3 ${
                feeNotification.level === 3 ? 'bg-red-50 border-red-500 text-red-900' :
                feeNotification.level === 2 ? 'bg-orange-50 border-orange-500 text-orange-900' :
                'bg-blue-50 border-blue-500 text-blue-900'
            }`}>
                <div className={`p-2 rounded-full ${
                    feeNotification.level === 3 ? 'bg-red-200' : feeNotification.level === 2 ? 'bg-orange-200' : 'bg-blue-200'
                }`}>
                    ✉️
                </div>
                <div>
                    <h4 className="font-bold text-sm opacity-80">رسالة من الإدارة</h4>
                    <p className="font-bold">{feeNotification.message}</p>
                </div>
            </div>
        )}

        {/* Announcements Section - Beautified */}
        {relevantAnnouncements.length > 0 && (
            <div className="mb-6 space-y-3">
                {relevantAnnouncements.map(ann => (
                    <div key={ann.id} className={`p-5 rounded-2xl shadow-lg animate-fade-in relative overflow-hidden ${
                        ann.type === 'EXAM' ? 'bg-gradient-to-br from-red-50 to-white border border-red-100' :
                        ann.type === 'COMPETITION' ? 'bg-gradient-to-br from-amber-50 to-white border border-amber-100' : 
                        'bg-gradient-to-br from-blue-50 to-white border border-blue-100'
                    }`}>
                         {/* Decorative Background Icon */}
                        <div className="absolute -left-4 -top-4 text-8xl opacity-10 rotate-12 pointer-events-none">
                            {ann.type === 'EXAM' ? '📝' : ann.type === 'COMPETITION' ? '🏆' : '📢'}
                        </div>

                        <div className="relative z-10">
                             <div className="flex items-center gap-2 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                    ann.type === 'EXAM' ? 'bg-red-500 text-white' : 
                                    ann.type === 'COMPETITION' ? 'bg-amber-500 text-white' : 
                                    'bg-blue-600 text-white'
                                }`}>
                                    {ann.type === 'EXAM' ? 'تنبيه اختبار' : ann.type === 'COMPETITION' ? 'مسابقة جديدة' : 'إعلان هام'}
                                </span>
                                <span className="text-xs text-gray-400 font-bold mr-auto">{new Date(ann.date).toLocaleDateString('ar-EG')}</span>
                             </div>
                             <h3 className="font-bold text-gray-800 text-lg mb-1 leading-snug">
                                {ann.content.split('\n')[0]} {/* Show first line as semi-title if possible, or just content */}
                             </h3>
                             <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                                {ann.content}
                             </p>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'timeline' && (
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 text-center">
                         <p className="text-emerald-800 font-bold text-sm">أيام الحضور الكلي</p>
                         <p className="text-3xl font-bold text-emerald-600 mt-1">{totalPresence} يوم</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 text-center">
                         <p className="text-emerald-800 font-bold text-sm">مستوى التقدم</p>
                         {/* Simple visual indicator */}
                         <div className="h-8 mt-1 flex items-center justify-center gap-1">
                             <div className="w-2 h-6 bg-emerald-400 rounded-sm"></div>
                             <div className="w-2 h-8 bg-emerald-500 rounded-sm"></div>
                             <div className="w-2 h-5 bg-emerald-300 rounded-sm"></div>
                             <div className="w-2 h-7 bg-emerald-600 rounded-sm"></div>
                         </div>
                     </div>
                </div>

                {/* Chart Section */}
                {chartData.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-md p-6 border border-emerald-50">
                    <h3 className="text-lg font-bold text-gray-700 mb-4">مستوى الأداء هذا الأسبوع</h3>
                    <div className="h-48 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                            <linearGradient id="colorJadeed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                            <YAxis hide domain={[0, 6]} />
                            <Tooltip />
                            <Area type="monotone" dataKey="jadeedScore" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorJadeed)" name="الحفظ" />
                            <Area type="monotone" dataKey="murajaahScore" stroke="#d97706" strokeWidth={2} fill="none" name="المراجعة" />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    </div>
                )}

                {/* Logs List */}
                {sortedLogs.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-sm">لا توجد سجلات حتى الآن</div>
                ) : (
                    sortedLogs.map(log => {
                        // Split AI message from notes
                        const fullNotes = log.notes || '';
                        const parts = fullNotes.split('\n\n*رسالة المساعد الذكي:*');
                        const teacherNotes = parts[0];
                        const aiMessage = parts.length > 1 ? parts[1] : null;

                        return (
                        <div key={log.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative transition-all duration-500 ${!log.seenByParent ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
                            {!log.seenByParent && (
                                <div className="bg-red-50 p-2 text-center border-b border-red-100 flex justify-between items-center px-4">
                                    <p className="text-red-600 font-bold text-sm">🔔 تقرير جديد!</p>
                                    <button 
                                        onClick={() => onMarkSeen(student.id, [log.id])}
                                        className="bg-red-500 text-white text-xs px-4 py-1.5 rounded-full hover:bg-red-600 transition shadow-sm"
                                    >
                                        أؤكد الاطلاع
                                    </button>
                                </div>
                            )}

                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                <div>
                                    <span className="font-bold text-gray-800 block">
                                        📅 {new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                    <span className="text-xs text-gray-500">المعلم: {log.teacherName}</span>
                                </div>
                                {log.seenByParent && (
                                    <span className="text-green-600 text-xs font-bold border border-green-200 px-2 py-1 rounded bg-green-50">تم الاطلاع ✅</span>
                                )}
                            </div>
                            
                            {log.isAbsent ? (
                                <div className="p-6 text-center bg-red-50">
                                    <p className="text-red-600 font-bold text-lg">غائب ❌</p>
                                    <p className="text-gray-500 mt-2 text-sm">{teacherNotes || 'لم يحضر الطالب للحلقة.'}</p>
                                </div>
                            ) : (
                                <div className="p-4 grid gap-4 md:grid-cols-2">
                                    {/* Jadeed */}
                                    {log.jadeed && (
                                        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                            <p className="text-xs text-emerald-600 font-bold mb-1">الحفظ الجديد</p>
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-gray-800">
                                                    {log.jadeed.type === 'RANGE' 
                                                       ? `من ${log.jadeed.name} إلى ${log.jadeed.endName}`
                                                       : log.jadeed.type === 'SURAH' 
                                                         ? `سورة ${log.jadeed.name}` 
                                                         : log.jadeed.name
                                                    }
                                                    <span className="block text-xs font-normal text-gray-500">
                                                        {log.jadeed.type === 'SURAH' ? `الآيات ${log.jadeed.ayahFrom} - ${log.jadeed.ayahTo}` : ''}
                                                    </span>
                                                </p>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    log.jadeed.grade === Grade.EXCELLENT ? 'bg-emerald-500 text-white' : 
                                                    log.jadeed.grade === Grade.VERY_GOOD ? 'bg-blue-500 text-white' :
                                                    log.jadeed.grade === Grade.NEEDS_WORK ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                    {log.jadeed.grade}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Murajaah */}
                                    {log.murajaah && log.murajaah.length > 0 && (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <p className="text-xs text-amber-600 font-bold mb-1">المراجعة</p>
                                            {log.murajaah.map((m, idx) => (
                                                <div key={idx} className="flex justify-between items-center mb-2 last:mb-0 border-b last:border-0 border-amber-200/50 pb-1 last:pb-0">
                                                    <p className="font-bold text-gray-800 text-sm">
                                                        {m.type === 'RANGE' 
                                                           ? `من ${m.name} إلى ${m.endName}`
                                                           : m.type === 'SURAH' ? `سورة ${m.name}` : m.name
                                                        }
                                                        <span className="text-xs font-normal text-gray-500 mx-1">
                                                            {m.type === 'SURAH' ? `(${m.ayahFrom} - ${m.ayahTo})` : ''}
                                                        </span>
                                                    </p>
                                                    <span className="text-xs font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">{m.grade}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Enhanced Attendance Info */}
                                    {log.attendance && (
                                        <div className="md:col-span-2 flex justify-between gap-4 text-sm font-bold text-gray-600 bg-gray-100 p-3 rounded-xl border border-gray-200 shadow-inner">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🕒</span>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 uppercase">وقت الحضور</span>
                                                    <span className="text-emerald-700">{formatTime12Hour(log.attendance.arrivalTime)}</span>
                                                </div>
                                            </div>
                                            {log.attendance.departureTime && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-gray-500 uppercase">وقت الانصراف</span>
                                                        <span className="text-red-700">{formatTime12Hour(log.attendance.departureTime)}</span>
                                                    </div>
                                                    <span className="text-2xl">⬅️</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {teacherNotes && (
                                        <div className="md:col-span-2 bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                                            <span className="font-bold block mb-1">📝 ملاحظات المعلم:</span>
                                            {teacherNotes}
                                        </div>
                                    )}

                                    {/* AI Encouragement Card */}
                                    {aiMessage && (
                                        <div className="md:col-span-2 bg-gradient-to-r from-purple-100 to-indigo-50 p-4 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-purple-200 rounded-full opacity-50 blur-xl"></div>
                                            <div className="relative z-10 flex items-start gap-3">
                                                <span className="text-2xl">✨</span>
                                                <div>
                                                    <h4 className="text-purple-800 font-bold text-sm mb-1">رسالة تشجيعية خاصة</h4>
                                                    <p className="text-purple-900 text-sm italic leading-relaxed">"{aiMessage.trim()}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>
        )}

        {activeTab === 'next' && (
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in text-center">
                 {!student.nextPlan ? (
                     <div className="py-10">
                         <p className="text-gray-400 text-lg">لم يحدد المعلم الواجب القادم بعد.</p>
                     </div>
                 ) : (
                     <div className="space-y-6">
                         <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                             <h3 className="text-2xl font-bold text-blue-800 mb-2">اللوح (الحفظ الجديد)</h3>
                             <p className="text-xl text-gray-800 font-bold">
                                 {student.nextPlan.jadeed.type === 'RANGE' 
                                    ? `من ${student.nextPlan.jadeed.name} إلى ${student.nextPlan.jadeed.endName}`
                                    : student.nextPlan.jadeed.type === 'SURAH' 
                                      ? `سورة ${student.nextPlan.jadeed.name}` 
                                      : student.nextPlan.jadeed.name}
                             </p>
                             {student.nextPlan.jadeed.type === 'SURAH' && (
                                <div className="mt-2 inline-block bg-white px-4 py-1 rounded-full border border-blue-200 text-blue-700 font-bold">
                                    {`من آية ${student.nextPlan.jadeed.ayahFrom} إلى ${student.nextPlan.jadeed.ayahTo}`}
                                </div>
                             )}
                         </div>

                         <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                             <h3 className="text-xl font-bold text-amber-800 mb-4">المراجعة المطلوبة</h3>
                             {student.nextPlan.murajaah.map((m, idx) => (
                                 <div key={idx} className="bg-white p-3 rounded-lg shadow-sm mb-2 text-gray-800">
                                     <span className="font-bold">
                                         {m.type === 'RANGE' 
                                            ? `من ${m.name} إلى ${m.endName}`
                                            : m.type === 'SURAH' ? `سورة ${m.name}` : m.name}
                                     </span>
                                     {m.type === 'SURAH' && <span className="text-sm text-gray-500 mr-2">({m.ayahFrom} - {m.ayahTo})</span>}
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
            </div>
        )}

        {activeTab === 'schedule' && (
             <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="font-bold text-xl text-gray-800">جدول الحضور المتوقع</h3>
                     {!editingSchedule ? (
                         <Button onClick={handleStartEditSchedule} variant="outline" className="text-xs">تعديل الجدول</Button>
                     ) : (
                         <div className="flex gap-2">
                             <Button onClick={() => setEditingSchedule(false)} variant="outline" className="text-xs">إلغاء</Button>
                             <Button onClick={handleSaveSchedule} className="text-xs">حفظ التغييرات</Button>
                         </div>
                     )}
                 </div>

                 <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded">
                    يرجى تحديد الأيام التي يحضر فيها الطالب ووقت الحضور المتوقع.
                 </p>

                 <div className="grid gap-3">
                     {(!editingSchedule ? student.weeklySchedule : tempSchedule).map((sched, idx) => (
                         <div key={sched.day} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border transition-all ${sched.isActive ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-80'}`}>
                             
                             {/* Day Name & Toggle */}
                             <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
                                 <div className={`font-bold text-lg ${sched.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {sched.day}
                                 </div>
                                 {editingSchedule && (
                                     <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition">
                                         <input 
                                             type="checkbox"
                                             checked={!sched.isActive}
                                             onChange={(e) => handleScheduleActiveChange(idx, !e.target.checked)}
                                             className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                         />
                                         <span className="text-xs font-bold text-red-600">لن يحضر (مشغول)</span>
                                     </label>
                                 )}
                             </div>

                             {/* Time Input/Display */}
                             <div className="w-full sm:w-auto">
                                 {sched.isActive ? (
                                    editingSchedule ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">وقت الحضور:</span>
                                            <div className="w-32">
                                                <TimePicker 
                                                    value={sched.expectedTime} 
                                                    onChange={(val) => handleScheduleTimeChange(idx, val)} 
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-emerald-700 font-bold font-mono text-lg flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg">
                                            <span>⏱️</span>
                                            {sched.expectedTime ? formatTime12Hour(sched.expectedTime) : '-- : --'}
                                        </div>
                                    )
                                 ) : (
                                    <span className="text-gray-400 text-sm font-bold bg-gray-200 px-3 py-1 rounded">مشغول / غياب</span>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {activeTab === 'fees' && (
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
                <h3 className="font-bold text-xl text-gray-800 mb-6">سجل المدفوعات</h3>
                {student.payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">لا توجد مدفوعات مسجلة.</p>
                ) : (
                    <div className="space-y-3">
                        {student.payments.map(pay => (
                            <div key={pay.id} className="flex justify-between items-center p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                                <div>
                                    <p className="font-bold text-gray-800">{pay.title}</p>
                                    <p className="text-sm text-gray-500">{new Date(pay.date).toLocaleDateString('ar-EG')} - استلمها: {pay.recordedBy}</p>
                                </div>
                                <span className="font-bold text-xl text-emerald-700">{pay.amount} ج.م</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};
