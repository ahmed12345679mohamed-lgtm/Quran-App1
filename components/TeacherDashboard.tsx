import React, { useState, useMemo } from 'react';
import { Student, Grade, QuranAssignment, Announcement, Payment, QuizItem, Teacher, AttendanceRecord, MultiSurahDetail, ExamDayDetail, AdabSession } from '../types';
import { SURAH_NAMES, JUZ_LIST, SURAH_DATA, formatTime12Hour, formatSimpleDate, formatDateWithDay } from '../constants';
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
  onMarkAbsences: (absentIds: string[], excusedIds: string[]) => void;
  onAddAnnouncement: (announcement: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onPublishAdab: (title: string, quizzes: QuizItem[]) => void;
  onEditAdab: (sessionId: string, title: string, quizzes: QuizItem[]) => void;
  onDeleteAdab: (sessionId: string) => void;
  onQuickAnnouncement: (type: 'ADAB' | 'HOLIDAY', payload?: any) => void;
}

const emptyAssignment: QuranAssignment = { type: 'SURAH', name: SURAH_NAMES[0], ayahFrom: 1, ayahTo: 7, grade: Grade.GOOD, multiSurahs: [] };

// --- مكونات التصميم (UI Components) ---

const Card = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
    <div onClick={onClick} className={`bg-white rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 active:scale-[0.99]' : ''} ${className}`}>
        {children}
    </div>
);

const SectionTitle = ({ title, icon, color = "text-slate-800" }: { title: string, icon: string, color?: string }) => (
    <h3 className={`font-bold ${color} text-lg mb-4 flex items-center gap-2 pb-2 border-b border-slate-50`}>
        <span className="bg-slate-100 p-1.5 rounded-lg text-xl shadow-sm">{icon}</span> {title}
    </h3>
);

const AssignmentForm: React.FC<any> = ({ data, onChange, title, colorClass, canRemove, onRemove, hideGrade }) => {
  const isSurah = data.type === 'SURAH';
  const isMulti = data.type === 'MULTI';
  const maxAyahs = useMemo(() => isSurah ? (SURAH_DATA.find(x => x.name === data.name)?.count || 286) : 286, [data.name, isSurah]);
  const ayahOptions = useMemo(() => Array.from({ length: maxAyahs }, (_, i) => i + 1), [maxAyahs]);

  return (
    <div className={`p-4 rounded-2xl border mb-3 relative transition-all ${colorClass} bg-white shadow-sm`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">📌 {title}</h4>
        {canRemove && <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-[10px] font-bold bg-red-50 px-2 py-1 rounded transition">حذف</button>}
      </div>

      <div className="flex gap-1 mb-3 bg-slate-50 p-1 rounded-lg w-fit">
        {['SURAH', 'RANGE', 'JUZ', 'MULTI'].map(type => (
          <button key={type} className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${data.type === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => onChange('type', type)}>
            {type === 'SURAH' ? 'سورة' : type === 'RANGE' ? 'نطاق' : type === 'JUZ' ? 'جزء' : 'متعدد'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {data.type === 'JUZ' ? (
           <select className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" value={data.juzNumber || 1} onChange={(e) => { onChange('juzNumber', parseInt(e.target.value)); onChange('name', JUZ_LIST[parseInt(e.target.value) - 1]); }}>
             {JUZ_LIST.map((j, i) => <option key={i} value={i+1}>{j}</option>)}
           </select>
        ) : isMulti ? (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                <div className="space-y-2 mb-3">
                    {(data.multiSurahs || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            <span className="text-xs font-bold text-slate-300 w-4">{idx + 1}</span>
                            <select className="flex-1 p-1 text-sm bg-transparent outline-none font-medium text-slate-700" value={item.name} onChange={(e) => {const l=[...data.multiSurahs]; l[idx].name=e.target.value; onChange('multiSurahs', l)}}>{SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            {!hideGrade && <select className="w-20 p-1 text-[10px] bg-slate-50 rounded border-none outline-none font-bold text-slate-500" value={item.grade||''} onChange={(e) => {const l=[...data.multiSurahs]; l[idx].grade=e.target.value; onChange('multiSurahs', l)}}><option value="">التقدير</option>{Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}</select>}
                            <button onClick={() => {const l=[...data.multiSurahs]; l.splice(idx,1); onChange('multiSurahs', l)}} className="text-red-300 hover:text-red-500 font-bold px-1">×</button>
                        </div>
                    ))}
                </div>
                <button onClick={() => onChange('multiSurahs', [...(data.multiSurahs||[]), { name: SURAH_NAMES[0] }])} className="w-full py-2 text-xs border border-dashed border-slate-300 text-slate-400 rounded-lg hover:bg-white hover:border-emerald-400 hover:text-emerald-600 transition font-bold">+ سورة أخرى</button>
            </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
             <div className="col-span-2 sm:col-span-1">
                 <label className="text-[10px] font-bold text-slate-400 mb-1 block">من</label>
                 <select className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm outline-none" value={data.name} onChange={(e) => onChange('name', e.target.value)}>{SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}</select>
             </div>
             {data.type === 'RANGE' && (
                 <div className="col-span-2 sm:col-span-1">
                   <label className="text-[10px] font-bold text-slate-400 mb-1 block">إلى</label>
                   <select className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm outline-none" value={data.endName || data.name} onChange={(e) => onChange('endName', e.target.value)}>{SURAH_NAMES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 </div>
             )}
             {isSurah && (
               <div className="col-span-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex-1"><select className="w-full bg-transparent text-center font-bold text-slate-700 outline-none text-sm" value={data.ayahFrom} onChange={(e) => onChange('ayahFrom', parseInt(e.target.value))}>{ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                  <span className="text-slate-300 font-bold">➜</span>
                  <div className="flex-1"><select className="w-full bg-transparent text-center font-bold text-slate-700 outline-none text-sm" value={data.ayahTo} onChange={(e) => onChange('ayahTo', parseInt(e.target.value))}>{ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
               </div>
             )}
          </div>
        )}
        {!hideGrade && !isMulti && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1 block">التقييم</label>
            <select className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-100" value={data.grade} onChange={(e) => onChange('grade', e.target.value)}>
                {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ id, label, icon, isActive, onClick }: any) => (
    <button onClick={onClick} className={`relative px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}>
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold">{label}</span>
    </button>
);

export const TeacherDashboard: React.FC<TeacherDashboardProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'LIST'|'ADD'|'ADAB'|'ATTENDANCE'|'STATS'|'ANNOUNCEMENTS'|'DELETE'>('LIST');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentTab, setStudentTab] = useState<'LOG'|'PLAN'|'ARCHIVE'|'CALC'|'SCHEDULE'|'FEES'>('LOG');
  const [sortMethod, setSortMethod] = useState<'ALPHABETICAL' | 'CODE'>('ALPHABETICAL');
  
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([{ id: '1', arrival: '16:00', departure: '18:00' }]);
  const [jadeed, setJadeed] = useState<QuranAssignment>({ ...emptyAssignment });
  const [murajaahList, setMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
  const [nextJadeed, setNextJadeed] = useState<QuranAssignment>({ ...emptyAssignment, grade: Grade.GOOD });
  const [nextMurajaahList, setNextMurajaahList] = useState<QuranAssignment[]>([{ ...emptyAssignment }]);
  const [notes, setNotes] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  
  const selectedStudent = useMemo(() => props.students.find(s => s.id === selectedStudentId), [props.students, selectedStudentId]);
  
  const sortedStudents = useMemo(() => {
      const sorted = [...props.students];
      if (sortMethod === 'CODE') sorted.sort((a, b) => a.parentCode.localeCompare(b.parentCode));
      else sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      return sorted;
  }, [props.students, sortMethod]);

  const handleOpenStudent = (s: Student) => {
      setSelectedStudentId(s.id);
      setStudentTab('LOG');
      const todayStr = new Date().toDateString();
      const existingLog = s.logs.find(l => new Date(l.date).toDateString() === todayStr);
      if(existingLog && !existingLog.isAbsent && !existingLog.isAdab) {
          setCurrentLogId(existingLog.id);
          setJadeed(existingLog.jadeed || { ...emptyAssignment });
          setMurajaahList(existingLog.murajaah || []);
          setNotes(existingLog.notes || '');
          setAttendanceRecords(existingLog.attendance || [{ id: '1', arrival: '16:00', departure: '18:00' }]);
      } else {
          setCurrentLogId(null);
          // Auto-fill from next plan
          if (s.nextPlan) {
              setJadeed({ ...s.nextPlan.jadeed, grade: Grade.GOOD });
              setMurajaahList(s.nextPlan.murajaah?.map(m => ({...m, grade: Grade.VERY_GOOD})) || []);
          } else {
              setJadeed({ ...emptyAssignment });
              setMurajaahList([{ ...emptyAssignment, grade: Grade.VERY_GOOD }]);
          }
          setNotes('');
          setAttendanceRecords([{ id: '1', arrival: '16:00', departure: '18:00' }]);
      }
      if(s.nextPlan) {
          setNextJadeed(s.nextPlan.jadeed);
          setNextMurajaahList(s.nextPlan.murajaah || []);
      } else {
          setNextJadeed({ ...emptyAssignment });
          setNextMurajaahList([{ ...emptyAssignment }]);
      }
  };

  const handleSaveLog = () => {
      if(!selectedStudent) return;
      const logData = { attendance: attendanceRecords, jadeed, murajaah: murajaahList, notes, seenByParent: false, isAbsent: false, isAdab: false };
      let newLogs = [...selectedStudent.logs];
      if(currentLogId) {
          newLogs = newLogs.map(l => l.id === currentLogId ? { ...l, ...logData } : l);
      } else {
          newLogs = [{ id: 'log_'+Date.now(), date: new Date().toISOString(), teacherId: props.teacherId, teacherName: props.teacherName, ...logData }, ...newLogs];
      }
      props.onUpdateStudent({ ...selectedStudent, logs: newLogs, nextPlan: { jadeed: nextJadeed, murajaah: nextMurajaahList } });
      if(!currentLogId) setCurrentLogId(newLogs[0].id);
      props.onShowNotification('تم الحفظ بنجاح ✅', 'success');
  };

  const handleSendWhatsApp = () => {
      handleSaveLog();
      if(!selectedStudent?.parentPhone) { props.onShowNotification('لا يوجد رقم هاتف', 'error'); return; }
      const formatAss = (a: QuranAssignment) => a.type === 'MULTI' ? 'سور متعددة' : a.name;
      const msg = `*🕌 تقرير متابعة الطالب - دار التوحيد 🕌*\n\n👤 *الاسم:* ${selectedStudent.name}\n📅 *التاريخ:* ${formatSimpleDate(new Date().toISOString())}\n\n✅ *الحفظ الجديد:* ${formatAss(jadeed)} (${jadeed.grade})\n🔄 *المراجعة:* ${murajaahList.map(m=>formatAss(m)).join('، ')}\n\n📝 *الواجب القادم:*\n📌 حفظ: ${formatAss(nextJadeed)}\n📌 مراجعة: ${nextMurajaahList.map(m=>formatAss(m)).join('، ')}\n\n🌷 *نسأل الله أن يجعله من أهل القرآن.*`;
      window.open(`https://wa.me/2${selectedStudent.parentPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleGenerateMessage = async () => {
      if (!selectedStudent) return;
      setIsGeneratingMessage(true);
      const tempLog: DailyLog = { id: 'temp', date: new Date().toISOString(), teacherId: props.teacherId, teacherName: props.teacherName, seenByParent: false, jadeed: jadeed, murajaah: murajaahList, notes: notes };
      const message = await generateEncouragement(selectedStudent.name, tempLog);
      setNotes(prev => prev ? prev + '\n\n' + message : message);
      setIsGeneratingMessage(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-800">
      
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
            {!selectedStudentId ? (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg shadow-md border-2 border-white ring-2 ring-emerald-50">👳‍♂️</div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-sm">أهلاً، {props.teacherName}</h1>
                        <p className="text-[10px] text-slate-500 font-medium">لوحة المعلم</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 w-full animate-slide-right">
                    <button onClick={() => setSelectedStudentId(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition text-slate-600">➜</button>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg">{selectedStudent?.name}</h1>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100">كود: {selectedStudent?.parentCode}</span>
                    </div>
                </div>
            )}
            {!selectedStudentId && (
                <button onClick={props.onLogout} className="bg-red-50 text-red-500 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition">
                    خروج 🚪
                </button>
            )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        {!selectedStudentId ? (
            <>
                {/* Tabs */}
                <div className="flex overflow-x-auto gap-3 pb-4 mb-2 no-scrollbar px-1">
                    <TabButton id="LIST" label="الطلاب" icon="👥" isActive={activeTab==='LIST'} onClick={()=>setActiveTab('LIST')} />
                    <TabButton id="ADD" label="إضافة" icon="➕" isActive={activeTab==='ADD'} onClick={()=>setActiveTab('ADD')} />
                    <TabButton id="ATTENDANCE" label="الغياب" icon="📅" isActive={activeTab==='ATTENDANCE'} onClick={()=>setActiveTab('ATTENDANCE')} />
                    <TabButton id="ADAB" label="الآداب" icon="🌟" isActive={activeTab==='ADAB'} onClick={()=>setActiveTab('ADAB')} />
                </div>

                {activeTab === 'LIST' && (
                    <div className="animate-fade-in space-y-3">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <p className="text-xs text-slate-500 font-bold">عدد الطلاب: {props.students.length}</p>
                            <div className="flex gap-2">
                                <button onClick={() => setSortMethod('ALPHABETICAL')} className={`text-[10px] px-2 py-1 rounded-lg ${sortMethod === 'ALPHABETICAL' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'}`}>أبجدي</button>
                                <button onClick={() => setSortMethod('CODE')} className={`text-[10px] px-2 py-1 rounded-lg ${sortMethod === 'CODE' ? 'bg-slate-200 text-slate-800' : 'text-slate-400'}`}>كود</button>
                            </div>
                        </div>
                        {sortedStudents.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                                <p className="text-slate-400 text-sm">لا يوجد طلاب بعد</p>
                                <button onClick={()=>setActiveTab('ADD')} className="text-emerald-600 font-bold text-sm mt-2">+ أضف طلابك</button>
                            </div>
                        ) : (
                            sortedStudents.map(s => {
                                const hasLog = s.logs.some(l => new Date(l.date).toDateString() === new Date().toDateString());
                                return (
                                    <Card key={s.id} onClick={() => handleOpenStudent(s)} className="p-4 flex items-center gap-4 cursor-pointer group border-l-4 border-l-transparent hover:border-l-emerald-500">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${hasLog ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-50' : 'bg-slate-100 text-slate-500'}`}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{s.name}</h3>
                                            <p className="text-xs text-slate-400 font-mono">كود: {s.parentCode}</p>
                                        </div>
                                        {hasLog ? <span className="text-emerald-500 text-xl">✅</span> : <span className="text-slate-200 text-xl group-hover:text-slate-400">➜</span>}
                                    </Card>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'ADD' && (
                    <Card className="p-6 animate-slide-up">
                        <SectionTitle title="تسجيل طالب جديد" icon="👤" />
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">الاسم الثلاثي</label>
                                <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} placeholder="اسم الطالب..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">كود ولي الأمر</label>
                                <input className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition font-mono text-center tracking-widest" placeholder="مثال: 105" value={newStudentCode} onChange={e=>setNewStudentCode(e.target.value)} />
                            </div>
                            <Button onClick={() => { if(newStudentName && newStudentCode) { props.onAddStudent(newStudentName, newStudentCode); setNewStudentName(''); setNewStudentCode(''); } }} className="w-full py-3.5 shadow-lg shadow-emerald-200 mt-2 text-lg">إضافة للقائمة ✨</Button>
                        </div>
                    </Card>
                )}
            </>
        ) : (
            // --- تفاصيل الطالب ---
            <div className="animate-slide-up pb-20">
                {/* Student Tabs */}
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-x-auto no-scrollbar sticky top-[70px] z-30">
                    {[{id:'LOG',l:'اليوم'}, {id:'PLAN',l:'الخطة'}, {id:'ARCHIVE',l:'السجل'}, {id:'FEES',l:'الرسوم'}].map(t => (
                        <button key={t.id} onClick={() => setStudentTab(t.id as any)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap px-4 ${studentTab === t.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                            {t.l}
                        </button>
                    ))}
                </div>

                {studentTab === 'LOG' && (
                    <div className="space-y-6">
                        {/* Attendance */}
                        <Card className="p-5 border-l-4 border-l-blue-500">
                            <SectionTitle title="الحضور والانصراف" icon="⏰" color="text-blue-900" />
                            {attendanceRecords.map((rec, i) => (
                                <div key={rec.id} className="flex gap-4 items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-blue-400 mb-1 block">وقت الحضور</label>
                                        <TimePicker value={rec.arrival} onChange={(v) => {const n=[...attendanceRecords]; n[i].arrival=v; setAttendanceRecords(n)}} />
                                    </div>
                                    <span className="text-blue-300 font-bold">➜</span>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-blue-400 mb-1 block">وقت الانصراف</label>
                                        <TimePicker value={rec.departure||''} onChange={(v) => {const n=[...attendanceRecords]; n[i].departure=v; setAttendanceRecords(n)}} />
                                    </div>
                                </div>
                            ))}
                        </Card>

                        {/* Jadeed */}
                        <AssignmentForm 
                            title="الحفظ الجديد" 
                            data={jadeed} 
                            onChange={(f: any, v: any) => setJadeed({...jadeed, [f]: v})} 
                            colorClass="border-emerald-200 bg-emerald-50/20" 
                        />
                        
                        {/* Murajaah */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><span className="bg-amber-100 p-1 rounded">🔄</span> المراجعة</h3>
                                <button onClick={() => setMurajaahList([...murajaahList, { ...emptyAssignment, grade: Grade.VERY_GOOD }])} className="text-[10px] bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 shadow-sm transition font-bold text-slate-600">
                                    + إضافة
                                </button>
                            </div>
                            {murajaahList.map((m, i) => (
                                <AssignmentForm key={i} title={`مراجعة ${i+1}`} data={m} onChange={(f:any,v:any)=>{const l=[...murajaahList];l[i]={...l[i],[f]:v};setMurajaahList(l)}} colorClass="border-amber-200 bg-amber-50/20" canRemove onRemove={()=>{setMurajaahList(murajaahList.filter((_,x)=>x!==i))}} />
                            ))}
                        </div>

                        {/* Notes */}
                        <Card className="p-4">
                            <label className="text-xs font-bold text-slate-400 mb-2 block">ملاحظات / رسالة لولي الأمر</label>
                            <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-purple-400 outline-none h-24 mb-3" placeholder="اكتب ملاحظاتك..." value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
                            <Button onClick={handleGenerateMessage} className="w-full py-2 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-none border border-purple-200" isLoading={isGeneratingMessage}>✨ اقتراح رسالة تشجيعية بالذكاء الاصطناعي</Button>
                        </Card>

                        {/* Action Bar */}
                        <div className="fixed bottom-6 left-4 right-4 max-w-xl mx-auto flex gap-3 z-50">
                            <button onClick={handleSaveLog} className="flex-1 bg-slate-800 text-white py-3.5 rounded-2xl font-bold shadow-xl shadow-slate-300 hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-slate-700/50 backdrop-blur-md">
                                <span>💾</span> حفظ
                            </button>
                            {selectedStudent?.parentPhone && (
                                <button onClick={handleSendWhatsApp} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3.5 rounded-2xl font-bold shadow-xl shadow-green-200 hover:shadow-green-300 transition flex items-center justify-center gap-2 border-t border-white/20">
                                    <span>📱</span> حفظ وإرسال واتساب
                                </button>
                            )}
                        </div>
                        <div className="h-16"></div> 
                    </div>
                )}

                {studentTab === 'PLAN' && (
                    <Card className="p-6 border-t-4 border-t-purple-500">
                        <SectionTitle title="واجب المرة القادمة" icon="📅" color="text-purple-900" />
                        <p className="text-xs text-purple-600/80 mb-6 bg-purple-50 p-3 rounded-xl border border-purple-100 leading-relaxed">
                            ما تحدده هنا سيظهر تلقائياً في خانة "الحفظ الجديد" في المرة القادمة.
                        </p>
                        <AssignmentForm title="حفظ قادم" data={nextJadeed} onChange={(f:any, v:any) => setNextJadeed({...nextJadeed, [f]: v})} colorClass="border-purple-200 bg-purple-50/20" hideGrade />
                        {nextMurajaahList.map((m, i) => (
                            <AssignmentForm key={i} title={`مراجعة قادمة ${i+1}`} data={m} onChange={(f:any,v:any)=>{const l=[...nextMurajaahList];l[i]={...l[i],[f]:v};setNextMurajaahList(l)}} colorClass="border-purple-100 bg-white" hideGrade canRemove onRemove={()=>{setNextMurajaahList(nextMurajaahList.filter((_,x)=>x!==i))}} />
                        ))}
                        <button onClick={() => setNextMurajaahList([...nextMurajaahList, {...emptyAssignment}])} className="w-full py-3 mt-2 border border-dashed border-purple-200 rounded-xl text-purple-400 text-xs font-bold hover:bg-purple-50 transition">+ إضافة مراجعة أخرى</button>
                        
                        <Button onClick={handleSaveLog} className="w-full mt-6 py-3.5 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200">حفظ الخطة 💾</Button>
                    </Card>
                )}
            </div>
        )}
      </div>
    </div>
  );
};