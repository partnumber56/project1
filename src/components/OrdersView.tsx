import { useEffect, useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  orderBy, 
  query,
  getDocs,
  collectionGroup,
  runTransaction
} from 'firebase/firestore';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  MoreVertical,
  Eye,
  Filter,
  Package,
  User,
  Calendar,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus, Product, OrderItem } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import CreateOrderModal from './CreateOrderModal';
import OrderDetailsModal from './OrderDetailsModal';

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || o.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Processing': return <Package className="w-4 h-4 text-blue-500" />;
      case 'Shipped': return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'Delivered': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Cancelled': return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Shipped': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Шукати за ім'ям або ID..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="text-sm font-medium outline-none bg-transparent text-slate-600"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'All')}
            >
              <option value="All">Всі статуси</option>
              <option value="Pending">Очікують</option>
              <option value="Processing">В обробці</option>
              <option value="Shipped">Відправлено</option>
              <option value="Delivered">Доставлено</option>
              <option value="Cancelled">Скасовано</option>
            </select>
          </div>
        </div>
        
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
        >
          <Plus className="w-5 h-5" />
          Нове замовлення
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map(order => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group flex flex-col relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold",
                  getStatusClass(order.status)
                )}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </div>
                <span className="text-xs text-slate-400 font-mono">#{order.id.slice(0, 8)}</span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 line-clamp-1">{order.customerName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{order.carModel || 'Авто не вказано'}</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    <Calendar className="w-3 h-3" />
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('uk-UA') : 'Сьогодні'}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Сума до сплати</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(order.totalAmount)}</p>
                </div>
                <button className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">Замовлень за вашим запитом не знайдено</p>
          </div>
        )}
      </div>

      <CreateOrderModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />

      <OrderDetailsModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  );
}
