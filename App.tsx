import React, { useState, useEffect } from 'react';
import { Student, AppState, UserRole, Teacher, DailyLog, Announcement, QuizItem, AdabSession } from './types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';

// استيراد الإعدادات من الملف الخارجي
import { firebaseConfig } from './firebaseConfig';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  setDoc,
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// تهيئة فايربيز
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// تفعيل التخزين المؤقت (للحفظ بدون إنترنت)
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) { }

// دالة تنظيف البيانات
const cleanData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

// --- مكونات التصميم الاحترافي الجديدة ---

const Logo = ({ title, small = false }: { title: string, small?: boolean }) => (
  <div className={`flex flex-col items-center ${small ? 'mb-6' : 'mb-10'} relative z-10 transition-all duration-500`}>
    <div className={`${small ? 'w-16 h-16 text-2xl border-2' : 'w-24 h-24 text-4xl border-4'} bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl mb-4 border-white/50 text-white animate-fade-in`}>
      🕌
    </div>
    <h1 className={`${small ? 'text-xl' : 'text-3xl'} font-bold text-white text-center drop-shadow-lg tracking-wide`}>{title}</h1>
    {!small && <p className="text-emerald-100/80 mt-2 text-sm font-light tracking-wider">نظام المتابعة القرآني الذكي</p>}
  </div>
);

const NotificationToast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-3 min-w-[300px] justify-center text-center animate-slide-down backdrop-blur-xl border border-white/20 ${type === 'success' ? 'bg-emerald-900/90 text-white' : 'bg-red-900/90 text-white'}`}>
      <span className="text-xl">{type === 'success' ? '✅' : '⚠️'}</span>
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
};

const normalizeArabicNumbers = (str: string) => str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

const App: React.FC = () => {
  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adabArchive, setAdabArchive] = useState<AdabSession[]>([]);
  const [organizationName, setOrganizationName] = useState(() => localStorage.getItem('muhaffiz_org_name') || "دار التوحيد");
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ERROR'>('CONNECTING');
  const [detailedError, setDetailedError] = useState('');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => setNotification({ message, type });

  // --- الاتصال ---
  useEffect(() => {
    const signIn = async () => {
      try {
        await signInAnonymously(auth);
        setConnectionStatus('CONNECTED');
      } catch (error: any) {
        if (error.code !== 'auth/network-request-failed') {
             setConnectionStatus('ERROR');
             setDetailedError(error.message);
        }
      }
    };
    signIn();
    onAuthStateChanged(auth, (user) => { if(user) setConnectionStatus('CONNECTED'); });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // --- جلب البيانات ---
  useEffect(() => {
    const qStudents = query(collection(db, "students"));
    const unsubStudents = onSnapshot(qStudents, { includeMetadataChanges: true }, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student));
    });

    const qTeachers = query(collection(db, "teachers"));
    const unsubTeachers = onSnapshot(qTeachers, { includeMetadataChanges: true }, (snapshot) => setTeachers(snapshot.docs.map(doc => doc.data() as Teacher)));
    
    const qAnnouncements = query(collection(db, "announcements"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Announcement);
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncements(data);
    });

    return () => { unsubStudents(); unsubTeachers(); unsubAnnouncements(); };
  }, []);

  useEffect(() => { localStorage.setItem('muhaffiz_org_name', organizationName); document.title = `${organizationName}`; }, [organizationName]);

  // PWA Install Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstallClick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setDeferredPrompt(null); }};

  const [appState, setAppState] = useState<AppState>({ students, teachers, announcements, adabArchive, currentUser: { role: 'GUEST' } });
  useEffect(() => setAppState(prev => ({ ...prev, students, teachers, announcements, adabArchive })), [students, teachers, announcements, adabArchive]);

  // Login View State
  const [loginView, setLoginView] = useState<'SELECTION' | 'PARENT' | 'TEACHER' | 'ADMIN'>('SELECTION');
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [parentSelectedTeacher, setParentSelectedTeacher] = useState('');
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherCodeInput, setTeacherCodeInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handlers
  const handleTeacherLogin = (e: React.FormEvent) => { e.preventDefault(); const t = teachers.find(x => x.id === selectedTeacherId); if(t && t.loginCode === normalizeArabicNumbers(teacherCodeInput)) { setAppState(prev => ({...prev, currentUser: { role: 'TEACHER', id: t.id, name: t.name }})); setLoginError(''); } else { setLoginError('بيانات الدخول غير صحيحة'); } };
  const handleParentLogin = (e: React.FormEvent) => { e.preventDefault(); const cleanCode = normalizeArabicNumbers(parentCodeInput.trim()); const s = students.find(st => st.parentCode === cleanCode && st.teacherId === parentSelectedTeacher); if(s) { if(s.parentPhone) { setAppState(prev => ({...prev, currentUser: { role: 'PARENT', id: s.id, name: s.name }})); setLoginError(''); } else { setPendingStudentId(s.id); setShowPhoneSetup(true); setLoginError(''); } } else { setLoginError('الكود غير صحيح أو الطالب غير مسجل عند هذا المعلم'); } };
  const handleCompleteParentProfile = async (e: React.FormEvent) => { e.preventDefault(); const phone = normalizeArabicNumbers(parentPhoneInput); if(pendingStudentId && phone.length >= 10) { const s = students.find(x => x.id === pendingStudentId); if(s) { await setDoc(doc(db, "students", s.id), cleanData({ ...s, parentPhone: phone })); setAppState(prev => ({...prev, currentUser: { role: 'PARENT', id: s.id, name: s.name }})); setShowPhoneSetup(false); } } else { setLoginError('رقم هاتف غير صحيح'); } };
  const handleAdminLogin = (e: React.FormEvent) => { e.preventDefault(); if(adminPassword === (localStorage.getItem('admin_password') || '456888')) { setAppState(prev => ({...prev, currentUser: { role: 'ADMIN', name: 'المبرمج' }})); setLoginError(''); } else { setLoginError('كلمة المرور خطأ'); } };
  const handleLogout = () => { setAppState(prev => ({...prev, currentUser: { role: 'GUEST' }})); setLoginView('SELECTION'); setLoginError(''); setParentCodeInput(''); setTeacherCodeInput(''); setAdminPassword(''); setShowPhoneSetup(false); };

  // CRUD
  const updateStudent = async (s: Student) => { try { await setDoc(doc(db, "students", s.id), cleanData(s)); showNotification('تم الحفظ بنجاح ✅', 'success'); } catch(e: any) { showNotification('حدث خطأ في الحفظ', 'error'); } };
  const addStudent = async (name: string, code: string) => { const s: Student = { id: 's_'+Date.now(), teacherId: appState.currentUser.id!, name, parentCode: code, logs: [], payments: [], weeklySchedule: DAYS_OF_WEEK.map(d => ({day: d, events: []})) }; try { await setDoc(doc(db, "students", s.id), cleanData(s)); showNotification('تمت إضافة الطالب بنجاح ✅', 'success'); return s; } catch(e: any) { showNotification('خطأ في الإضافة', 'error'); return s; } };
  const deleteStudents = async (ids: string[]) => { if(window.confirm('حذف؟')) ids.forEach(id => deleteDoc(doc(db, "students", id))); };
  
  const markAbsences = async (absentIds: string[], excusedIds: string[]) => { 
      const teacherId = appState.currentUser.id || 'unknown'; const teacherName = appState.currentUser.name || 'المعلم';
      [...absentIds, ...excusedIds].forEach(async (id) => {
          const s = students.find(x => x.id === id);
          if(s) {
              const isExcused = excusedIds.includes(id);
              const log: DailyLog = { id: 'abs_'+Date.now(), date: new Date().toISOString(), teacherId, teacherName, seenByParent: false, isAbsent: true, notes: isExcused ? 'عذر مقبول' : 'غياب بدون عذر' };
              await setDoc(doc(db, "students", s.id), cleanData({ ...s, logs: [log, ...s.logs] }));
          }
      });
      showNotification('تم تسجيل الغياب بنجاح ✅', 'success');
  };

  const addTeacher = async (name: string, code: string) => { const t: Teacher = { id: 't_'+Date.now(), name, loginCode: code }; await setDoc(doc(db, "teachers", t.id), cleanData(t)); showNotification('تمت الإضافة'); };
  const updateTeacher = async (id: string, name: string, code: string) => { await setDoc(doc(db, "teachers", id), cleanData({ id, name, loginCode: code })); showNotification('تم التعديل'); };
  const deleteTeacher = async (id: string) => { if(window.confirm('حذف؟')) deleteDoc(doc(db, "teachers", id)); };
  const markSeen = async (sid: string, lids: string[]) => { const s = students.find(x => x.id === sid); if(s) { const logs = s.logs.map(l => lids.includes(l.id) ? { ...l, seenByParent: true, seenAt: new Date().toISOString() } : l); await setDoc(doc(db, "students", sid), cleanData({ ...s, logs })); } };
  const addAnnounce = async (a: Announcement) => { await setDoc(doc(db, "announcements", a.id), cleanData(a)); };
  const delAnnounce = async (id: string) => { if(window.confirm('حذف؟')) deleteDoc(doc(db, "announcements", id)); };
  
  const publishAdab = async (title: string, quizzes: QuizItem[]) => {
      const teacherId = appState.currentUser.id!; const teacherName = appState.currentUser.name!;
      const ann: Announcement = { id: 'ann_'+Date.now(), teacherId, teacherName, content: `***${title}\nيرجى المشاركة في حل الأسئلة!`, date: new Date().toISOString(), type: 'GENERAL' };
      await setDoc(doc(db, "announcements", ann.id), cleanData(ann));
      const myStudents = students.filter(s => s.teacherId === teacherId);
      const today = new Date().toDateString();
      myStudents.forEach(async s => {
          const hasLog = s.logs.findIndex(l => new Date(l.date).toDateString() === today);
          let newLogs = [...s.logs];
          const sessionData = { id: 'sess_'+Date.now(), title, quizzes, date: new Date().toISOString() };
          if(hasLog >= 0) { newLogs[hasLog] = { ...newLogs[hasLog], isAdab: true, adabSession: sessionData }; }
          else { newLogs = [{ id: 'adab_'+Date.now(), date: new Date().toISOString(), teacherId, teacherName, isAbsent: false, isAdab: true, adabSession: sessionData, seenByParent: false }, ...newLogs]; }
          await setDoc(doc(db, "students", s.id), cleanData({ ...s, logs: newLogs }));
      });
      showNotification('تم النشر بنجاح ✅', 'success');
  };

  const handleEditAdab = () => {}; const handleDeleteAdab = () => {}; const handleQuickAnnouncement = () => {};

  if (connectionStatus === 'ERROR') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center" dir="rtl">
              <h1 className="text-xl font-bold mb-2">تعذر الاتصال</h1>
              <p className="text-gray-400 mb-4 text-sm">{detailedError}</p>
              <button onClick={() => window.location.reload()} className="bg-emerald-600 px-6 py-2 rounded-lg">تحديث</button>
          </div>
      );
  }

  // --- واجهة المستخدم (التصميم الجديد) ---
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 font-sans text-gray-900 overflow-x-hidden selection:bg-emerald-200">
        
        {/* شريط حالة الاتصال */}
        {!isOnline && (
            <div className="bg-gray-800/90 backdrop-blur text-white text-center text-xs p-1.5 fixed top-0 w-full z-[200] font-medium tracking-wide shadow-md">
                📡 وضع الأوفلاين (يتم الحفظ تلقائياً)
            </div>
        )}

        {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

        {appState.currentUser.role === 'ADMIN' ? (
            <div className="relative z-10">
                <AdminDashboard teachers={teachers} students={students} onAddTeacher={addTeacher} onUpdateTeacher={updateTeacher} onDeleteTeacher={deleteTeacher} onLogout={handleLogout} onShowNotification={showNotification} organizationName={organizationName} onUpdateOrganizationName={setOrganizationName} />
            </div>
        ) : appState.currentUser.role === 'TEACHER' ? (
            <div className="relative z-10">
                <TeacherDashboard teacherName={appState.currentUser.name!} teacherId={appState.currentUser.id!} students={students.filter(s => s.teacherId === appState.currentUser.id)} allTeachers={teachers} announcements={announcements} adabArchive={adabArchive} onUpdateStudent={updateStudent} onAddStudent={addStudent} onDeleteStudents={deleteStudents} onMarkAbsences={markAbsences} onAddAnnouncement={addAnnounce} onDeleteAnnouncement={delAnnounce} onLogout={handleLogout} onShowNotification={showNotification} onPublishAdab={publishAdab} onEditAdab={handleEditAdab} onDeleteAdab={handleDeleteAdab} onQuickAnnouncement={handleQuickAnnouncement} />
            </div>
        ) : appState.currentUser.role === 'PARENT' ? (
             <div className="relative z-10">
                <ParentDashboard student={students.find(s => s.id === appState.currentUser.id)!} announcements={announcements} onUpdateStudent={updateStudent} onLogout={handleLogout} onMarkSeen={markSeen} />
             </div>
        ) : (
            // --- واجهة تسجيل الدخول الجديدة ---
            <div className="min-h-screen flex flex-col items-center justify-center relative z-10 px-4 py-6">
                {/* خلفية احترافية */}
                <div className="fixed inset-0 bg-gradient-to-tr from-emerald-900 via-emerald-800 to-slate-900 z-0"></div>
                <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10 z-0 pointer-events-none"></div>
                
                {/* المحتوى */}
                <div className="w-full max-w-md relative z-10">
                    <Logo title={organizationName} />

                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-black/5">
                        
                        {/* الهيدر الجديد مع زر العودة المدمج */}
                        {!showPhoneSetup && loginView !== 'SELECTION' && (
                             <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                                 <h3 className="font-bold text-gray-800 text-lg">
                                     {loginView === 'PARENT' ? 'دخول ولي الأمر' : loginView === 'TEACHER' ? 'دخول المعلم' : 'دخول المسؤول'}
                                 </h3>
                                 <button 
                                     onClick={() => { setLoginView('SELECTION'); setLoginError(''); }}
                                     className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-emerald-600 transition-colors bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow"
                                 >
                                     عودة ➜
                                 </button>
                             </div>
                        )}

                        <div className="p-8">
                            {!showPhoneSetup ? (
                                <>
                                    {/* القائمة الرئيسية */}
                                    {loginView === 'SELECTION' && (
                                        <div className="space-y-4">
                                            <p className="text-center text-gray-500 mb-6 font-medium text-sm">اختر طريقة الدخول للمتابعة</p>
                                            
                                            <button 
                                                onClick={() => { setLoginView('PARENT'); setLoginError(''); }}
                                                className="w-full bg-gradient-to-r from-emerald-50 to-white hover:from-emerald-100 hover:to-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group"
                                            >
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">👨‍👩‍👧‍👦</div>
                                                <div className="text-right flex-1">
                                                    <h3 className="font-bold text-gray-800 group-hover:text-emerald-800">ولي الأمر</h3>
                                                    <p className="text-xs text-gray-500">متابعة مستوى الأبناء</p>
                                                </div>
                                                <span className="text-gray-300 group-hover:text-emerald-500">➜</span>
                                            </button>

                                            <button 
                                                onClick={() => { setLoginView('TEACHER'); setLoginError(''); }}
                                                className="w-full bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group"
                                            >
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">👳‍♂️</div>
                                                <div className="text-right flex-1">
                                                    <h3 className="font-bold text-gray-800 group-hover:text-blue-800">المعلم</h3>
                                                    <p className="text-xs text-gray-500">إدارة الحلقة والطلاب</p>
                                                </div>
                                                <span className="text-gray-300 group-hover:text-blue-500">➜</span>
                                            </button>
                                            
                                            <div className="pt-6 text-center">
                                                <button onClick={() => setLoginView('ADMIN')} className="text-xs text-gray-400 hover:text-gray-600 font-bold transition-colors">
                                                    الدخول للإدارة
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* النماذج */}
                                    <div className="space-y-6">
                                        {loginView === 'PARENT' && (
                                            <form onSubmit={handleParentLogin} className="space-y-5 animate-fade-in">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">المعلم</label>
                                                    <div className="relative">
                                                        <select 
                                                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none font-bold text-gray-700"
                                                            value={parentSelectedTeacher}
                                                            onChange={(e) => setParentSelectedTeacher(e.target.value)}
                                                        >
                                                            <option value="">اختر اسم الشيخ...</option>
                                                            {teachers.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▼</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">كود الطالب</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="أدخل الكود هنا"
                                                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-center text-lg font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                                                        value={parentCodeInput}
                                                        onChange={(e) => setParentCodeInput(e.target.value)}
                                                    />
                                                </div>
                                                {loginError && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 text-center animate-shake">{loginError}</div>}
                                                <Button type="submit" className="w-full py-3.5 text-base font-bold shadow-lg shadow-emerald-500/20">تسجيل الدخول</Button>
                                            </form>
                                        )}

                                        {loginView === 'TEACHER' && (
                                            <form onSubmit={handleTeacherLogin} className="space-y-5 animate-fade-in">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">الاسم</label>
                                                    <div className="relative">
                                                        <select 
                                                            className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none font-bold text-gray-700"
                                                            value={selectedTeacherId}
                                                            onChange={(e) => setSelectedTeacherId(e.target.value)}
                                                        >
                                                            <option value="">اختر اسمك...</option>
                                                            {teachers.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▼</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">الرقم السري</label>
                                                    <input 
                                                        type="password"
                                                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center text-lg font-mono tracking-widest placeholder:text-sm"
                                                        value={teacherCodeInput}
                                                        onChange={(e) => setTeacherCodeInput(e.target.value)}
                                                        placeholder="******"
                                                    />
                                                </div>
                                                {loginError && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 text-center animate-shake">{loginError}</div>}
                                                <Button variant="secondary" type="submit" className="w-full py-3.5 text-base font-bold shadow-lg shadow-blue-500/20" disabled={!selectedTeacherId}>دخول</Button>
                                            </form>
                                        )}

                                        {loginView === 'ADMIN' && (
                                            <form onSubmit={handleAdminLogin} className="space-y-5 animate-fade-in">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1">كلمة المرور</label>
                                                    <input 
                                                        type="password"
                                                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all text-center"
                                                        value={adminPassword}
                                                        onChange={e => setAdminPassword(e.target.value)}
                                                    />
                                                </div>
                                                {loginError && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg border border-red-100 text-center animate-shake">{loginError}</div>}
                                                <Button variant="danger" type="submit" className="w-full py-3.5 font-bold shadow-lg">دخول</Button>
                                            </form> 
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="animate-fade-in text-center">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">👋</div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">مرحباً بك لأول مرة</h3>
                                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">لتسهيل التواصل، يرجى تسجيل رقم الواتساب الخاص بولي الأمر لمرة واحدة.</p>
                                    
                                    <form onSubmit={handleCompleteParentProfile} className="space-y-5">
                                        <div className="relative">
                                            <input 
                                                type="tel"
                                                placeholder="01xxxxxxxxx"
                                                className="w-full p-4 border-2 border-emerald-100 rounded-2xl text-center text-2xl font-black tracking-widest text-emerald-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all shadow-inner bg-emerald-50/30"
                                                value={parentPhoneInput}
                                                onChange={(e) => setParentPhoneInput(e.target.value)}
                                            />
                                            <span className="absolute top-2 right-4 text-[10px] text-emerald-600 font-bold uppercase">رقم الموبايل</span>
                                        </div>
                                        {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
                                        <Button type="submit" className="w-full py-3.5 text-lg font-bold shadow-xl shadow-emerald-500/30">حفظ ودخول 🚀</Button>
                                        <button type="button" onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 font-bold">إلغاء</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* أزرار التثبيت */}
                    <div className="mt-8 space-y-3 px-2">
                        {deferredPrompt && (
                            <button onClick={handleInstallClick} className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg">
                                📲 تثبيت التطبيق على الأندرويد
                            </button>
                        )}
                        {isIOS && !deferredPrompt && (
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl text-center text-white shadow-lg">
                                <p className="text-xs opacity-90">لتثبيت التطبيق: اضغط <span className="font-bold text-lg">⎋</span> ثم اختر "Add to Home Screen"</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 text-center">
                        <p className="text-white/40 text-[10px]">جميع الحقوق محفوظة © {new Date().getFullYear()} {organizationName}</p>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
};

export default App;