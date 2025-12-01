
import React, { useState, useEffect } from 'react';
import { Student, AppState, UserRole, Teacher, DailyLog, Announcement } from './types';
import { DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';
import { db } from './firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  query, 
  orderBy,
  getDocs,
  where,
  writeBatch
} from "firebase/firestore";

// Logo Component
const Logo = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center mb-8">
    <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl shadow-lg mb-4 border-4 border-white">
      🕌
    </div>
    <h1 className="text-4xl font-bold font-serif text-emerald-900 text-center">{title}</h1>
    <p className="text-gray-500 mt-1 text-lg">رفيقك في رحلة القرآن</p>
  </div>
);

// Notification Component
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

const App: React.FC = () => {
  // ----------- STATE -----------
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [organizationName, setOrganizationName] = useState("دار التوحيد");
  const [adminPassword, setAdminPasswordState] = useState("456888");
  
  const [isLoading, setIsLoading] = useState(true);

  // App Current State
  const [appState, setAppState] = useState<AppState>({
    students: [],
    teachers: [],
    announcements: [],
    currentUser: { role: 'GUEST' }
  });

  // Notification State
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  // ----------- FIREBASE LISTENERS (REAL-TIME) -----------

  useEffect(() => {
    // 1. Fetch Organization Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "config"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setOrganizationName(data.organizationName || "دار التوحيد");
        setAdminPasswordState(data.adminPassword || "456888");
      }
    });

    // 2. Fetch Teachers
    const qTeachers = query(collection(db, "teachers"), orderBy("name"));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      const teachersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
      setTeachers(teachersData);
    });

    // 3. Fetch Students
    const qStudents = query(collection(db, "students")); // You can limit this if needed
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsData);
    });

    // 4. Fetch Announcements
    const qAnnouncements = query(collection(db, "announcements"));
    const unsubAnnouncements = onSnapshot(qAnnouncements, (snapshot) => {
      const annData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      // Sort in memory to handle potential date string issues safely
      annData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncements(annData);
      setIsLoading(false); // Initial load complete
    });

    return () => {
      unsubSettings();
      unsubTeachers();
      unsubStudents();
      unsubAnnouncements();
    };
  }, []);

  // Sync state wrapper
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      students,
      teachers,
      announcements
    }));
  }, [students, teachers, announcements]);

  // Update Page Title
  useEffect(() => {
    document.title = `${organizationName} - متابعة القرآن الكريم`;
  }, [organizationName]);


  // ----------- OFFLINE & INSTALL -----------
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
      const handleOnline = () => { setIsOnline(true); showNotification('تم استعادة الاتصال بالإنترنت', 'success'); };
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

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
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // ----------- ACTIONS (CRUD to Firestore) -----------

  const updateStudent = async (updatedStudent: Student) => {
    try {
      const studentRef = doc(db, "students", updatedStudent.id);
      await setDoc(studentRef, updatedStudent);
      // No need to setStudents manually, onSnapshot will handle it
    } catch (e) {
      console.error(e);
      showNotification("حدث خطأ أثناء حفظ البيانات", "error");
    }
  };

  const deleteStudents = async (studentIds: string[]) => {
    try {
      const batch = writeBatch(db);
      studentIds.forEach(id => {
        const ref = doc(db, "students", id);
        batch.delete(ref);
      });
      await batch.commit();
      showNotification('تم حذف الطلاب بنجاح');
    } catch (e) {
       showNotification("فشل الحذف", "error");
    }
  };

  const markRemainingStudentsAbsent = async () => {
      const teacherId = appState.currentUser.id || 'unknown';
      const teacherName = appState.currentUser.name || 'المعلم';
      const todayString = new Date().toDateString();

      const studentsToMark: Student[] = [];
      students.forEach(student => {
          if (student.teacherId !== teacherId) return;
          const hasLogToday = student.logs.some(log => new Date(log.date).toDateString() === todayString);
          if (!hasLogToday) studentsToMark.push(student);
      });

      if (studentsToMark.length === 0) {
          showNotification("تم تسجيل جميع الطلاب لهذا اليوم بالفعل.", 'success');
          return;
      }

      if (!window.confirm(`سيتم تسجيل الغياب لـ ${studentsToMark.length} طالب. هل أنت متأكد؟`)) return;

      try {
        const batch = writeBatch(db);
        studentsToMark.forEach(student => {
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
            const ref = doc(db, "students", student.id);
            batch.set(ref, updatedStudent);
        });
        await batch.commit();
        showNotification(`تم تسجيل الغياب لـ ${studentsToMark.length} طالب بنجاح`, 'success');
      } catch (e) {
        showNotification("خطأ أثناء تسجيل الغياب", "error");
      }
  };

  const addStudent = async (name: string, manualCode: string) => {
      // Manual Code logic
      const newStudent: Student = {
          id: 's_' + Date.now() + Math.random().toString(36).substr(2, 9),
          teacherId: appState.currentUser.id || 't1', 
          name: name,
          parentCode: manualCode, // Use manual code
          weeklySchedule: DAYS_OF_WEEK.map(d => ({ day: d, expectedTime: '', isActive: true })),
          payments: [],
          logs: []
      };

      try {
        await setDoc(doc(db, "students", newStudent.id), newStudent);
        return newStudent;
      } catch (e) {
        showNotification("فشل إضافة الطالب", "error");
        throw e;
      }
  };

  const addTeacher = async (name: string, loginCode: string) => {
      const newTeacher: Teacher = {
          id: 't_' + Date.now(),
          name,
          loginCode
      };
      try {
        await setDoc(doc(db, "teachers", newTeacher.id), newTeacher);
        showNotification('تم إضافة المحفظ بنجاح');
      } catch (e) { showNotification("خطأ", "error"); }
  };

  const updateTeacher = async (id: string, name: string, loginCode: string) => {
      try {
        const ref = doc(db, "teachers", id);
        await updateDoc(ref, { name, loginCode });
        showNotification('تم تعديل بيانات المحفظ بنجاح');
      } catch (e) { showNotification("خطأ", "error"); }
  };

  const deleteTeacher = async (id: string) => {
      try {
        await deleteDoc(doc(db, "teachers", id));
        showNotification('تم حذف المحفظ بنجاح');
      } catch (e) { showNotification("خطأ", "error"); }
  };

  const markLogsAsSeen = async (studentId: string, logIds: string[]) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const updatedLogs = student.logs.map(log => {
        if (logIds.includes(log.id)) {
            return { ...log, seenByParent: true, seenAt: new Date().toISOString() };
        }
        return log;
    });

    await updateStudent({ ...student, logs: updatedLogs });
    showNotification('تم تأكيد الاطلاع', 'success');
  };

  const addAnnouncement = async (ann: Announcement) => {
      try {
        await setDoc(doc(db, "announcements", ann.id), ann);
      } catch (e) { showNotification("خطأ", "error"); }
  };

  const deleteAnnouncement = async (id: string) => {
      try {
        await deleteDoc(doc(db, "announcements", id));
        showNotification('تم حذف الإعلان');
      } catch (e) { showNotification("خطأ", "error"); }
  };

  // Handle Settings Updates
  const updateOrganizationName = async (name: string) => {
      try {
          await setDoc(doc(db, "settings", "config"), { organizationName: name }, { merge: true });
          setOrganizationName(name); // Optimistic update
      } catch (e) { showNotification("خطأ في حفظ الإعدادات", "error"); }
  };

  const updateAdminPassword = async (pass: string) => {
      try {
          await setDoc(doc(db, "settings", "config"), { adminPassword: pass }, { merge: true });
          showNotification("تم تحديث كلمة المرور", "success");
      } catch (e) { showNotification("خطأ", "error"); }
  };

  // ----------- LOGIN LOGIC -----------
  const [activeLoginTab, setActiveLoginTab] = useState<'PARENT' | 'TEACHER' | 'ADMIN'>('PARENT');
  
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [parentSelectedTeacherId, setParentSelectedTeacherId] = useState('');
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherCodeInput, setTeacherCodeInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogout = () => {
    setAppState(prev => ({ ...prev, currentUser: { role: 'GUEST' } }));
    setParentCodeInput('');
    setParentPhoneInput('');
    setLoginError('');
    setSelectedTeacherId('');
    setTeacherCodeInput('');
    setAdminPasswordInput('');
    setShowPhoneSetup(false);
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (teacher) {
        if (teacher.loginCode === teacherCodeInput) {
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
    if (!parentSelectedTeacherId) {
        setLoginError('الرجاء اختيار اسم المحفظ أولاً');
        return;
    }
    const student = students.find(s => s.parentCode === parentCodeInput && s.teacherId === parentSelectedTeacherId);
    
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
      setLoginError('كود الطالب غير صحيح، أو الطالب غير مسجل مع هذا المحفظ.');
    }
  };

  const handleCompleteParentProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!parentPhoneInput || parentPhoneInput.length < 10) {
          setLoginError('يرجى كتابة رقم هاتف صحيح');
          return;
      }
      if (pendingStudentId) {
          const student = students.find(s => s.id === pendingStudentId);
          if (student) {
              await updateStudent({ ...student, parentPhone: parentPhoneInput });
              setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: student.id, name: student.name } }));
              setShowPhoneSetup(false);
              setPendingStudentId(null);
          }
      }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPasswordInput === adminPassword) {
          setAppState(prev => ({ ...prev, currentUser: { role: 'ADMIN', name: 'المبرمج' }}));
          setLoginError('');
      } else {
          setLoginError('كلمة المرور غير صحيحة');
      }
  };

  // ----------- RENDER -----------

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600"></div>
        <p className="text-gray-500 font-bold">جاري الاتصال بقاعدة البيانات...</p>
      </div>
    );
  }

  return (
      <>
        {!isOnline && (
            <div className="bg-gray-800 text-white text-center text-sm p-1 fixed top-0 left-0 right-0 z-[110]">
                📡 وضع عدم الاتصال: التغييرات ستحفظ عند عودة الإنترنت
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
                onAddTeacher={addTeacher}
                onUpdateTeacher={updateTeacher}
                onDeleteTeacher={deleteTeacher}
                onLogout={handleLogout}
                onShowNotification={showNotification}
                organizationName={organizationName}
                onUpdateOrganizationName={updateOrganizationName}
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
                        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => { setActiveLoginTab('PARENT'); setLoginError(''); }}
                                className={`flex-1 py-2 rounded-md font-bold text-sm transition ${activeLoginTab === 'PARENT' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
                            >
                                ولي الأمر
                            </button>
                            <button 
                                onClick={() => { setActiveLoginTab('TEACHER'); setLoginError(''); }}
                                className={`flex-1 py-2 rounded-md font-bold text-sm transition ${activeLoginTab === 'TEACHER' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
                            >
                                المعلم
                            </button>
                        </div>

                        <div className="space-y-8">
                        {activeLoginTab === 'PARENT' && (
                            <form onSubmit={handleParentLogin} className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">اختر اسم المحفظ</label>
                                    <select 
                                        className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                                        value={parentSelectedTeacherId}
                                        onChange={(e) => setParentSelectedTeacherId(e.target.value)}
                                        required
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
                                {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                                <Button type="submit" className="w-full text-lg">دخول ولي الأمر</Button>
                            </form>
                        )}

                        {activeLoginTab === 'TEACHER' && (
                            <form onSubmit={handleTeacherLogin} className="space-y-4 animate-fade-in">
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
                                {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                                <Button variant="secondary" type="submit" className="w-full" disabled={!selectedTeacherId}>
                                    دخول المعلم
                                </Button>
                            </form>
                        )}

                        {activeLoginTab === 'ADMIN' && (
                            <form onSubmit={handleAdminLogin} className="space-y-4 animate-fade-in border-t pt-4 mt-4">
                                <h3 className="text-center font-bold text-gray-700">دخول المبرمج</h3>
                                <input 
                                    type="password"
                                    placeholder="كلمة المرور"
                                    className="w-full p-2 border rounded text-center"
                                    value={adminPasswordInput}
                                    onChange={e => setAdminPasswordInput(e.target.value)}
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

                {!showPhoneSetup && activeLoginTab !== 'ADMIN' && (
                    <div className="mt-8 text-center">
                        <button onClick={() => setActiveLoginTab('ADMIN')} className="text-xs text-gray-400 hover:text-gray-600">
                            دخول المسؤول (المبرمج)
                        </button>
                    </div>
                )}
            </div>
            </div>
        )}
      </>
  );
};

export default App;
