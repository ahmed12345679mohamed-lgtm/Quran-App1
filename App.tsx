import React, { useState, useEffect } from 'react';
import { Student, AppState, UserRole, Teacher, DailyLog, Announcement, QuizItem, AdabSession } from './types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';

// استيراد الإعدادات من الملف الخارجي لضمان عدم التكرار
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

// تفعيل التخزين المؤقت (للعمل بدون إنترنت)
try {
  enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
          console.warn('الخاصية تعمل في تبويب واحد فقط');
      } else if (err.code === 'unimplemented') {
          console.warn('المتصفح لا يدعم التخزين المحلي');
      }
  });
} catch (e) {
  console.log("Persistence already enabled");
}

const Logo = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center mb-8">
    <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl shadow-lg mb-4 border-4 border-white animate-bounce-in">
      🕌
    </div>
    <h1 className="text-4xl font-bold font-serif text-emerald-900 text-center">{title}</h1>
    <p className="text-gray-500 mt-1 text-lg">رفيقك في رحلة القرآن</p>
  </div>
);

const NotificationToast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const timer = setTimeout(onClose, 5000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 min-w-[300px] justify-center text-center ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <span className="text-2xl">{type === 'success' ? '✅' : '⚠️'}</span>
      <span className="font-bold">{message}</span>
    </div>
  );
};

const normalizeArabicNumbers = (str: string) => str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

const App: React.FC = () => {
  // الحالة الافتراضية
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adabArchive, setAdabArchive] = useState<AdabSession[]>([]);
  
  const [organizationName, setOrganizationName] = useState(() => localStorage.getItem('muhaffiz_org_name') || "دار التوحيد");
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // متغيرات لتشخيص الأخطاء - ستظهر لك السبب الحقيقي
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ERROR'>('CONNECTING');
  const [detailedError, setDetailedError] = useState('');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => setNotification({ message, type });

  // --- 1. مرحلة الاتصال ---
  useEffect(() => {
    const signIn = async () => {
      try {
        await signInAnonymously(auth);
        setConnectionStatus('CONNECTED');
      } catch (error: any) {
        console.error("Firebase Connection Error:", error);
        setConnectionStatus('ERROR');
        // تفصيل نوع الخطأ لعرضه للمستخدم
        if (error.code === 'auth/operation-not-allowed') {
          setDetailedError("❌ سبب الخطأ: لم يتم تفعيل الدخول المجهول (Anonymous) في موقع فايربيز.");
        } else if (error.code === 'auth/network-request-failed') {
          setDetailedError("❌ سبب الخطأ: مشكلة في الإنترنت، الجهاز غير قادر على الوصول لسيرفرات جوجل.");
        } else if (error.code === 'auth/api-key-not-valid') {
           setDetailedError("❌ سبب الخطأ: مفتاح API غير صحيح. تأكد من نسخ المفاتيح بدقة.");
        } else {
          setDetailedError(`❌ رمز الخطأ: ${error.code} - ${error.message}`);
        }
      }
    };
    
    // تشغيل الاتصال
    signIn();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setConnectionStatus('CONNECTED');
        console.log("Logged in as:", user.uid);
      }
    });

    const handleOnline = () => { setIsOnline(true); showNotification('تم استعادة الاتصال بالإنترنت', 'success'); };
    const handleOffline = () => { setIsOnline(false); showNotification('انقطع الاتصال - وضع الأوفلاين', 'error'); };
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);

    return () => { unsubscribeAuth(); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // --- 2. جلب البيانات ---
  useEffect(() => {
    // جلب الطلاب
    const qStudents = query(collection(db, "students"));
    const unsubStudents = onSnapshot(qStudents, { includeMetadataChanges: true }, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as Student));
    }, (error) => {
        console.error("Firestore Error:", error);
        if (error.code === 'permission-denied') {
            setConnectionStatus('ERROR');
            setDetailedError("❌ سبب الخطأ: قواعد الأمان (Rules) تمنع القراءة. يرجى تعديل Rules في فايربيز لتكون: allow read, write: if true;");
        }
    });

    const qTeachers = query(collection(db, "teachers"));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => setTeachers(snapshot.docs.map(doc => doc.data() as Teacher)));

    const qAnnouncements = query(collection(db, "announcements"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
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

  // State Management
  const [appState, setAppState] = useState<AppState>({ students, teachers, announcements, adabArchive, currentUser: { role: 'GUEST' } });
  useEffect(() => setAppState(prev => ({ ...prev, students, teachers, announcements, adabArchive })), [students, teachers, announcements, adabArchive]);

  // --- LOGIN LOGIC ---
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

  const handleTeacherLogin = (e: React.FormEvent) => { e.preventDefault(); const t = teachers.find(x => x.id === selectedTeacherId); if(t && t.loginCode === normalizeArabicNumbers(teacherCodeInput)) { setAppState(prev => ({...prev, currentUser: { role: 'TEACHER', id: t.id, name: t.name }})); setLoginError(''); } else { setLoginError('بيانات الدخول غير صحيحة'); } };
  const handleParentLogin = (e: React.FormEvent) => { e.preventDefault(); const cleanCode = normalizeArabicNumbers(parentCodeInput.trim()); const s = students.find(st => st.parentCode === cleanCode && st.teacherId === parentSelectedTeacher); if(s) { if(s.parentPhone) { setAppState(prev => ({...prev, currentUser: { role: 'PARENT', id: s.id, name: s.name }})); setLoginError(''); } else { setPendingStudentId(s.id); setShowPhoneSetup(true); setLoginError(''); } } else { setLoginError('الكود غير صحيح أو الطالب غير مسجل عند هذا المعلم'); } };
  const handleCompleteParentProfile = async (e: React.FormEvent) => { e.preventDefault(); const phone = normalizeArabicNumbers(parentPhoneInput); if(pendingStudentId && phone.length >= 10) { const s = students.find(x => x.id === pendingStudentId); if(s) { await setDoc(doc(db, "students", s.id), { ...s, parentPhone: phone }); setAppState(prev => ({...prev, currentUser: { role: 'PARENT', id: s.id, name: s.name }})); setShowPhoneSetup(false); } } else { setLoginError('رقم الهاتف غير صحيح'); } };
  const handleAdminLogin = (e: React.FormEvent) => { e.preventDefault(); if(adminPassword === (localStorage.getItem('admin_password') || '456888')) { setAppState(prev => ({...prev, currentUser: { role: 'ADMIN', name: 'المبرمج' }})); setLoginError(''); } else { setLoginError('كلمة المرور خطأ'); } };
  const handleLogout = () => { setAppState(prev => ({...prev, currentUser: { role: 'GUEST' }})); setLoginView('SELECTION'); setLoginError(''); setParentCodeInput(''); setTeacherCodeInput(''); setAdminPassword(''); setShowPhoneSetup(false); };

  // --- CRUD FUNCTIONS ---
  const updateStudent = async (s: Student) => { try { await setDoc(doc(db, "students", s.id), s); } catch(e) { showNotification('تم الحفظ محلياً وسيتم الرفع عند الاتصال', 'success'); } };
  const deleteStudents = async (ids: string[]) => { if(window.confirm('هل أنت متأكد من الحذف؟')) ids.forEach(id => deleteDoc(doc(db, "students", id))); };
  const markAbsences = async (absentIds: string[], excusedIds: string[]) => { 
      const teacherId = appState.currentUser.id || 'unknown'; const teacherName = appState.currentUser.name || 'المعلم';
      [...absentIds, ...excusedIds].forEach(async (id) => {
          const s = students.find(x => x.id === id);
          if(s) {
              const isExcused = excusedIds.includes(id);
              const log: DailyLog = { id: 'abs_'+Date.now(), date: new Date().toISOString(), teacherId, teacherName, seenByParent: false, isAbsent: true, notes: isExcused ? 'عذر مقبول' : 'غياب بدون عذر' };
              await setDoc(doc(db, "students", s.id), { ...s, logs: [log, ...s.logs] });
          }
      });
      showNotification('تم تسجيل الغياب', 'success');
  };
  const addStudent = async (name: string, code: string) => { const s: Student = { id: 's_'+Date.now(), teacherId: appState.currentUser.id!, name, parentCode: code, logs: [], payments: [], weeklySchedule: DAYS_OF_WEEK.map(d => ({day: d, events: []})) }; try { await setDoc(doc(db, "students", s.id), s); return s; } catch(e) { showNotification('تمت الإضافة محلياً', 'success'); return s; } };
  const addTeacher = async (name: string, code: string) => { const t: Teacher = { id: 't_'+Date.now(), name, loginCode: code }; await setDoc(doc(db, "teachers", t.id), t); showNotification('تمت الإضافة'); };
  const updateTeacher = async (id: string, name: string, code: string) => { await setDoc(doc(db, "teachers", id), { id, name, loginCode: code }); showNotification('تم التعديل'); };
  const deleteTeacher = async (id: string) => { if(window.confirm('حذف؟')) deleteDoc(doc(db, "teachers", id)); };
  const markSeen = async (sid: string, lids: string[]) => { const s = students.find(x => x.id === sid); if(s) { const logs = s.logs.map(l => lids.includes(l.id) ? { ...l, seenByParent: true, seenAt: new Date().toISOString() } : l); await setDoc(doc(db, "students", sid), { ...s, logs }); } };
  const addAnnounce = async (a: Announcement) => { await setDoc(doc(db, "announcements", a.id), a); };
  const delAnnounce = async (id: string) => { if(window.confirm('حذف؟')) deleteDoc(doc(db, "announcements", id)); };
  
  const publishAdab = async (title: string, quizzes: QuizItem[]) => {
      const teacherId = appState.currentUser.id!; const teacherName = appState.currentUser.name!;
      const ann: Announcement = { id: 'ann_'+Date.now(), teacherId, teacherName, content: `***${title}\nيرجى المشاركة في حل الأسئلة!`, date: new Date().toISOString(), type: 'GENERAL' };
      await setDoc(doc(db, "announcements", ann.id), ann);
      const myStudents = students.filter(s => s.teacherId === teacherId);
      const today = new Date().toDateString();
      myStudents.forEach(async s => {
          const hasLog = s.logs.findIndex(l => new Date(l.date).toDateString() === today);
          let newLogs = [...s.logs];
          const sessionData = { id: 'sess_'+Date.now(), title, quizzes, date: new Date().toISOString() };
          if(hasLog >= 0) { newLogs[hasLog] = { ...newLogs[hasLog], isAdab: true, adabSession: sessionData }; }
          else { newLogs = [{ id: 'adab_'+Date.now(), date: new Date().toISOString(), teacherId, teacherName, isAbsent: false, isAdab: true, adabSession: sessionData, seenByParent: false }, ...newLogs]; }
          await setDoc(doc(db, "students", s.id), { ...s, logs: newLogs });
      });
      showNotification('تم النشر بنجاح', 'success');
  };

  const handleEditAdab = () => {}; 
  const handleDeleteAdab = () => {};
  const handleQuickAnnouncement = () => {};

  // --- إذا كان هناك خطأ في الاتصال، اعرض الشاشة الحمراء ---
  if (connectionStatus === 'ERROR') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center" dir="rtl">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-red-800 mb-4">توقف التطبيق: فشل الاتصال بقاعدة البيانات</h1>
              <div className="bg-white p-4 rounded-lg border-2 border-red-200 shadow-md text-right max-w-lg">
                  <p className="font-bold text-gray-700 mb-2">تفاصيل الخطأ التقني:</p>
                  <code className="block bg-gray-100 p-2 rounded text-red-600 text-sm font-mono dir-ltr mb-4">
                      {detailedError || "Unknown Error"}
                  </code>
                  <p className="text-sm text-gray-600 mb-2">
                      💡 <b>الحل المقترح:</b>
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>تأكد من تفعيل <b>Anonymous Auth</b> في موقع فايربيز (Authentication).</li>
                      <li>تأكد من أن <b>Firestore Rules</b> تسمح بالكتابة (allow read, write: if true).</li>
                      <li>تأكد من اتصالك بالإنترنت.</li>
                  </ul>
              </div>
              <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition">🔄 إعادة المحاولة</button>
          </div>
      );
  }

  return (
      <>
        {!isOnline && <div className="bg-gray-800 text-white text-center text-xs p-1 fixed top-0 w-full z-[110]">📡 وضع عدم الاتصال (Offline)</div>}
        {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

        {appState.currentUser.role === 'ADMIN' ? (
            <AdminDashboard teachers={teachers} students={students} onAddTeacher={addTeacher} onUpdateTeacher={updateTeacher} onDeleteTeacher={deleteTeacher} onLogout={handleLogout} onShowNotification={showNotification} organizationName={organizationName} onUpdateOrganizationName={setOrganizationName} />
        ) : appState.currentUser.role === 'TEACHER' ? (
            <TeacherDashboard teacherName={appState.currentUser.name!} teacherId={appState.currentUser.id!} students={students.filter(s => s.teacherId === appState.currentUser.id)} allTeachers={teachers} announcements={announcements} adabArchive={adabArchive} onUpdateStudent={updateStudent} onAddStudent={addStudent} onDeleteStudents={deleteStudents} onMarkAbsences={markAbsences} onAddAnnouncement={addAnnounce} onDeleteAnnouncement={delAnnounce} onLogout={handleLogout} onShowNotification={showNotification} onPublishAdab={publishAdab} onEditAdab={handleEditAdab} onDeleteAdab={handleDeleteAdab} onQuickAnnouncement={handleQuickAnnouncement} />
        ) : appState.currentUser.role === 'PARENT' ? (
             <ParentDashboard student={students.find(s => s.id === appState.currentUser.id)!} announcements={announcements} onUpdateStudent={updateStudent} onLogout={handleLogout} onMarkSeen={markSeen} />
        ) : (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 px-4 pt-8 pb-12 overflow-y-auto">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md w-full border border-white">
                <Logo title={organizationName} />
                {!showPhoneSetup ? (
                    <>
                        {loginView === 'SELECTION' && (
                            <div className="space-y-4 animate-fade-in">
                                <button onClick={() => { setLoginView('PARENT'); setLoginError(''); }} className="w-full bg-white hover:bg-emerald-50 border-2 border-emerald-100 p-6 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-emerald-200 transition">👨‍👩‍👧‍👦</div>
                                    <div className="text-right"><h3 className="font-bold text-lg text-emerald-900">دخول ولي الأمر</h3><p className="text-sm text-gray-500">تابع تقدم ابنك وتواصل مع المعلم</p></div>
                                </button>
                                <button onClick={() => { setLoginView('TEACHER'); setLoginError(''); }} className="w-full bg-white hover:bg-blue-50 border-2 border-blue-100 p-6 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-200 transition">👳‍♂️</div>
                                    <div className="text-right"><h3 className="font-bold text-lg text-blue-900">دخول المعلم</h3><p className="text-sm text-gray-500">إدارة الحلقة وتسجيل الطلاب</p></div>
                                </button>
                                <div className="mt-8 text-center pt-4 border-t border-gray-100"><button onClick={() => setLoginView('ADMIN')} className="text-xs text-gray-400 hover:text-gray-600 font-bold">🔐 دخول المسؤول (المبرمج)</button></div>
                            </div>
                        )}
                        <div className="space-y-8">
                        {loginView === 'PARENT' && (
                            <form onSubmit={handleParentLogin} className="space-y-4 animate-slide-up relative pt-2">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute left-0 -top-8 text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">↩ عودة</button>
                                <h3 className="text-center font-bold text-emerald-800 text-lg mb-4">تسجيل دخول ولي الأمر</h3>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1">اختر اسم المعلم</label><select className="w-full p-3 border border-gray-300 rounded-lg bg-white" value={parentSelectedTeacher} onChange={(e) => setParentSelectedTeacher(e.target.value)}><option value="">-- اختر الاسم --</option>{teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1">كود الطالب</label><input type="text" placeholder="أدخل الكود" className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none" value={parentCodeInput} onChange={(e) => setParentCodeInput(e.target.value)} /></div>
                                {loginError && <p className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded border border-red-100">{loginError}</p>}
                                <Button type="submit" className="w-full text-lg">دخول</Button>
                            </form>
                        )}
                        {loginView === 'TEACHER' && (
                            <form onSubmit={handleTeacherLogin} className="space-y-4 animate-slide-up relative pt-2">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute left-0 -top-8 text-gray-500 hover:text-blue-600 flex items-center gap-1 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">↩ عودة</button>
                                <h3 className="text-center font-bold text-blue-800 text-lg mb-4">تسجيل دخول المعلم</h3>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1 text-center">اختر اسم المعلم</label><select className="w-full p-3 border border-gray-300 rounded-lg bg-white" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}><option value="">-- اختر الاسم --</option>{teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1 text-center">الرقم الخاص</label><input type="password" className="w-full p-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 outline-none font-mono" value={teacherCodeInput} onChange={(e) => setTeacherCodeInput(e.target.value)} placeholder="******" /></div>
                                {loginError && <p className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded border border-red-100">{loginError}</p>}
                                <Button variant="secondary" type="submit" className="w-full" disabled={!selectedTeacherId}>دخول</Button>
                            </form>
                        )}
                        {loginView === 'ADMIN' && (
                            <form onSubmit={handleAdminLogin} className="space-y-4 animate-slide-up relative border-t pt-4 mt-4">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute -top-10 right-0 text-gray-500 hover:text-gray-800 font-bold text-xs bg-gray-100 px-2 py-1 rounded">إلغاء</button>
                                <h3 className="text-center font-bold text-gray-700">دخول المبرمج</h3>
                                <input type="password" placeholder="كلمة المرور" className="w-full p-2 border rounded text-center" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                                {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                                <Button variant="danger" type="submit" className="w-full">دخول المسؤول</Button>
                            </form> 
                        )}
                        </div>
                    </>
                ) : (
                    <div className="animate-fade-in">
                        <h3 className="text-xl font-bold text-center mb-2 text-emerald-800">إكمال البيانات</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">يرجى إدخال رقم الهاتف لمرة واحدة فقط</p>
                        <form onSubmit={handleCompleteParentProfile} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-600 mb-1">رقم هاتف ولي الأمر</label><input type="tel" placeholder="01xxxxxxxxx" className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none" value={parentPhoneInput} onChange={(e) => setParentPhoneInput(e.target.value)} /></div>
                            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                            <Button type="submit" className="w-full">حفظ ودخول</Button>
                            <Button type="button" variant="outline" onClick={handleLogout} className="w-full">إلغاء</Button>
                        </form>
                    </div>
                )}
                {deferredPrompt && (<div className="mt-6 text-center animate-bounce"><Button onClick={handleInstallClick} className="w-full bg-emerald-800 hover:bg-emerald-900 shadow-lg border border-emerald-400">📲 تثبيت التطبيق (أندرويد)</Button></div>)}
                {isIOS && !deferredPrompt && (<div className="mt-6 text-center bg-gray-50 p-3 rounded-lg border border-gray-200"><p className="text-xs text-gray-600 font-bold mb-1">لتثبيت التطبيق على الآيفون:</p><p className="text-xs text-gray-500">اضغط على زر المشاركة <span className="text-lg">⎋</span> ثم اختر "Add to Home Screen"</p></div>)}
            </div>
            <div className="mt-6 text-center text-emerald-800/50 text-sm"><p>يعمل التطبيق بدون إنترنت. يتم حفظ البيانات على الهاتف.</p></div>
            </div>
        )}
      </>
  );
};

export default App;