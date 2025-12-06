
import React, { useState, useEffect } from 'react';
import { Student, AppState, Teacher, DailyLog, Announcement, QuizItem, Payment } from './types';
import { DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';
import { db } from './firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  writeBatch,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

// Logo Component
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
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
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

const normalizeArabicNumbers = (str: string) => {
  return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
};

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [organizationName, setOrganizationName] = useState(() => localStorage.getItem('muhaffiz_org_name') || "دار التوحيد");
  
  // App State
  const [appState, setAppState] = useState<AppState>({ 
    students: [], 
    teachers: [], 
    announcements: [], 
    currentUser: { role: 'GUEST' } 
  });

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => setNotification({ message, type });

  // --- FIRESTORE SUBSCRIPTIONS ---

  // 1. Fetch Global Data (Teachers, Announcements)
  useEffect(() => {
    // Teachers Listener
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const ts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
      setTeachers(ts);
    });

    // Announcements Listener
    const qAnnouncements = query(collection(db, 'announcements'), orderBy('date', 'desc'));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      const anns = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(anns);
    });

    return () => {
      unsubTeachers();
      unsubAnnouncements();
    };
  }, []);

  // 2. Fetch Students based on Role
  useEffect(() => {
    setStudents([]); // Clear on role switch
    
    if (appState.currentUser.role === 'GUEST') return;

    let q;
    if (appState.currentUser.role === 'ADMIN') {
        q = query(collection(db, 'students'));
    } else if (appState.currentUser.role === 'TEACHER' && appState.currentUser.id) {
        q = query(collection(db, 'students'), where('teacherId', '==', appState.currentUser.id));
    } else if (appState.currentUser.role === 'PARENT' && appState.currentUser.id) {
        q = query(collection(db, 'students'), where('__name__', '==', appState.currentUser.id));
    }

    if (!q) return;

    const unsubStudents = onSnapshot(q, (snapshot) => {
        const fetchedStudents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            logs: [], // Initialize empty, filled by subcollection listener
            payments: []
        } as Student));

        setStudents(prev => {
            // Simple merge strategy: If student exists in prev, keep their logs/payments to prevent flash
            // until sub-listener updates
            return fetchedStudents.map(newS => {
                const existing = prev.find(p => p.id === newS.id);
                if (existing) {
                    return { ...newS, logs: existing.logs, payments: existing.payments };
                }
                return newS;
            });
        });
    });

    return () => unsubStudents();
  }, [appState.currentUser.role, appState.currentUser.id]);

  // 3. Fetch Logs/Subcollections for Loaded Students
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    students.forEach(student => {
       // Listen to Logs
       const logsQuery = query(collection(db, `students/${student.id}/logs`), orderBy('date', 'desc'));
       const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
           const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyLog));
           setStudents(prev => prev.map(s => s.id === student.id ? { ...s, logs } : s));
       });
       unsubscribers.push(unsubLogs);

       // Listen to Payments
       const payQuery = query(collection(db, `students/${student.id}/payments`), orderBy('date', 'desc'));
       const unsubPay = onSnapshot(payQuery, (snapshot) => {
           const payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
           setStudents(prev => prev.map(s => s.id === student.id ? { ...s, payments } : s));
       });
       unsubscribers.push(unsubPay);
    });

    return () => {
        unsubscribers.forEach(u => u());
    };
    // Re-run only if student IDs list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.map(s => s.id).join(',')]); 


  // --- LOGIN & NAVIGATION STATE ---
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
  
  const handleParentLogin = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!parentSelectedTeacher) { setLoginError('يرجى اختيار المعلم أولاً'); return; } 
      
      const cleanCode = normalizeArabicNumbers(parentCodeInput.trim());
      setLoginError('جاري البحث...');

      // Query Firestore for student
      const q = query(
          collection(db, 'students'), 
          where('parentCode', '==', cleanCode),
          where('teacherId', '==', parentSelectedTeacher)
      );
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const studentData = docSnap.data() as Student;
          const studentId = docSnap.id;

          if (studentData.parentPhone) { 
              setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: studentId, name: studentData.name } })); 
              setLoginError(''); 
          } else { 
              setPendingStudentId(studentId); 
              setShowPhoneSetup(true); 
              setLoginError(''); 
          } 
      } else {
          setLoginError('كود الطالب غير صحيح أو لا يتبع هذا المعلم.');
      }
  };
  
  const handleCompleteParentProfile = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      const cleanPhone = normalizeArabicNumbers(parentPhoneInput.trim());
      if (!cleanPhone || cleanPhone.length < 10) { setLoginError('يرجى كتابة رقم هاتف صحيح'); return; } 
      
      if (pendingStudentId) {
          await updateDoc(doc(db, 'students', pendingStudentId), { parentPhone: cleanPhone });
          setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: pendingStudentId, name: "ولي الأمر" } })); 
          setShowPhoneSetup(false); 
          setPendingStudentId(null); 
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
      setStudents([]); 
  };

  // --- ACTIONS (FIRESTORE) ---

  const handleSaveLog = async (studentId: string, log: DailyLog, nextPlan?: any) => {
      // 1. Add Log to Subcollection
      // Remove 'id' from log object to let Firestore generate one, or use the placeholder
      const { id, ...logData } = log;
      await addDoc(collection(db, `students/${studentId}/logs`), logData);

      // 2. Update Student Next Plan
      if (nextPlan) {
          await updateDoc(doc(db, 'students', studentId), { nextPlan });
      }
      showNotification('تم حفظ السجل بنجاح');
  };

  const handleAddPayment = async (studentId: string, payment: Payment) => {
      const { id, ...payData } = payment;
      await addDoc(collection(db, `students/${studentId}/payments`), payData);
      showNotification('تم تسجيل الدفع بنجاح');
  };

  const handleGenericStudentUpdate = async (student: Student) => {
     // Strip subcollections before saving to the student doc to avoid overwriting or bloating
     const { logs, payments, id, ...data } = student as any;
     await updateDoc(doc(db, 'students', id), data);
  };

  const deleteStudents = async (studentIds: string[]) => {
      if (!window.confirm("هل أنت متأكد من حذف هؤلاء الطلاب؟ لا يمكن التراجع.")) return;
      const batch = writeBatch(db);
      studentIds.forEach(id => {
          batch.delete(doc(db, 'students', id));
      });
      await batch.commit();
      showNotification('تم حذف الطلاب بنجاح');
  };
  
  const markRemainingStudentsAbsent = async (specificIds?: string[]) => { 
    const teacherId = appState.currentUser.id || 'unknown'; 
    const teacherName = appState.currentUser.name || 'المعلم'; 
    
    const todayString = new Date().toDateString();
    let targetIds = specificIds || [];

    if (targetIds.length === 0 && !specificIds) {
        // Auto-detect
        students.forEach(s => {
            if (s.teacherId === teacherId) {
                const hasLog = s.logs.some(l => new Date(l.date).toDateString() === todayString);
                if (!hasLog) targetIds.push(s.id);
            }
        });
    }

    if (targetIds.length === 0) { 
        showNotification("تم تسجيل جميع الطلاب بالفعل.", 'success'); 
        return; 
    } 
    
    if (!specificIds && !window.confirm(`سيتم تسجيل الغياب لـ ${targetIds.length} طالب. تأكيد؟`)) return;

    const batch = writeBatch(db);
    targetIds.forEach(sid => {
        const newLogRef = doc(collection(db, `students/${sid}/logs`));
        const log = { 
            date: new Date().toISOString(), 
            teacherId, 
            teacherName, 
            seenByParent: false, 
            isAbsent: true, 
            notes: 'تم تسجيل الغياب تلقائياً.' 
        };
        batch.set(newLogRef, log);
    });
    
    await batch.commit();
    showNotification(`تم تسجيل الغياب لـ ${targetIds.length} طالب`, 'success'); 
  };

  const addStudent = async (name: string, code: string) => { 
      const teacherId = appState.currentUser.id || 't1';
      const newStudentData = {
          name, 
          parentCode: code, 
          teacherId,
          weeklySchedule: DAYS_OF_WEEK.map(d => ({ day: d, events: [] })),
          createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'students'), newStudentData);
      return { id: ref.id, ...newStudentData, logs: [], payments: [] } as Student; 
  };

  const addTeacher = async (name: string, loginCode: string) => { 
      await addDoc(collection(db, 'teachers'), { name, loginCode });
      showNotification('تم إضافة المحفظ'); 
  };
  const updateTeacher = async (id: string, name: string, loginCode: string) => { 
      await updateDoc(doc(db, 'teachers', id), { name, loginCode });
      showNotification('تم التعديل'); 
  };
  const deleteTeacher = async (id: string) => { 
      await deleteDoc(doc(db, 'teachers', id));
      showNotification('تم الحذف'); 
  };

  const markLogsAsSeen = async (studentId: string, logIds: string[]) => {
      const batch = writeBatch(db);
      logIds.forEach(lid => {
          const logRef = doc(db, `students/${studentId}/logs`, lid);
          batch.update(logRef, { seenByParent: true, seenAt: new Date().toISOString() });
      });
      await batch.commit();
      showNotification('تم تأكيد الاطلاع');
  };

  const addAnnouncement = async (ann: Announcement) => { 
      const { id, ...data } = ann; 
      await addDoc(collection(db, 'announcements'), data);
  };
  const deleteAnnouncement = async (id: string) => { 
      await deleteDoc(doc(db, 'announcements', id));
  };

  const handlePublishAdab = async (title: string, quizzes: QuizItem[]) => {
      const teacherId = appState.currentUser.id;
      const teacherName = appState.currentUser.name || 'المعلم';
      if (!teacherId) return;

      const todayIso = new Date().toISOString();
      
      // 1. Save Session to Firestore (for record)
      await addDoc(collection(db, 'adab_sessions'), {
          title, quizzes, date: todayIso, teacherId
      });

      // 2. Announce it
      await addAnnouncement({
          id: 'temp',
          teacherId, teacherName, 
          content: `***${title}\nيرجى المشاركة في يوم الآداب الآن!`,
          date: todayIso,
          type: 'GENERAL'
      });

      // 3. Create "Pending" Log for ALL students of this teacher
      const batch = writeBatch(db);
      students.forEach(s => {
          if (s.teacherId === teacherId) {
              const newLogRef = doc(collection(db, `students/${s.id}/logs`));
              const log = {
                  date: todayIso,
                  teacherId,
                  teacherName,
                  isAbsent: false,
                  isAdab: true,
                  adabSession: { title, quizzes }, 
                  seenByParent: false,
                  notes: ""
              };
              batch.set(newLogRef, log);
          }
      });
      await batch.commit();
      showNotification('تم نشر درس الآداب لجميع الطلاب', 'success');
  };

  const handleQuickAnnouncement = (type: 'ADAB' | 'HOLIDAY', payload?: any) => {
     if (type === 'ADAB') {
        // Logic inside dashboard calls onPublishAdab usually
     } else {
         addAnnouncement({
             id: 'temp',
             teacherId: appState.currentUser.id || '',
             teacherName: appState.currentUser.name || '',
             content: "🎉 تنبيه هام: غداً إجازة رسمية للحلقة.",
             date: new Date().toISOString(),
             type: 'GENERAL'
         });
         showNotification('تم الإرسال');
     }
  };

  return (
      <>
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
                onUpdateOrganizationName={(n) => { setOrganizationName(n); localStorage.setItem('muhaffiz_org_name', n); }}
            />
        ) : appState.currentUser.role === 'TEACHER' ? (
            <TeacherDashboard 
                teacherName={appState.currentUser.name || 'المعلم'}
                teacherId={appState.currentUser.id || 't1'}
                students={students.filter(s => s.teacherId === appState.currentUser.id)}
                announcements={announcements}
                onUpdateStudent={handleGenericStudentUpdate}
                onSaveLog={handleSaveLog} 
                onAddPayment={handleAddPayment}
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
                onUpdateStudent={handleGenericStudentUpdate} 
                onLogout={handleLogout}
                onMarkSeen={markLogsAsSeen}
                onSaveQuizResult={async (studentId, logId, score, max) => {
                    await updateDoc(doc(db, `students/${studentId}/logs`, logId), {
                        parentQuizScore: score,
                        parentQuizMax: max,
                        seenByParent: true,
                        seenAt: new Date().toISOString()
                    });
                }}
            />
        ) : (
            // ... LOGIN SCREEN ...
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 px-4 pt-8 pb-12 overflow-y-auto">
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md w-full border border-white">
                <Logo title={organizationName} />

                {!showPhoneSetup ? (
                    <>
                        {loginView === 'SELECTION' && (
                            <div className="space-y-4 animate-fade-in">
                                <button onClick={() => { setLoginView('PARENT'); setLoginError(''); }} className="w-full bg-white hover:bg-emerald-50 border-2 border-emerald-100 p-6 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-emerald-200 transition">👨‍👩‍👧‍👦</div>
                                    <div className="text-right"><h3 className="font-bold text-lg text-emerald-900">دخول ولي الأمر</h3><p className="text-sm text-gray-500">تابع تقدم ابنك وتواصل مع المعلم</p></div><span className="mr-auto text-emerald-300 text-xl group-hover:text-emerald-500">⬅</span>
                                </button>
                                <button onClick={() => { setLoginView('TEACHER'); setLoginError(''); }} className="w-full bg-white hover:bg-blue-50 border-2 border-blue-100 p-6 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-200 transition">👳‍♂️</div>
                                    <div className="text-right"><h3 className="font-bold text-lg text-blue-900">دخول المعلم</h3><p className="text-sm text-gray-500">إدارة الحلقة وتسجيل الطلاب</p></div><span className="mr-auto text-blue-300 text-xl group-hover:text-blue-500">⬅</span>
                                </button>
                                <div className="mt-8 text-center pt-4 border-t border-gray-100"><button onClick={() => setLoginView('ADMIN')} className="text-xs text-gray-400 hover:text-gray-600 font-bold">🔐 دخول المسؤول (المبرمج)</button></div>
                            </div>
                        )}

                        <div className="space-y-8">
                        {loginView === 'PARENT' && (
                            <form onSubmit={handleParentLogin} className="space-y-4 animate-slide-up relative">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute -top-12 right-0 text-gray-500 hover:text-emerald-600 flex items-center gap-1 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">↩ عودة</button>
                                <h3 className="text-center font-bold text-emerald-800 text-lg mb-4">تسجيل دخول ولي الأمر</h3>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1">اختر اسم المعلم</label><select className="w-full p-3 border border-gray-300 rounded-lg bg-white" value={parentSelectedTeacher} onChange={(e) => setParentSelectedTeacher(e.target.value)}><option value="">-- اختر الاسم --</option>{teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1">كود الطالب</label><input type="text" placeholder="أدخل الكود" className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none" value={parentCodeInput} onChange={(e) => setParentCodeInput(e.target.value)} /></div>
                                {loginError && <p className="text-red-500 text-sm text-center font-bold bg-red-50 p-2 rounded border border-red-100">{loginError}</p>}
                                <Button type="submit" className="w-full text-lg">دخول</Button>
                            </form>
                        )}

                        {loginView === 'TEACHER' && (
                            <form onSubmit={handleTeacherLogin} className="space-y-4 animate-slide-up relative">
                                <button type="button" onClick={() => setLoginView('SELECTION')} className="absolute -top-12 right-0 text-gray-500 hover:text-blue-600 flex items-center gap-1 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">↩ عودة</button>
                                <h3 className="text-center font-bold text-blue-800 text-lg mb-4">تسجيل دخول المعلم</h3>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1 text-center">اختر اسم المعلم</label><select className="w-full p-3 border border-gray-300 rounded-lg bg-white" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}><option value="">-- اختر الاسم --</option>{teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}</select></div>
                                <div><label className="block text-sm font-medium text-gray-600 mb-1 text-center">الرقم الخاص (كود الدخول)</label><input type="password" className="w-full p-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 outline-none font-mono" value={teacherCodeInput} onChange={(e) => setTeacherCodeInput(e.target.value)} placeholder="******" /></div>
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
                        <p className="text-sm text-gray-500 text-center mb-6">يرجى إدخال رقم الهاتف لمرة واحدة فقط، لتمكين المحفظ من التواصل معكم.</p>
                        <form onSubmit={handleCompleteParentProfile} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-600 mb-1">رقم هاتف ولي الأمر</label><input type="tel" placeholder="01xxxxxxxxx" className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none" value={parentPhoneInput} onChange={(e) => setParentPhoneInput(e.target.value)} /></div>
                            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                            <Button type="submit" className="w-full">حفظ ودخول</Button>
                            <Button type="button" variant="outline" onClick={handleLogout} className="w-full">إلغاء</Button>
                        </form>
                    </div>
                )}
            </div>
            </div>
        )}
      </>
  );
};

export default App;
