/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, ReactNode } from 'react';
import { auth, loginWithGoogle, logout, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where,
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Bell, 
  LogOut, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Menu,
  X,
  User as UserIcon,
  ChevronRight,
  TrendingDown,
  Wallet,
  FileText,
  Users,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';
import { Order, Product, Notification, OrderStatus, Role } from './types';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import OrdersView from './components/OrdersView';
import ReportsView from './components/ReportsView';
import RequestsView from './components/RequestsView';
import OrderManagementView from './components/OrderManagementView';
import FinanceView from './components/FinanceView';
import UserManagementView from './components/UserManagementView';

type View = 'dashboard' | 'inventory' | 'orders' | 'reports' | 'requests' | 'items' | 'finance' | 'users';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setCheckingRole(true);
        const lowercaseEmail = (u.email || '').toLowerCase();
        
        // 1. Check if primary admin
        if (lowercaseEmail === 'partnumber56@gmail.com') {
          setUserRole('admin');
          setCheckingRole(false);
          setLoading(false);
          try {
            const userRef = doc(db, 'users', lowercaseEmail);
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
              await setDoc(userRef, {
                name: u.displayName || 'Primary Admin',
                email: lowercaseEmail,
                role: 'admin',
                createdAt: serverTimestamp()
              });
            }
          } catch (e) {
            console.error('Failed to create admin doc:', e);
          }
        } else {
          // 2. Check users collection
          try {
            const userRef = doc(db, 'users', lowercaseEmail);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserRole(data.role as Role);
            } else {
              setUserRole(null); // No access
            }
          } catch (e) {
            console.error('Error fetching user role:', e);
            setUserRole(null);
          } finally {
            setCheckingRole(false);
            setLoading(false);
          }
        }
      } else {
        setUserRole(null);
        setCheckingRole(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (userRole === 'manager' && (activeView === 'finance' || activeView === 'reports' || activeView === 'users')) {
      setActiveView('dashboard');
    }
  }, [userRole, activeView]);

  if (loading || (user && checkingRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (user && !userRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-100"
        >
          <div className="bg-rose-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-rose-600">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2 font-sans">Доступ обмежено</h1>
          <p className="text-slate-600 text-sm mb-6 font-medium">
            Ваша електронна пошта <span className="font-bold text-slate-900">{user.email}</span> не має доступу до цієї системи.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-8 text-left text-xs text-slate-500 font-medium">
            Зверніться до адміністратора для реєстрації вашого акаунту та надання ролі (Адміністратор чи Менеджер).
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg text-sm uppercase tracking-wider"
          >
            <LogOut className="w-5 h-5" />
            Вийти з акаунту
          </button>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="bg-blue-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-sans">OrderFlow Pro</h1>
          <p className="text-slate-500 mb-8 font-sans">Система управління замовленнями та складом нового покоління</p>
          
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Увійти з Google
          </button>
          
          <p className="mt-6 text-xs text-slate-400">
            Для доступу до системи замовлень потрібна авторизація
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-slate-900 text-white flex flex-col fixed h-full z-30 transition-all"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap border-b border-slate-800">
          <div className="p-2 bg-blue-600 rounded-lg shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight">OrderFlow</span>}
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          <NavItem 
            icon={<TrendingUp />} 
            label="Дашборд" 
            isActive={activeView === 'dashboard'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('dashboard')} 
          />
          <NavItem 
            icon={<FileText />}
            label="Запити" 
            isActive={activeView === 'requests'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('requests')} 
          />
          <NavItem 
            icon={<ShoppingCart />} 
            label="Замовлення" 
            isActive={activeView === 'orders'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('orders')} 
          />
          <NavItem 
            icon={<Package />} // or List
            label="Управління позиціями" 
            isActive={activeView === 'items'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('items')} 
          />
          {userRole === 'admin' && (
            <NavItem 
              icon={<Wallet />} // replaced TrendingDown for consistency or add it
              label="Фінанси" 
              isActive={activeView === 'finance'} 
              expanded={isSidebarOpen} 
              onClick={() => setActiveView('finance')} 
            />
          )}
          <NavItem 
            icon={<Package />} 
            label="Склад" 
            isActive={activeView === 'inventory'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('inventory')} 
          />
          {userRole === 'admin' && (
            <NavItem 
              icon={<TrendingDown />} 
              label="Звіти" 
              isActive={activeView === 'reports'} 
              expanded={isSidebarOpen} 
              onClick={() => setActiveView('reports')} 
            />
          )}
          {userRole === 'admin' && (
            <NavItem 
              icon={<Users />} 
              label="Користувачі" 
              isActive={activeView === 'users'} 
              expanded={isSidebarOpen} 
              onClick={() => setActiveView('users')} 
            />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isSidebarOpen ? <Menu className="w-5 h-5 rotate-180" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen ? "ml-[280px]" : "ml-[80px]"
      )}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-800 capitalize">
              {activeView === 'dashboard' ? 'Загальний огляд' : 
               activeView === 'requests' ? 'Робота із запитами' :
               activeView === 'orders' ? 'Управління замовленнями' : 
               activeView === 'items' ? 'Всі позиції замовлень' :
               activeView === 'finance' ? 'Фінансово-клієнтський облік' :
               activeView === 'inventory' ? 'Товарні запаси' : 
               activeView === 'users' ? 'Керування доступом' : 'Звітність'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 bg-slate-50">Сповіщення</div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors text-sm">
                            <p className="text-slate-800">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 uppercase">щойно</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-400 italic text-sm">Сповіщень немає</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 mb-0">{user.displayName || 'Користувач'}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  {userRole === 'admin' ? 'Адмін-панель' : 'Панель менеджера'}
                </p>
              </div>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-blue-500/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <button 
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Вийти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'requests' && <RequestsView />}
              {activeView === 'inventory' && <InventoryView />}
              {activeView === 'orders' && <OrdersView />}
              {activeView === 'items' && <OrderManagementView />}
              {activeView === 'finance' && userRole === 'admin' && <FinanceView />}
              {activeView === 'reports' && userRole === 'admin' && <ReportsView />}
              {activeView === 'users' && userRole === 'admin' && <UserManagementView currentUserEmail={user.email || ''} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  expanded: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, isActive, expanded, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all relative group",
        isActive 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <span className={cn("shrink-0", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")}>
        {icon}
      </span>
      {expanded && <span className="font-medium">{label}</span>}
      {!expanded && isActive && (
        <span className="absolute -left-1 w-1 h-6 bg-blue-500 rounded-full" />
      )}
    </button>
  );
}
