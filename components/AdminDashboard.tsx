import React, { useState } from 'react';
import { Teacher, Student } from '../types';
import { Button } from './Button';

interface AdminDashboardProps {
  teachers: Teacher[];
  students: Student[];
  onAddTeacher: (name: string, code: string) => void;
  onUpdateTeacher: (id: string, name: string, code: string) => void;
  onDeleteTeacher: (id: string) => void;
  onLogout: () => void;
  onShowNotification: (msg: string, type: 'success' | 'error') => void;
  organizationName: string;
  onUpdateOrganizationName: (name: string) => void;
}

const StatBox = ({ label, val, color }: any) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center hover:shadow-md transition-all duration-300 group">
        <h3 className="text-4xl font-black text-slate-800 mb-2 group-hover:scale-110 transition-transform">{val}</h3>
        <p className={`text-xs font-bold uppercase tracking-widest ${color}`}>{label}</p>
    </div>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const [activeView, setActiveView] = useState<'TEACHERS' | 'SETTINGS'>('TEACHERS');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherCode, setNewTeacherCode] = useState('');

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
        <div className="bg-slate-900 text-white p-8 pb-32 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="flex justify-between items-center mb-10 relative z-10">
                <h1 className="text-3xl font-bold tracking-tight">لوحة الإدارة 🛠️</h1>
                <button onClick={props.onLogout} className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition backdrop-blur-md">خروج</button>
            </div>
            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto relative z-10">
                <StatBox label="المعلمون" val={props.teachers.length} color="text-blue-500" />
                <StatBox label="الطلاب" val={props.students.length} color="text-emerald-500" />
            </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-10 pb-20">
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-100 p-2">
                    <button onClick={() => setActiveView('TEACHERS')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'TEACHERS' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>المحفظين</button>
                    <button onClick={() => setActiveView('SETTINGS')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'SETTINGS' ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>الإعدادات</button>
                </div>

                <div className="p-8">
                    {activeView === 'TEACHERS' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2">✨ إضافة محفظ جديد</h3>
                                <div className="space-y-3">
                                    <input className="w-full p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition text-sm" placeholder="الاسم" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} />
                                    <input className="w-full p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition font-mono text-center tracking-widest text-sm" placeholder="كود الدخول (4 أرقام)" value={newTeacherCode} onChange={e => setNewTeacherCode(e.target.value)} />
                                    <Button onClick={() => { if(newTeacherName && newTeacherCode) { props.onAddTeacher(newTeacherName, newTeacherCode); setNewTeacherName(''); setNewTeacherCode(''); } }} className="w-full py-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-2xl font-bold">إضافة +</Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {props.teachers.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition group hover:border-slate-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl shadow-sm">👳‍♂️</div>
                                            <div>
                                                <p className="font-bold text-slate-800">{t.name}</p>
                                                <p className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded w-fit mt-1">كود: {t.loginCode}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => props.onDeleteTeacher(t.id)} className="text-red-300 hover:text-red-600 bg-red-50 p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100">🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeView === 'SETTINGS' && (
                        <div className="space-y-6 animate-fade-in text-center py-10">
                            <label className="block text-sm font-bold text-slate-500">اسم الدار / المؤسسة</label>
                            <input className="w-full p-5 text-2xl font-black text-center border-2 border-slate-100 rounded-3xl focus:border-slate-800 outline-none transition bg-slate-50 focus:bg-white text-slate-800" value={props.organizationName} onChange={e => props.onUpdateOrganizationName(e.target.value)} />
                            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl inline-block border border-slate-100">سيظهر هذا الاسم في أعلى جميع الشاشات.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};