import React, { useState, useEffect } from 'react';
import { Student, AppState, UserRole, Teacher, DailyLog, Announcement, QuizItem } from './types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';

// --- 1. استيراد مكتبات فايربيز ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  setDoc,
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
// إضافة مكتبة المصادقة (Auth) لحل مشكلة الاتصال
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- 2. إعدادات الاتصال (بيانات دار التوحيد الحقيقية) ---
const firebaseConfig = {
  apiKey: "AIzaSyBy9-kDy0JnunaSubLm-VhliTGhP2jZs6o",
  authDomain: "dar-altawheed.firebaseapp.com",
  projectId: "dar-altawheed",
  storageBucket: "dar-altawheed.firebasestorage.app",
  messagingSenderId: "1090036818546",
  appId: "1:1090036818546:web:2439dbc444658f5c4698eb",
  measurementId: "G-3DVF71VRBN"
};

// تهيئة فايربيز
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // تهيئة المصادقة

// --- مكون الشعار ---
const Logo = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center mb-8">
    <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl shadow-lg mb-4 border-4 border-white animate-bounce-in">
      🕌
    </div>
    <h1 className="text-4xl font-bold font-serif text-emerald-900 text-center">{title}</h1>
    <p className="text-gray-500 mt-1 text-lg">رفيقك في رحلة القرآن</p>
  </div>
);

// --- مكون التنبيهات ---
const NotificationToast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 animate-slide-down min-w-[300px] justify-center ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      <span className="text-2xl">{type === 'success' ? '✅' : '⚠️'}</span>
      <span className="font-bold">{message}</span>
    </div>
  );
};

// دالة توحيد الأرقام العربية والإنجليزية
const normalizeArabicNumbers = (str: string) => {
  return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
};

const App: React.FC = () => {
  // --- تحميل البيانات والحالة (من فايربيز الآن) ---
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [organizationName, setOrganizationName] = useState(() => {
      return localStorage.getItem('muhaffiz_org_name') || "دار التوحيد";
  });

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAuthReady, setIsAuthReady] = useState(false); // حالة التأكد من الاتصال بفايربيز

  // --- تهيئة الاتصال والمصادقة ---
  useEffect(() => {
    // 1. تسجيل الدخول الصامت (Anonymous) للسماح بقراءة البيانات
    const signIn = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
        showNotification("خطأ في الاتصال بالسيرفر (Auth)", "error");
      }
    };
    signIn();

    // مراقبة حالة المصادقة
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
        console.log("Connected to Firebase as:", user.uid);
      }
    });

    // مراقبة الإنترنت
    const handleOnline = () => { setIsOnline(true); showNotification('تم استعادة الاتصال بالإنترنت', 'success'); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);

    return () => { 
      unsubscribeAuth();
      window.removeEventListener('online', handleOnline); 
      window.removeEventListener('offline', handleOffline); 
    };
  }, []);


  // --- 3. جلب البيانات (Real-time Sync) ---
  // لا نبدأ الجلب إلا بعد التأكد من المصادقة (isAuthReady)
  useEffect(() => {
    if (!isAuthReady) return;

    // جلب الطلاب
    const qStudents = query(collection(db, "students"));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Student);
      setStudents(data);
    }, (error) => {
      console.error("Students Error:", error);
      if (error.code === 'permission-denied') {
        showNotification("لا تملك صلاحية قراءة الطلاب (تأكد من Rules)", "error");
      }
    });

    // جلب المعلمين
    const qTeachers = query(collection(db, "teachers"));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Teacher);
      setTeachers(data);
    }, (error) => console.error("Teachers Error:", error));

    // جلب الإعلانات
    const qAnnouncements = query(collection(db, "announcements"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Announcement);
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncements(data);
    }, (error) => console.error("Announcements Error:", error));

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubAnnouncements();
    };
  }, [isAuthReady]); // يعتمد على جاهزية المصادقة

  useEffect(() => {
      localStorage.setItem('muhaffiz_org_name', organizationName);
      document.title = `${organizationName} - متابعة القرآن الكريم`;
  }, [organizationName]);

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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setDeferredPrompt(null); }
  };

  // Login & View State
  const [appState, setAppState] = useState<AppState>({ students: students, teachers: teachers, announcements: announcements, currentUser: { role: 'GUEST' } });
  
  // تحديث حالة التطبيق كلما تغيرت البيانات القادمة من فايربيز
  useEffect(() => {
    setAppState(prev => ({
        ...prev,
        students: students,
        teachers: teachers,
        announcements: announcements
    }));
  }, [students, teachers, announcements]);

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

  // --- دوال تسجيل الدخول (كما هي) ---
  const handleTeacherLogin = (e: React.FormEvent) => { 
      e.preventDefault(); 
      const teacher = teachers.find(t => t.id === selectedTeacherId); 
      if (teacher) { 
          const normalizedInput = normalizeArabicNumbers(teacherCodeInput);
          if (teacher.loginCode === normalizedInput) { 
              setAppState(prev => ({ ...prev, currentUser: { role: 'TEACHER', id: teacher.id, name: teacher.name } })); 
              setLoginError(''); 
          } else { 
              setLoginError("رقم الدخول (الكود الخاص) غير صحيح"); 
          } 
      } else { 
          setLoginError("الرجاء اختيار اسم المعلم"); 
      } 
  };
  
  const handleParentLogin = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!parentSelectedTeacher) { setLoginError('يرجى اختيار المعلم أولاً'); return; } 
      
      const cleanCode = normalizeArabicNumbers(parentCodeInput.trim());
      const student = students.find(s => s.parentCode === cleanCode && s.teacherId === parentSelectedTeacher); 
      
      if (student) { 
          if (student.parentPhone) { 
              setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: student.id, name: student.name } })); 
              setLoginError(''); 
          } else { 
              setPendingStudentId(student.id); 
              setShowPhoneSetup(true); 
              setLoginError(''); 
          } 
      } else { 
          const codeExistsElsewhere = students.some(s => s.parentCode === cleanCode);
          if (codeExistsElsewhere) {
              setLoginError('كود الطالب صحيح ولكن المعلم المختار غير صحيح.');
          } else {
              setLoginError('كود الطالب غير صحيح. تأكد من الرقم وحاول مرة أخرى.'); 
          }
      } 
  };
  
  const handleCompleteParentProfile = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      const cleanPhone = normalizeArabicNumbers(parentPhoneInput.trim());
      if (!cleanPhone || cleanPhone.length < 10) { setLoginError('يرجى كتابة رقم هاتف صحيح'); return; } 
      
      if (pendingStudentId) { 
          const student = students.find(s => s.id === pendingStudentId); 
          if (student) { 
              // تحديث رقم الهاتف في فايربيز
              const updatedStudent = { ...student, parentPhone: cleanPhone };
              try {
                  await setDoc(doc(db, "students", student.id), updatedStudent);
                  setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: student.id, name: student.name } })); 
                  setShowPhoneSetup(false); 
                  setPendingStudentId(null); 
              } catch (error) {
                  console.error(error);
                  setLoginError("حدث خطأ في الاتصال، حاول مرة أخرى");
              }
          } 
      } 
  };
  
  const handleAdminLogin = (e: React.FormEvent) => { 
      e.preventDefault(); 
      const savedPass = localStorage.getItem('admin_password') || '456888'; 
      if (adminPassword === savedPass) { 
          setAppState(prev => ({ ...prev, currentUser: { role: 'ADMIN', name: 'المبرمج' }})); 
          setLoginError(''); 
      } else { 
          setLoginError('كلمة المرور غير صحيحة'); 
      } 
  };
  
  const handleLogout = () => { 
      setAppState(prev => ({ ...prev, currentUser: { role: 'GUEST' } })); 
      setLoginView('SELECTION');
      setParentCodeInput(''); 
      setParentPhoneInput(''); 
      setLoginError(''); 
      setSelectedTeacherId(''); 
      setTeacherCodeInput(''); 
      setAdminPassword(''); 
      setShowPhoneSetup(false); 
  };

  // --- 4. عمليات البيانات (تعديل لتستخدم فايربيز) ---
  
  const updateStudent = async (updatedStudent: Student) => { 
      try {
          await setDoc(doc(db, "students", updatedStudent.id), updatedStudent);
      } catch (error) {
          showNotification('فشل التحديث، تأكد من الإنترنت', 'error');
      }
  };

  const deleteStudents = async (studentIds: string[]) => { 
      if(!window.confirm("هل أنت متأكد من حذف الطلاب المحددين؟")) return;
      try {
          // حذف كل طالب على حدة
          for (const id of studentIds) {
              await deleteDoc(doc(db, "students", id));
          }
          showNotification('تم حذف الطلاب بنجاح'); 
      } catch (error) {
          showNotification('حدث خطأ أثناء الحذف', 'error');
      }
  };
  
  const markRemainingStudentsAbsent = async (specificIds?: string[]) => { 
    const teacherId = appState.currentUser.id || 'unknown'; 
    const teacherName = appState.currentUser.name || 'المعلم'; 
    const todayString = new Date().toDateString(); 
    
    let idsToMark = specificIds;

    if (!idsToMark) {
        idsToMark = [];
        students.forEach(student => { 
            if (student.teacherId !== teacherId) return; 
            const hasLogToday = student.logs.some(log => new Date(log.date).toDateString() === todayString); 
            if (!hasLogToday) { 
                idsToMark!.push(student.id); 
            } 
        });
    }
    
    if (idsToMark.length === 0) { 
        showNotification("تم تسجيل جميع الطلاب لهذا اليوم بالفعل.", 'success'); 
        return; 
    } 
    
    if (!specificIds && !window.confirm(`سيتم تسجيل الغياب لـ ${idsToMark.length} طالب لم يسجلوا اليوم. هل أنت متأكد؟`)) { 
        return; 
    } 
    
    // تحديث كل طالب في فايربيز
    let successCount = 0;
    for (const studentId of idsToMark) {
        const student = students.find(s => s.id === studentId);
        if (student) {
            const absentLog: DailyLog = { 
                id: 'absent_' + Date.now() + Math.random(), 
                date: new Date().toISOString(), 
                teacherId, 
                teacherName, 
                seenByParent: false, 
                isAbsent: true, 
                notes: 'تم تسجيل الغياب تلقائياً لعدم الحضور.' 
            };
            const updatedStudent = { ...student, logs: [absentLog, ...student.logs] };
            try {
                await setDoc(doc(db, "students", student.id), updatedStudent);
                successCount++;
            } catch(e) { console.error(e); }
        }
    }

    if (successCount > 0) showNotification(`تم تسجيل الغياب لـ ${successCount} طالب بنجاح`, 'success'); 
  };

  const addStudent = async (name: string, code: string) => { 
      const newStudent: Student = { 
          id: 's_' + Date.now() + Math.random(), 
          teacherId: appState.currentUser.id || 't1', 
          name: name, 
          parentCode: code, 
          weeklySchedule: DAYS_OF_WEEK.map(d => ({ day: d, events: [] })), 
          payments: [], 
          logs: [] 
      }; 
      try {
          await setDoc(doc(db, "students", newStudent.id), newStudent);
          return newStudent; 
      } catch (error) {
          showNotification('فشل إضافة الطالب', 'error');
          throw error;
      }
  };

  const addTeacher = async (name: string, loginCode: string) => { 
      const newTeacher: Teacher = { id: 't_' + Date.now(), name, loginCode }; 
      try {
          await setDoc(doc(db, "teachers", newTeacher.id), newTeacher);
          showNotification('تم إضافة المحفظ بنجاح'); 
      } catch (error) { showNotification('خطأ في الإضافة', 'error'); }
  };

  const updateTeacher = async (id: string, name: string, loginCode: string) => { 
      const teacher = teachers.find(t => t.id === id);
      if (teacher) {
          const updated = { ...teacher, name, loginCode };
          await setDoc(doc(db, "teachers", id), updated);
          showNotification('تم تعديل بيانات المحفظ بنجاح'); 
      }
  };

  const deleteTeacher = async (id: string) => { 
      if(!window.confirm("حذف المعلم سيحذف صلاحية دخوله، هل أنت متأكد؟")) return;
      await deleteDoc(doc(db, "teachers", id));
      showNotification('تم حذف المحفظ بنجاح'); 
  };

  const markLogsAsSeen = async (studentId: string, logIds: string[]) => { 
      const student = students.find(s => s.id === studentId); 
      if (!student) return; 
      
      const studentLogs = student.logs.map(log => { 
          if (logIds.includes(log.id)) { 
              return { ...log, seenByParent: true, seenAt: new Date().toISOString() }; 
          } 
          return log; 
      }); 
      
      const updatedStudent = { ...student, logs: studentLogs }; 
      await updateStudent(updatedStudent); 
      showNotification('تم تأكيد الاطلاع', 'success'); 
  };

  const addAnnouncement = async (ann: Announcement) => { 
      try {
        await setDoc(doc(db, "announcements", ann.id), ann);
      } catch(e) { showNotification('فشل نشر الإعلان', 'error'); }
  };

  const deleteAnnouncement = async (id: string) => { 
      if(!window.confirm("حذف الإعلان؟")) return;
      await deleteDoc(doc(db, "announcements", id));
      showNotification('تم حذف الإعلان'); 
  };

  const handlePublishAdab = async (title: string, quizzes: QuizItem[]) => {
      const teacherId = appState.currentUser.id;
      const teacherName = appState.currentUser.name || 'المعلم';
      if (!teacherId) return;

      const todayIso = new Date().toISOString();
      const todayDateStr = new Date().toDateString();

      // 1. Create General Announcement
      const newAnnouncement: Announcement = {
          id: 'ann_' + Date.now(),
          teacherId,
          teacherName,
          content: `***${title}\nيرجى من ولي الأمر مشاركة الطالب في حل أسئلة يوم الآداب الآن!`,
          date: todayIso,
          type: 'GENERAL'
      };
      await addAnnouncement(newAnnouncement);
      
      // 2. Update Students Logs in Firebase
      // هذا قد يأخذ وقتاً إذا كان عدد الطلاب كبيراً، لذا يفضل استخدام Batch Write في المشاريع الكبيرة
      // لكن هنا سنستخدم Loop بسيط
      const teacherStudents = students.filter(s => s.teacherId === teacherId);
      
      for (const s of teacherStudents) {
          const existingLogIndex = s.logs.findIndex(l => new Date(l.date).toDateString() === todayDateStr);
          let updatedLogs = [...s.logs];
          
          const adabSessionData = { title: title, quizzes: quizzes };

          if (existingLogIndex >= 0) {
              updatedLogs[existingLogIndex] = {
                  ...updatedLogs[existingLogIndex],
                  isAdab: true,
                  adabSession: adabSessionData,
              };
          } else {
              const newLog: DailyLog = {
                  id: 'adab_' + Date.now() + Math.random(),
                  date: todayIso,
                  teacherId,
                  teacherName,
                  isAbsent: false,
                  isAdab: true,
                  adabSession: adabSessionData,
                  seenByParent: false,
                  notes: ""
              };
              updatedLogs = [newLog, ...updatedLogs];
          }
          
          // تحديث الطالب في القاعدة
          await setDoc(doc(db, "students", s.id), { ...s, logs: updatedLogs });
      }

      showNotification('تم نشر درس الآداب وتحديث سجلات الطلاب', 'success');
  };

  const handleQuickAnnouncement = async (type: 'ADAB' | 'HOLIDAY', payload?: any) => {
      const teacherId = appState.currentUser.id;
      const teacherName = appState.currentUser.name || 'المعلم';
      if (!teacherId) return;

      let content = "";
      if (type === 'ADAB') {
          content = `***${payload?.title || "يوم الآداب الرائع"}\nتأكد من حضور ابنك اليوم حتى لا يقل في اختبار الشهر`;
      } else {
          content = "🎉 تنبيه هام: غداً إجازة رسمية للحلقة.";
      }

      const newAnnouncement: Announcement = {
          id: 'ann_' + Date.now(),
          teacherId,
          teacherName,
          content,
          date: new Date().toISOString(),
          type: 'GENERAL'
      };
      
      await addAnnouncement(newAnnouncement);
      if (type !== 'ADAB') {
          showNotification('تم إرسال تنبيه الإجازة', 'success');
      }
  };

  return (
      <>
        {!isOnline && (
            <div className="bg-gray-800 text-white text-center text-sm p-1 fixed top-0 left-0 right-0 z-[110]">
                📡 وضع عدم الاتصال: البيانات تحفظ محلياً
            </div>
        )}

        {notification && (
            <NotificationToast 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotification(null)} 
            />
        )}

        {appState.currentUser.role === 'ADMIN' ? (
            <AdminDashboard 
                teachers={teachers}
                students={students}
                onAddTeacher={addTeacher}
                onUpdateTeacher={updateTeacher}
                onDeleteTeacher={deleteTeacher}
                onLogout={handleLogout}
                onShowNotification={showNotification}
                organizationName={organizationName}
                onUpdateOrganizationName={setOrganizationName}
            />
        ) : appState.currentUser.role === 'TEACHER' ? (
            <TeacherDashboard 
                teacherName={appState.currentUser.name || 'المعلم'}
                teacherId={appState.currentUser.id || 't1'}
                students={students.filter(s => s.teacherId === appState.currentUser.id)}
                announcements={announcements}
                onUpdateStudent={updateStudent}
                onAddStudent={addStudent}
                onDeleteStudents={deleteStudents}
                onMarkAbsences={markRemainingStudentsAbsent}
                onAddAnnouncement={addAnnouncement}
                onDeleteAnnouncement={deleteAnnouncement}
                onLogout={handleLogout}
                onShowNotification={showNotification}
                onPublishAdab={handlePublishAdab}
                onQuickAnnouncement={handleQuickAnnouncement}
            />
        ) : appState.currentUser.role === 'PARENT' ? (
             <ParentDashboard 
                student={students.find(s => s.id === appState.currentUser.id)!}
                announcements={announcements}
                onUpdateStudent={updateStudent}
                onLogout={handleLogout}
                onMarkSeen={markLogsAsSeen}
            />
        ) : (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 px-4 pt-8 pb-12 overflow-y-auto">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md w-full border border-white">
                <Logo title={organizationName} />

                {!showPhoneSetup ? (
                    <>
                        {/* MAIN SELECTION VIEW */}
                        {loginView === 'SELECTION' && (
                            <div className="space-y-4 animate-fade-in">
                                <button 
                                    onClick={() => { setLoginView('PARENT'); setLoginError(''); }}
                                    className="w-full bg-white hover:bg-emerald-50 border-2 border-emerald-100 p-6 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-emerald-200 transition">👨‍👩‍👧‍👦</div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-lg text-emerald-900">دخول ولي الأمر</h3>
                                        <p className="text-sm text-gray-500">تابع تقدم ابنك وتواصل مع المعلم</p>
                                    </div>
                                    <span className="mr-auto text-emerald-300 text-xl group-hover:text-emerald-500">⬅</span>
                                </button>

                                <button 
                                    onClick={() => { setLoginView('TEACHER'); setLoginError(''); }}
                                    className="w-full bg-white hover:bg-blue-50 border-2 border-blue-100 p-6 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-200 transition">👳‍♂️</div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-lg text-blue-900">دخول المعلم</h3>
                                        <p className="text-sm text-gray-500">إدارة الحلقة وتسجيل الطلاب</p>
                                    </div>
                                    <span className="mr-auto text-blue-300 text-xl group-hover:text-blue-500">⬅</span>
                                </button>
                                
                                <div className="mt-8 text-center pt-4 border-t border-gray-100">
                                    <button onClick={() => setLoginView('ADMIN')} className="text-xs text-gray-400 hover:text-gray-600 font-bold">
                                        🔐 دخول المسؤول (المبرمج)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* LOGIN FORMS */}
                        <div className="space-y-8">
                        {loginView === 'PARENT' && (
                            <form onSubmit={handleParentLogin} className="space-y-4 animate-slide-up relative">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute -top-12 right-0 text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">↩ عودة</button>
                                <h3 className="text-center font-bold text-emerald-800 text-lg mb-4">تسجيل دخول ولي الأمر</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">اختر اسم المعلم (الشيخ)</label>
                                    <select 
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                    value={parentSelectedTeacher}
                                    onChange={(e) => setParentSelectedTeacher(e.target.value)}
                                    >
                                    <option value="">-- اختر الاسم --</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                    </select>
                                </div>
                                <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">كود الطالب</label>
                                <input 
                                    type="text"
                                    placeholder="أدخل الكود"
                                    className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={parentCodeInput}
                                    onChange={(e) => setParentCodeInput(e.target.value)}
                                />
                                </div>
                                {loginError && <p className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded border border-red-100">{loginError}</p>}
                                <Button type="submit" className="w-full text-lg">دخول</Button>
                            </form>
                        )}

                        {loginView === 'TEACHER' && (
                            <form onSubmit={handleTeacherLogin} className="space-y-4 animate-slide-up relative">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute -top-12 right-0 text-gray-500 hover:text-blue-600 flex items-center gap-1 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">↩ عودة</button>
                                <h3 className="text-center font-bold text-blue-800 text-lg mb-4">تسجيل دخول المعلم</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">اختر اسم المعلم</label>
                                    <select 
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    >
                                    <option value="">-- اختر الاسم --</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">الرقم الخاص (كود الدخول)</label>
                                    <input 
                                        type="password"
                                        className="w-full p-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                        value={teacherCodeInput}
                                        onChange={(e) => setTeacherCodeInput(e.target.value)}
                                        placeholder="******"
                                    />
                                </div>
                                {loginError && <p className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded border border-red-100">{loginError}</p>}
                                <Button variant="secondary" type="submit" className="w-full" disabled={!selectedTeacherId}>
                                    دخول
                                </Button>
                            </form>
                        )}

                        {loginView === 'ADMIN' && (
                            <form onSubmit={handleAdminLogin} className="space-y-4 animate-slide-up relative border-t pt-4 mt-4">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute -top-10 right-0 text-gray-500 hover:text-gray-800 font-bold text-xs bg-gray-100 px-2 py-1 rounded">إلغاء</button>
                                <h3 className="text-center font-bold text-gray-700">دخول المبرمج</h3>
                                <input 
                                    type="password"
                                    placeholder="كلمة المرور"
                                    className="w-full p-2 border rounded text-center"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                />
                                {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                                <Button variant="danger" type="submit" className="w-full">دخول المسؤول</Button>
                            </form> 
                        )}
                        </div>
                    </>
                ) : (
                    <div className="animate-fade-in">
                        <h3 className="text-xl font-bold text-center mb-2 text-emerald-800">إكمال البيانات</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">يرجى إدخال رقم الهاتف لمرة واحدة فقط، لتمكين المحفظ من التواصل معكم.</p>
                        <form onSubmit={handleCompleteParentProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">رقم هاتف ولي الأمر</label>
                                <input 
                                    type="tel"
                                    placeholder="01xxxxxxxxx"
                                    className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={parentPhoneInput}
                                    onChange={(e) => setParentPhoneInput(e.target.value)}
                                />
                            </div>
                            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                            <Button type="submit" className="w-full">حفظ ودخول</Button>
                            <Button type="button" variant="outline" onClick={handleLogout} className="w-full">إلغاء</Button>
                        </form>
                    </div>
                )}

                {deferredPrompt && (
                  <div className="mt-6 text-center animate-bounce">
                    <Button onClick={handleInstallClick} className="w-full bg-emerald-800 hover:bg-emerald-900 shadow-lg border border-emerald-400">
                      📲 تثبيت التطبيق (أندرويد)
                    </Button>
                  </div>
                )}
                
                {isIOS && !deferredPrompt && (
                    <div className="mt-6 text-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-bold mb-1">لتثبيت التطبيق على الآيفون:</p>
                        <p className="text-xs text-gray-500">اضغط على زر المشاركة <span className="text-lg">⎋</span> ثم اختر "Add to Home Screen" (إضافة للشاشة الرئيسية)</p>
                    </div>
                )}
            </div>
            
            <div className="mt-6 text-center text-emerald-800/50 text-sm">
                <p>يعمل التطبيق عبر الإنترنت. يتم حفظ البيانات سحابياً.</p>
            </div>
            </div>
        )}
      </>
  );
};

export default App;