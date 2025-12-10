


import React, { useState, useEffect } from 'react';
import { Student, AppState, UserRole, Teacher, DailyLog, Announcement, QuizItem, AdabSession } from './types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';

// Logo Component with Dynamic Title
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

const normalizeArabicNumbers = (str: string) => {
  return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
};

const App: React.FC = () => {
  // --- DATA LOADING & STATE ---
  // RESET TO CLASSIC VERSION v100
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('muhaffiz_students_v100');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
      const saved = localStorage.getItem('muhaffiz_teachers_v100');
      return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
      const saved = localStorage.getItem('muhaffiz_announcements_v100');
      return saved ? JSON.parse(saved) : [];
  });
  
  // New Adab Archive State
  const [adabArchive, setAdabArchive] = useState<AdabSession[]>(() => {
      const saved = localStorage.getItem('muhaffiz_adab_archive');
      return saved ? JSON.parse(saved) : [];
  });

  const [organizationName, setOrganizationName] = useState(() => {
      return localStorage.getItem('muhaffiz_org_name') || "دار التوحيد";
  });

  useEffect(() => {
      localStorage.setItem('muhaffiz_org_name', organizationName);
      document.title = `${organizationName} - متابعة القرآن الكريم`;
  }, [organizationName]);

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
      const handleOnline = () => { setIsOnline(true); showNotification('تم استعادة الاتصال بالإنترنت', 'success'); };
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline);
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
    if (outcome === 'accepted') { setDeferredPrompt(null); }
  };

  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion && storedVersion !== APP_VERSION) { setUpdateAvailable(true); }
    localStorage.setItem('app_version', APP_VERSION);
  }, []);

  useEffect(() => { localStorage.setItem('muhaffiz_students_v100', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('muhaffiz_teachers_v100', JSON.stringify(teachers)); }, [teachers]);
  useEffect(() => { localStorage.setItem('muhaffiz_announcements_v100', JSON.stringify(announcements)); }, [announcements]);
  useEffect(() => { localStorage.setItem('muhaffiz_adab_archive', JSON.stringify(adabArchive)); }, [adabArchive]);

  const [appState, setAppState] = useState<AppState>({ students: students, teachers: teachers, announcements: announcements, adabArchive: adabArchive, currentUser: { role: 'GUEST' } });

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
  
  const handleParentLogin = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!parentSelectedTeacher) { setLoginError('يرجى اختيار المعلم أولاً'); return; } 
      
      const cleanCode = normalizeArabicNumbers(parentCodeInput.trim());
      
      // Strict check: Teacher + Code must match
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
  
  const handleCompleteParentProfile = (e: React.FormEvent) => { 
      e.preventDefault(); 
      const cleanPhone = normalizeArabicNumbers(parentPhoneInput.trim());
      if (!cleanPhone || cleanPhone.length < 10) { setLoginError('يرجى كتابة رقم هاتف صحيح'); return; } 
      
      if (pendingStudentId) { 
          const student = students.find(s => s.id === pendingStudentId); 
          if (student) { 
              const newStudents = students.map(s => s.id === student.id ? { ...s, parentPhone: cleanPhone } : s); 
              setStudents(newStudents); 
              setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: student.id, name: student.name } })); 
              setShowPhoneSetup(false); 
              setPendingStudentId(null); 
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

  // --- DATA OPERATIONS ---
  const updateStudent = (updatedStudent: Student) => { const newStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s); setStudents(newStudents); };
  const deleteStudents = (studentIds: string[]) => { setStudents(prevStudents => { const remaining = prevStudents.filter(s => !studentIds.includes(s.id)); return [...remaining]; }); showNotification('تم حذف الطالب بنجاح'); };
  
  const markRemainingStudentsAbsent = () => { 
    const teacherId = appState.currentUser.id || 'unknown'; 
    const teacherName = appState.currentUser.name || 'المعلم'; 
    const todayString = new Date().toDateString(); 
    let count = 0; 
    const studentsToMarkIds: string[] = []; 
    
    // Check logs properly
    students.forEach(student => { 
        if (student.teacherId !== teacherId) return; 
        const hasLogToday = student.logs.some(log => new Date(log.date).toDateString() === todayString); 
        if (!hasLogToday) { 
            studentsToMarkIds.push(student.id); 
        } 
    }); 
    
    if (studentsToMarkIds.length === 0) { 
        showNotification("تم تسجيل جميع الطلاب لهذا اليوم بالفعل.", 'success'); 
        return; 
    } 
    
    if (!window.confirm(`سيتم تسجيل الغياب لـ ${studentsToMarkIds.length} طالب لم يسجلوا اليوم. هل أنت متأكد؟`)) { 
        return; 
    } 
    
    setStudents(prevStudents => { 
        return prevStudents.map(student => { 
            if (studentsToMarkIds.includes(student.id)) { 
                count++; 
                const absentLog: DailyLog = { 
                    id: 'absent_' + Date.now() + Math.random(), 
                    date: new Date().toISOString(), 
                    teacherId, 
                    teacherName, 
                    seenByParent: false, 
                    isAbsent: true, 
                    notes: 'تم تسجيل الغياب تلقائياً لعدم الحضور.' 
                }; 
                return { ...student, logs: [absentLog, ...student.logs] }; 
            } 
            return student; 
        }); 
    }); 
    showNotification(`تم تسجيل الغياب لـ ${studentsToMarkIds.length} طالب بنجاح`, 'success'); 
  };

  const addStudent = (name: string, code: string) => { const newStudent: Student = { id: 's_' + Date.now() + Math.random(), teacherId: appState.currentUser.id || 't1', name: name, parentCode: code, weeklySchedule: DAYS_OF_WEEK.map(d => ({ day: d, events: [] })), payments: [], logs: [] }; setStudents([newStudent, ...students]); return newStudent; };
  const addTeacher = (name: string, loginCode: string) => { const newTeacher: Teacher = { id: 't_' + Date.now(), name, loginCode }; setTeachers(prev => [...prev, newTeacher]); showNotification('تم إضافة المحفظ بنجاح'); };
  const updateTeacher = (id: string, name: string, loginCode: string) => { setTeachers(prev => prev.map(t => t.id === id ? { ...t, name, loginCode } : t )); showNotification('تم تعديل بيانات المحفظ بنجاح'); };
  const deleteTeacher = (id: string) => { setTeachers(prevTeachers => { const remaining = prevTeachers.filter(t => t.id !== id); return [...remaining]; }); showNotification('تم حذف المحفظ بنجاح'); };
  const markLogsAsSeen = (studentId: string, logIds: string[]) => { const studentIndex = students.findIndex(s => s.id === studentId); if (studentIndex === -1) return; const student = students[studentIndex]; const studentLogs = student.logs.map(log => { if (logIds.includes(log.id)) { return { ...log, seenByParent: true, seenAt: new Date().toISOString() }; } return log; }); const updatedStudent = { ...student, logs: studentLogs }; updateStudent(updatedStudent); showNotification('تم تأكيد الاطلاع', 'success'); };
  const addAnnouncement = (ann: Announcement) => { setAnnouncements(prev => [ann, ...prev]); };
  const deleteAnnouncement = (id: string) => { setAnnouncements(prev => prev.filter(a => a.id !== id)); showNotification('تم حذف الإعلان'); };

  const handlePublishAdab = (title: string, quizzes: QuizItem[]) => {
      const teacherId = appState.currentUser.id;
      const teacherName = appState.currentUser.name || 'المعلم';
      if (!teacherId) return;

      const todayIso = new Date().toISOString();
      const todayDateStr = new Date().toDateString();
      const newSessionId = 'adab_sess_' + Date.now();

      // 1. Create General Announcement
      const newAnnouncement: Announcement = {
          id: 'ann_' + Date.now(),
          teacherId,
          teacherName,
          content: `***${title}\nيرجى من ولي الأمر مشاركة الطالب في حل أسئلة يوم الآداب الآن!`,
          date: todayIso,
          type: 'GENERAL'
      };
      addAnnouncement(newAnnouncement);
      
      // 2. New: Add to Archive
      const newAdabSession: AdabSession = {
          id: newSessionId,
          title,
          quizzes,
          date: todayIso
      };
      setAdabArchive(prev => [newAdabSession, ...prev]);

      // 3. Update Students Logs
      setStudents(prevStudents => prevStudents.map(s => {
          if (s.teacherId === teacherId) {
              const existingLogIndex = s.logs.findIndex(l => new Date(l.date).toDateString() === todayDateStr);
              
              // New Adab Session Data with ID
              const adabSessionData: AdabSession = {
                  id: newSessionId,
                  title: title,
                  quizzes: quizzes,
                  date: todayIso
              };

              // If log exists for today, UPDATE it to include Adab
              if (existingLogIndex >= 0) {
                  const updatedLogs = [...s.logs];
                  updatedLogs[existingLogIndex] = {
                      ...updatedLogs[existingLogIndex],
                      isAdab: true,
                      adabSession: adabSessionData,
                  };
                  return { ...s, logs: updatedLogs };
              } else {
                  // Create NEW log
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
                  return { ...s, logs: [newLog, ...s.logs] };
              }
          }
          return s;
      }));
  };

  const handleEditAdab = (sessionId: string, title: string, quizzes: QuizItem[]) => {
      // 1. Update Archive
      setAdabArchive(prev => prev.map(s => s.id === sessionId ? { ...s, title, quizzes } : s));

      // 2. Update Student Logs and Reset Parent Interaction
      setStudents(prevStudents => prevStudents.map(student => {
          const hasThisAdab = student.logs.some(l => l.adabSession?.id === sessionId);
          if (hasThisAdab) {
              const newLogs = student.logs.map(log => {
                  if (log.adabSession?.id === sessionId) {
                      return {
                          ...log,
                          adabSession: { ...log.adabSession, title, quizzes },
                          // RESET PARENT INTERACTION
                          seenByParent: false,
                          parentQuizScore: undefined,
                          parentQuizMax: undefined
                      };
                  }
                  return log;
              });
              return { ...student, logs: newLogs };
          }
          return student;
      }));
  };

  const handleDeleteAdab = (sessionId: string) => {
      // 1. Remove from Archive
      setAdabArchive(prev => prev.filter(s => s.id !== sessionId));

      // 2. Remove from Student Logs
      setStudents(prevStudents => prevStudents.map(student => {
          // Filter out logs that are ONLY Adab for this session, or remove Adab property if mixed
          const newLogs = student.logs.map(log => {
              if (log.adabSession?.id === sessionId) {
                  if (log.isAbsent === false && !log.jadeed && !log.attendance) {
                      // Pure Adab log -> Remove it entirely (mark for filtering)
                      return null;
                  } else {
                      // Mixed log -> Remove Adab properties
                      const { adabSession, parentQuizScore, parentQuizMax, ...rest } = log;
                      return { ...rest, isAdab: false };
                  }
              }
              return log;
          }).filter(l => l !== null) as DailyLog[];
          
          return { ...student, logs: newLogs };
      }));
      showNotification('تم حذف درس الآداب بنجاح', 'success');
  };

  const handleQuickAnnouncement = (type: 'ADAB' | 'HOLIDAY', payload?: any) => {
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
      
      addAnnouncement(newAnnouncement);
      
      if (type === 'ADAB') {
          // Legacy support if needed, but onPublishAdab handles the new quiz flow
      } else {
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
                adabArchive={adabArchive.filter(s => {
                    // Filter archive based on logs: Only show adab sessions that appear in this teacher's students logs
                    // OR just show all if we assume one teacher per device context mostly.
                    // Better: Filter if the session was created by this teacher logic (but we don't store creatorId in AdabSession yet)
                    // For now, simple return all is fine or check date.
                    return true;
                })}
                onUpdateStudent={updateStudent}
                onAddStudent={addStudent}
                onDeleteStudents={deleteStudents}
                onMarkAbsences={markRemainingStudentsAbsent}
                onAddAnnouncement={addAnnouncement}
                onDeleteAnnouncement={deleteAnnouncement}
                onLogout={handleLogout}
                onShowNotification={showNotification}
                onPublishAdab={handlePublishAdab}
                onEditAdab={handleEditAdab}
                onDeleteAdab={handleDeleteAdab}
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
                <p>يعمل التطبيق بدون إنترنت. يتم حفظ البيانات على الهاتف.</p>
            </div>
            </div>
        )}
      </>
  );
};

export default App;