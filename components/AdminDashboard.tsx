
import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { Button } from './Button';

interface AdminDashboardProps {
  teachers: Teacher[];
  onAddTeacher: (name: string, loginCode: string) => void;
  onUpdateTeacher: (id: string, name: string, loginCode: string) => void;
  onDeleteTeacher: (id: string) => void;
  onLogout: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  // New props for organization settings
  organizationName: string;
  onUpdateOrganizationName: (name: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    teachers, 
    onAddTeacher, 
    onUpdateTeacher, 
    onDeleteTeacher, 
    onLogout, 
    onShowNotification,
    organizationName,
    onUpdateOrganizationName
}) => {
  const [name, setName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal State for Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDeleteId, setTeacherToDeleteId] = useState('');

  // Local state for editing org name and password
  const [tempOrgName, setTempOrgName] = useState(organizationName);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && loginCode) {
        if (editingId) {
            onUpdateTeacher(editingId, name, loginCode);
            setEditingId(null);
        } else {
            onAddTeacher(name, loginCode);
        }
        setName('');
        setLoginCode('');
    }
  };

  const handleOrgNameSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(tempOrgName.trim()) {
          onUpdateOrganizationName(tempOrgName);
          onShowNotification('تم تحديث اسم المؤسسة بنجاح', 'success');
      }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (newAdminPassword.length < 4) {
          onShowNotification('كلمة المرور قصيرة جداً', 'error');
          return;
      }
      localStorage.setItem('admin_password', newAdminPassword);
      onShowNotification('تم تحديث كلمة مرور المسؤول بنجاح', 'success');
      setNewAdminPassword('');
  };

  const startEdit = (t: Teacher) => {
      setEditingId(t.id);
      setName(t.name);
      setLoginCode(t.loginCode);
      // Scroll to teacher form
      const el = document.getElementById('teacher-form');
      if(el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingId(null);
      setName('');
      setLoginCode('');
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherToDeleteId) {
        onDeleteTeacher(teacherToDeleteId);
        setShowDeleteModal(false);
        setTeacherToDeleteId('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 text-white">
            <h1 className="text-2xl font-bold">لوحة تحكم المبرمج (المسؤول)</h1>
            <Button variant="danger" onClick={onLogout}>خروج</Button>
        </div>

        {/* Global Settings Section */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6 relative border-l-4 border-purple-500 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🏠 إعدادات التطبيق العامة</h2>
            
            {/* Org Name */}
            <form onSubmit={handleOrgNameSubmit} className="flex gap-4 items-end border-b pb-6">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الدار / المؤسسة (يظهر في شاشة الدخول)</label>
                    <input 
                        type="text" 
                        value={tempOrgName} 
                        onChange={e => setTempOrgName(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
                        placeholder="مثال: دار النور لتحفيظ القرآن"
                    />
                </div>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 h-10">حفظ الاسم</Button>
            </form>

            {/* Admin Password */}
            <form onSubmit={handlePasswordChange} className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">تغيير كلمة مرور المسؤول</label>
                    <input 
                        type="password" 
                        value={newAdminPassword} 
                        onChange={e => setNewAdminPassword(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
                        placeholder="أدخل كلمة المرور الجديدة"
                    />
                </div>
                <Button type="submit" variant="secondary" className="h-10">تحديث كلمة المرور</Button>
            </form>
        </div>

        {/* Delete Modal for Teachers */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-fade-in">
                  <h2 className="text-xl font-bold mb-4 text-red-600">حذف محفظ</h2>
                  <p className="mb-4 text-gray-600 text-sm">اختر اسم المحفظ الذي تريد حذفه. سيتم إزالة المحفظ ومجموعته من القائمة.</p>
                  <form onSubmit={handleDeleteSubmit}>
                      <label className="block mb-2 text-sm font-bold">اختر الاسم</label>
                      <select 
                        className="w-full p-3 border rounded mb-6 bg-gray-50"
                        value={teacherToDeleteId}
                        onChange={e => setTeacherToDeleteId(e.target.value)}
                        required
                      >
                          <option value="">-- اختر المحفظ --</option>
                          {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                      </select>
                      
                      <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
                          <Button type="submit" variant="danger" disabled={!teacherToDeleteId}>تأكيد الحذف</Button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        <div id="teacher-form" className="bg-white rounded-xl p-6 shadow-lg mb-6 relative">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">{editingId ? 'تعديل بيانات محفظ' : 'إضافة محفظ جديد'}</h2>
                <Button variant="danger" type="button" onClick={() => setShowDeleteModal(true)}>حذف محفظ</Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">اسم المحفظ</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="الشيخ ...."
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">رقم الدخول الخاص (Access Code)</label>
                    <input 
                        type="text" 
                        value={loginCode} 
                        onChange={e => setLoginCode(e.target.value)}
                        className="w-full p-2 border rounded font-mono"
                        placeholder="أدخل رقماً مميزاً"
                        required
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="submit">{editingId ? 'حفظ التعديلات' : 'إضافة للقائمة'}</Button>
                    {editingId && <Button type="button" variant="outline" onClick={cancelEdit}>إلغاء</Button>}
                </div>
            </form>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">قائمة المحفظين الحاليين</h2>
            <div className="space-y-2">
                {teachers.length === 0 ? (
                    <p className="text-gray-500 text-center">لا يوجد محفظين.</p>
                ) : (
                    teachers.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                            <div>
                                <p className="font-bold text-gray-800">{t.name}</p>
                                <p className="text-sm text-gray-500 font-mono">كود الدخول: {t.loginCode}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                    onClick={(e) => { e.preventDefault(); startEdit(t); }}
                                >
                                    تعديل
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
