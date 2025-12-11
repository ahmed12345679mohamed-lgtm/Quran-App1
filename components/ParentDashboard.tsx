import React, { useState } from 'react';
import { Student, Announcement, DailyLog } from '../types';
import { formatSimpleDate, formatTime12Hour, JUZ_LIST } from '../constants';

interface ParentDashboardProps {
  student: Student;
  announcements: Announcement[];
  onUpdateStudent: (s: Student) => void;
  onLogout: () => void;
  onMarkSeen: (sid: string, lids: string[]) => void;
}

const StatCard = ({ label, value, color, icon }: any) => (
    <div className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all`}>
        <div className={`absolute right-0 top-0 w-1.5 h-full ${color}`}></div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${color.replace('bg-', 'text-').replace('500', '600')} bg-slate-50 group-hover:scale-110 transition-transform`}>{icon}</div>
        <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-2xl font-black text-slate-800">{value}</p>
        </div>
    </div>
);

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ student, announcements, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'HOME'|'LOGS'|'ANNOUNCEMENTS'>('HOME');
  
  const lastLog = student.logs[0];
  const totalPresent = student.logs.filter(l => !l.isAbsent).length;
  const totalAbsent = student.logs.filter(l => l.isAbsent).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 shadow-sm flex justify-between items-center border-b border-slate-100">
         <div>
             <h1 className="font-bold text-lg text-slate-800">{student.name}</h1>
             <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100">كود: {student.parentCode}</span>
         </div>
         <button onClick={onLogout} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-500 transition">↪️</button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        
        {activeTab === 'HOME' && (
            <div className="space-y-6 animate-slide-up">
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 text-xs font-medium mb-1 tracking-wide">آخر نشاط مسجل</p>
                        {lastLog ? (
                            <div>
                                <h2 className="text-3xl font-bold mb-3">{formatSimpleDate(lastLog.date)}</h2>
                                <div className={`flex items-center gap-2 text-sm w-fit px-4 py-1.5 rounded-full backdrop-blur-md font-bold ${lastLog.isAbsent ? 'bg-red-500/20 text-red-100 border border-red-500/30' : 'bg-emerald-400/20 text-emerald-50 border border-emerald-400/30'}`}>
                                    {lastLog.isAbsent ? '❌ غياب' : '✅ تم التسميع'}
                                </div>
                            </div>
                        ) : (
                            <p className="text-lg font-bold opacity-80">لا يوجد سجلات بعد</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <StatCard label="أيام الحضور" value={totalPresent} color="bg-blue-500" icon="📅" />
                    <StatCard label="أيام الغياب" value={totalAbsent} color="bg-red-500" icon="🚫" />
                </div>

                {/* Next Plan */}
                {student.nextPlan && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-indigo-400"></div>
                        <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">📌 الواجب القادم</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-100/50">
                                <span className="text-xs text-purple-600 font-bold">الحفظ:</span>
                                <span className="font-bold text-slate-700 text-sm">{student.nextPlan.jadeed.name}</span>
                            </div>
                            {student.nextPlan.murajaah?.map((m, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-xs text-slate-500 font-bold">مراجعة:</span>
                                    <span className="font-bold text-slate-700 text-sm">{m.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="space-y-4 animate-slide-up">
                <h3 className="font-bold text-slate-700 px-2 text-sm">سجل المتابعة اليومي</h3>
                {student.logs.length === 0 ? <p className="text-center text-slate-400 py-10 text-sm">السجل فارغ</p> : 
                 student.logs.map(log => (
                    <div key={log.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-50 p-2.5 rounded-xl text-center min-w-[50px]">
                                    <span className="block text-lg font-bold text-slate-700 leading-none">{new Date(log.date).getDate()}</span>
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">{new Date(log.date).toLocaleDateString('en-US',{month:'short'})}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{formatSimpleDate(log.date)}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{log.teacherName}</p>
                                </div>
                            </div>
                            {log.isAbsent ? 
                                <span className="bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1.5 rounded-full border border-red-100">غياب</span> : 
                                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-full border border-emerald-100">حضور</span>
                            }
                        </div>
                        {!log.isAbsent && !log.isAdab && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-50">
                                    <p className="text-[9px] text-emerald-600 font-bold mb-1 uppercase tracking-wide">الحفظ الجديد</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{log.jadeed?.name}</p>
                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-100 text-emerald-600 mt-1 inline-block font-bold shadow-sm">{log.jadeed?.grade}</span>
                                </div>
                                <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-50">
                                    <p className="text-[9px] text-amber-600 font-bold mb-1 uppercase tracking-wide">المراجعة</p>
                                    {log.murajaah?.map((m,i) => (
                                        <div key={i} className="flex justify-between items-center text-sm font-bold text-slate-700 mb-1 last:mb-0">
                                            <span className="truncate max-w-[80px]">{m.name}</span>
                                            <span className="text-[9px] text-amber-600 font-normal">({m.grade})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {log.notes && <div className="mt-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl italic border border-slate-100 leading-relaxed">"{log.notes}"</div>}
                    </div>
                 ))
                }
            </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 px-6 py-2 flex justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
          {[{id:'HOME',l:'الرئيسية',i:'🏠'},{id:'LOGS',l:'السجل',i:'📋'},{id:'ANNOUNCEMENTS',l:'التنبيهات',i:'🔔'}].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 transition-all duration-300 p-2 rounded-xl ${activeTab === item.id ? 'text-emerald-600 bg-emerald-50 -translate-y-2 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <span className="text-xl">{item.i}</span>
                  <span className="text-[9px] font-bold">{item.l}</span>
                  {item.id === 'ANNOUNCEMENTS' && announcements.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
              </button>
          ))}
      </div>
    </div>
  );
};