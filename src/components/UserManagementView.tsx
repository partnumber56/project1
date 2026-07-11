import { useEffect, useState, FormEvent } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Users, Plus, Trash2, Shield, User, Mail, Calendar, Check, Search, ShieldAlert, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Role } from '../types';

interface UserManagementViewProps {
  currentUserEmail: string;
}

export default function UserManagementView({ currentUserEmail }: UserManagementViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('manager');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const fetchedUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserProfile[];
        setUsers(fetchedUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setError('Не вдалося завантажити список користувачів.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim()) {
      setError("Усі поля є обов'язковими.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Simple email regex validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Некоректний формат email.');
      return;
    }

    try {
      const userRef = doc(db, 'users', cleanEmail);
      await setDoc(userRef, {
        name: name.trim(),
        email: cleanEmail,
        role: role,
        createdAt: serverTimestamp(),
      });

      setSuccess(`Користувача ${name} успішно додано!`);
      setName('');
      setEmail('');
      setRole('manager');
      setShowAddModal(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding user:', err);
      setError('Не вдалося додати користувача. Перевірте дозволи.');
    }
  };

  const handleEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    setSuccess('');

    try {
      const userRef = doc(db, 'users', selectedUser.email);
      await setDoc(userRef, {
        ...selectedUser,
        role: role,
      });

      setSuccess(`Роль користувача ${selectedUser.name} оновлено на ${role === 'admin' ? 'Адміністратор' : 'Менеджер'}!`);
      setShowEditModal(false);
      setSelectedUser(null);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Не вдалося оновити роль.');
    }
  };

  const handleDeleteUser = async (userToDelete: UserProfile) => {
    if (userToDelete.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert('Ви не можете видалити власного користувача!');
      return;
    }

    if (userToDelete.email.toLowerCase() === 'partnumber56@gmail.com') {
      alert('Неможливо видалити головного адміністратора системи!');
      return;
    }

    if (!confirm(`Ви впевнені, що хочете видалити доступ для ${userToDelete.name} (${userToDelete.email})?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'users', userToDelete.email));
      setSuccess(`Користувача ${userToDelete.name} успішно видалено.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Не вдалося видалити користувача.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(searchLower) ||
      (u.email || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Bar with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Керування доступом</h3>
            <p className="text-xs text-slate-500 font-medium">Керування користувачами та рівнями їх доступу</p>
          </div>
        </div>

        <button
          onClick={() => {
            setError('');
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          Додати користувача
        </button>
      </div>

      {/* Error & Success Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <ShieldAlert className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Check className="w-5 h-5 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Пошук за ім'ям або поштою..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-sm bg-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full"
            />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Користувач</th>
                  <th className="py-4 px-6">Електронна пошта</th>
                  <th className="py-4 px-6">Рівень доступу</th>
                  <th className="py-4 px-6">Дата створення</th>
                  <th className="py-4 px-6 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {filteredUsers.map((u) => {
                  const isPrimaryAdmin = u.email.toLowerCase() === 'partnumber56@gmail.com';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {u.email}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3" />
                              Адміністратор
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              Менеджер (Обмежений)
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-xs text-slate-400 uppercase">
                        {u.createdAt?.toDate ? (
                          u.createdAt.toDate().toLocaleDateString('uk-UA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        ) : (
                          'н/д'
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              if (isPrimaryAdmin) {
                                alert('Роль головного адміністратора не може бути змінена.');
                                return;
                              }
                              setSelectedUser(u);
                              setRole(u.role);
                              setShowEditModal(true);
                            }}
                            disabled={isPrimaryAdmin}
                            className={`p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ${
                              isPrimaryAdmin ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title="Змінити роль"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.email.toLowerCase() === currentUserEmail.toLowerCase() || isPrimaryAdmin}
                            className={`p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ${
                              u.email.toLowerCase() === currentUserEmail.toLowerCase() || isPrimaryAdmin
                                ? 'opacity-30 cursor-not-allowed'
                                : ''
                            }`}
                            title="Видалити користувача"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 italic text-sm">
            Користувачів не знайдено
          </div>
        )}
      </div>

      {/* Info Notice card */}
      <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3 text-sm text-blue-800">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-1">Рівні доступу та обмеження:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-blue-700 font-medium">
            <li><strong>Адміністратор</strong> має повний доступ до всіх розділів системи, включаючи звіти, фінанси, та керування доступом.</li>
            <li><strong>Менеджер (Обмежений доступ)</strong> може створювати та обробляти запити, замовлення, керувати товарами та складом, але <strong>не має доступу</strong> до розділів "Фінанси", "Звіти" та "Керування доступом".</li>
          </ul>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Додати нового користувача</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">ПІБ користувача</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Олександр Коваленко"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Електронна пошта (Google Email)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="user@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold ml-1">Користувач зможе увійти за допомогою Google Sign-In, використовуючи цей email.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Рівень доступу (Роль)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        role === 'manager'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="manager"
                        checked={role === 'manager'}
                        onChange={() => setRole('manager')}
                        className="hidden"
                      />
                      <User className={`w-4 h-4 ${role === 'manager' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Менеджер</p>
                        <p className="text-[9px] text-slate-400 font-bold">Обмежений доступ</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        role === 'admin'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="hidden"
                      />
                      <Shield className={`w-4 h-4 ${role === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Адмін</p>
                        <p className="text-[9px] text-slate-400 font-bold">Повний доступ</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md shadow-indigo-600/10"
                  >
                    Зберегти
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Role Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Змінити роль користувача</h3>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditUser} className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Користувач</p>
                  <p className="text-sm font-bold text-slate-800">{selectedUser.name}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">{selectedUser.email}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Новий рівень доступу</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        role === 'manager'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editRole"
                        value="manager"
                        checked={role === 'manager'}
                        onChange={() => setRole('manager')}
                        className="hidden"
                      />
                      <User className={`w-4 h-4 ${role === 'manager' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Менеджер</p>
                        <p className="text-[9px] text-slate-400 font-bold">Обмежений доступ</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        role === 'admin'
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editRole"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="hidden"
                      />
                      <Shield className={`w-4 h-4 ${role === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Адмін</p>
                        <p className="text-[9px] text-slate-400 font-bold">Повний доступ</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md shadow-indigo-600/10"
                  >
                    Зберегти
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
