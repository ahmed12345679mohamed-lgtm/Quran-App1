
import React, { useState, useEffect } from 'react';
import { Student, AppState, UserRole, Teacher, DailyLog, Announcement } from './types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, DAYS_OF_WEEK, APP_VERSION } from './constants';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';

// Logo Component with Dynamic Title
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
  // Simulate Database with Local Storage + Initial Data
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('muhaffiz_students_v6');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
      const saved = localStorage.getItem('muhaffiz_teachers_v2');
      return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
      const saved = localStorage.getItem('muhaffiz_announcements_v1');
      return saved ? JSON.parse(saved) : [];
  });

  // App Configuration State (Organization Name)
  const [organizationName, setOrganizationName] = useState(() => {
      return localStorage.getItem('muhaffiz_org_name') || "دار التوحيد";
  });

  useEffect(() => {
      localStorage.setItem('muhaffiz_org_name', organizationName);
      document.title = `${organizationName} - متابعة القرآن الكريم`;
  }, [organizationName]);

  // Notification State
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  // Online/Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
      const handleOnline = () => {
          setIsOnline(true);
          showNotification('تم استعادة الاتصال بالإنترنت', 'success');
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Version Check
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion && storedVersion !== APP_VERSION) {
        setUpdateAvailable(true);
    }
    localStorage.setItem('app_version', APP_VERSION);
  }, []);

  useEffect(() => {
    localStorage.setItem('muhaffiz_students_v6', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
      localStorage.setItem('muhaffiz_teachers_v2', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
      localStorage.setItem('muhaffiz_announcements_v1', JSON.stringify(announcements));
  }, [announcements]);

  const [appState, setAppState] = useState<AppState>({
    students: students,
    teachers: teachers,
    announcements: announcements,
    currentUser: { role: 'GUEST' }
  });

  // Input State for Login
  const [activeLoginTab, setActiveLoginTab] = useState<'PARENT' | 'TEACHER' | 'ADMIN'>('PARENT');
  
  // Parent Inputs
  const [parentCodeInput, setParentCodeInput] = useState('');
  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [showPhoneSetup, setShowPhoneSetup] = useState(false); // To trigger the one-time setup
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  
  // Teacher Inputs
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherCodeInput, setTeacherCodeInput] = useState('');

  // Admin Inputs
  const [adminPassword, setAdminPassword] = useState('');

  const [loginError, setLoginError] = useState('');

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    
    if (teacher) {
        if (teacher.loginCode === teacherCodeInput) {
            setAppState(prev => ({ 
                ...prev, 
                currentUser: { role: 'TEACHER', id: teacher.id, name: teacher.name } 
            }));
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
    const student = students.find(s => s.parentCode === parentCodeInput);
    
    if (student) {
      // Check if phone is already registered
      if (student.parentPhone) {
          // Login directly
          setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: student.id, name: student.name } }));
          setLoginError('');
      } else {
          // First time login, require phone setup
          setPendingStudentId(student.id);
          setShowPhoneSetup(true);
          setLoginError('');
      }
    } else {
      setLoginError('كود الطالب غير صحيح، حاول مرة أخرى.');
    }
  };

  const handleCompleteParentProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!parentPhoneInput || parentPhoneInput.length < 10) {
          setLoginError('يرجى كتابة رقم هاتف صحيح');
          return;
      }

      if (pendingStudentId) {
          const student = students.find(s => s.id === pendingStudentId);
          if (student) {
              const newStudents = students.map(s => s.id === student.id ? { ...s, parentPhone: parentPhoneInput } : s);
              setStudents(newStudents);
              
              // Login
              setAppState(prev => ({ ...prev, currentUser: { role: 'PARENT', id: student.id, name: student.name } }));
              setShowPhoneSetup(false);
              setPendingStudentId(null);
          }
      }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPassword === '456888') {
          setAppState(prev => ({ ...prev, currentUser: { role: 'ADMIN', name: 'المبرمج' }}));
          setLoginError('');
      } else {
          setLoginError('كلمة المرور غير صحيحة');
      }
  };

  const handleLogout = () => {
    setAppState(prev => ({ ...prev, currentUser: { role: 'GUEST' } }));
    setParentCodeInput('');
    setParentPhoneInput('');
    setLoginError('');
    setSelectedTeacherId('');
    setTeacherCodeInput('');
    setAdminPassword('');
    setShowPhoneSetup(false);
  };

  const updateStudent = (updatedStudent: Student) => {
    const newStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(newStudents);
  };

  const deleteStudents = (studentIds: string[]) => {
      // Create a clean new array without the deleted items
      setStudents(prevStudents => {
          const remaining = prevStudents.filter(s => !studentIds.includes(s.id));
          return [...remaining];
      });
      showNotification('تم حذف الطالب بنجاح');
  };

  const markRemainingStudentsAbsent = () => {
      const teacherId = appState.currentUser.id || 'unknown';
      const teacherName = appState.currentUser.name || 'المعلم';
      const todayString = new Date().toDateString(); // Robust date comparison

      let count = 0;

      // Calculate logic first
      const studentsToMarkIds: string[] = [];
      
      students.forEach(student => {
          if (student.teacherId !== teacherId) return;
          
          const hasLogToday = student.logs.some(log => {
              const logDate = new Date(log.date);
              return logDate.toDateString() === todayString;
          });

          if (!hasLogToday) {
              studentsToMarkIds.push(student.id);
          }
      });

      if (studentsToMarkIds.length === 0) {
          showNotification("تم تسجيل جميع الطلاب لهذا اليوم بالفعل.", 'success');
          return;
      }

      if (!window.confirm(`سيتم تسجيل الغياب لـ ${studentsToMarkIds.length} طالب. هل أنت متأكد؟`)) {
          return;
      }

      // Perform update
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

      // Show success message with notification
      showNotification(`تم تسجيل الغياب لـ ${studentsToMarkIds.length} طالب بنجاح`, 'success');
  };

  const addStudent = (name: string) => {
      let newCode = '';
      let isUnique = false;
      while (!isUnique) {
          newCode = Math.floor(1000 + Math.random() * 9000).toString();
          if (!students.find(s => s.parentCode === newCode)) isUnique = true;
      }

      const newStudent: Student = {
          id: 's_' + Date.now() + Math.random(),
          teacherId: appState.currentUser.id || 't1', 
          name: name,
          parentCode: newCode,
          weeklySchedule: DAYS_OF_WEEK.map(d => ({ day: d, expectedTime: '', isActive: true })),
          payments: [],
          logs: []
      };

      setStudents([newStudent, ...students]);
      return newStudent;
  };

  const addTeacher = (name: string, loginCode: string) => {
      const newTeacher: Teacher = {
          id: 't_' + Date.now(),
          name,
          loginCode
      };
      setTeachers(prev => [...prev, newTeacher]);
      showNotification('تم إضافة المحفظ بنجاح');
  };

  const updateTeacher = (id: string, name: string, loginCode: string) => {
      setTeachers(prev => prev.map(t => 
          t.id === id ? { ...t, name, loginCode } : t
      ));
      showNotification('تم تعديل بيانات المحفظ بنجاح');
  };

  const deleteTeacher = (id: string) => {
      setTeachers(prevTeachers => {
          const remaining = prevTeachers.filter(t => t.id !== id);
          return [...remaining];
      });
      showNotification('تم حذف المحفظ بنجاح');
  };

  const markLogsAsSeen = (studentId: string, logIds: string[]) => {
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) return;

    const student = students[studentIndex];
    const updatedLogs = student.logs.map(log => {
        if (logIds.includes(log.id)) {
            return { ...log, seenByParent: true, seenAt: new Date().toISOString() };
        }
        return log;
    });

    const updatedStudent = { ...student, logs: updatedLogs };
    updateStudent(updatedStudent);
    showNotification('تم تأكيد الاطلاع', 'success');
  };

  const addAnnouncement = (ann: Announcement) => {
      setAnnouncements(prev => [ann, ...prev]);
  };

  const deleteAnnouncement = (id: string) => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showNotification('تم حذف الإعلان');
  };

  return (
      <>
        {/* Offline Status Bar */}
        {!isOnline && (
            <div className="bg-gray-800 text-white text-center text-sm p-1 fixed top-0 left-0 right-0 z-[110]">
                📡 وضع عدم الاتصال: البيانات تحفظ محلياً
            </div>
        )}

        {/* Notification Toast */}
        {notification && (
            <NotificationToast 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotification(null)} 
            />
        )}

        {updateAvailable && (
            <div className="fixed top-8 left-0 right-0 bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-3 text-center z-50 shadow-lg flex justify-between items-center px-4 animate-slide-down">
                <div>
                    <span className="font-bold">تحديث جديد متوفر!</span>
                    <span className="text-sm opacity-90 mr-2">أغلق التطبيق وافتحه مرة أخرى.</span>
                </div>
                <button 
                    onClick={() => setUpdateAvailable(false)} 
                    className="bg-white/20 px-3 py-1 rounded hover:bg-white/30"
                >
                    حسناً
                </button>
            </div>
        )}

        {appState.currentUser.role === 'ADMIN' ? (
            <AdminDashboard 
                teachers={teachers}
                onAddTeacher={addTeacher}
                onUpdateTeacher={updateTeacher}
                onDeleteTeacher={deleteTeacher}
                onLogout={handleLogout}
                onShowNotification={showNotification}
                // Organization Name Props
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
                        {/* Tab Switcher */}
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

                {!showPhoneSetup && activeLoginTab !== 'ADMIN' && (
                    <div className="mt-8 text-center">
                        <button onClick={() => setActiveLoginTab('ADMIN')} className="text-xs text-gray-400 hover:text-gray-600">
                            دخول المسؤول (المبرمج)
                        </button>
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
