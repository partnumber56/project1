import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collectionGroup, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { 
  Search, 
  Filter, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderItem, ItemStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';

// We need to fetch the parent order info for each item to show context
interface OrderItemWithContext extends OrderItem {
  parentOrderId: string;
  customerName?: string;
  orderDate?: any;
}

export default function OrderManagementView() {
  const [items, setItems] = useState<OrderItemWithContext[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // collectionGroup('items') will get all items from all orders and requests
    // But we probably only want items from 'orders'
    // Actually requests items also have statuses, but user said "order management where there will be positions of all orders"
    const q = query(collectionGroup(db, 'items'), orderBy('productName', 'asc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const itemsData: OrderItemWithContext[] = [];
      
      for (const itemDoc of snapshot.docs) {
        // Only include items from 'orders' collection
        if (itemDoc.ref.parent.parent?.parent?.path === 'orders' || itemDoc.ref.parent.parent?.path === 'orders') {
           const data = itemDoc.data() as OrderItem;
           const parentOrderId = itemDoc.ref.parent.parent?.id || '';
           
           itemsData.push({
             ...data,
             id: itemDoc.id,
             parentOrderId
           });
        }
      }
      
      setItems(itemsData);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateItemStatus = async (item: OrderItemWithContext, newStatus: ItemStatus) => {
    try {
      const itemRef = doc(db, `orders/${item.parentOrderId}/items/${item.id}`);
      await updateDoc(itemRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Also update parent order updatedAt
      await updateDoc(doc(db, 'orders', item.parentOrderId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `orders/${item.parentOrderId}/items/${item.id}`);
    }
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         i.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         i.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || i.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusClass = (status: ItemStatus) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Ordered': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'Available': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Picked': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'Packed': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Issued': return 'bg-slate-900 text-white border-slate-900';
      case 'Out of Stock': return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Артикул, назва, бренд..." 
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
              onChange={(e) => setFilterStatus(e.target.value as ItemStatus | 'All')}
            >
              <option value="All">Всі статуси</option>
              <option value="Pending">Очікує</option>
              <option value="Ordered">Замовлено</option>
              <option value="Available">В наявності</option>
              <option value="Picked">Зібрано</option>
              <option value="Packed">Запаковано</option>
              <option value="Issued">Видано</option>
              <option value="Out of Stock">Немає</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Артикул / Бренд</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Назва</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">К-ть</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Постачальник</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Статус</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Замовлення</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-mono font-bold text-slate-700 uppercase tracking-wider">{item.partNumber}</p>
                    <p className="text-[10px] font-black text-blue-500 uppercase mt-0.5">{item.brand || 'No Brand'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{item.productName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-8 inline-block text-center">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 italic">
                      <Building2 className="w-3 h-3 text-slate-300" />
                      {item.supplier || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={item.status}
                      onChange={(e) => updateItemStatus(item, e.target.value as ItemStatus)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none transition-all cursor-pointer",
                        getStatusClass(item.status)
                      )}
                    >
                      <option value="Pending">Очікує</option>
                      <option value="Ordered">Замовлено</option>
                      <option value="Available">В наявності</option>
                      <option value="Picked">Зібрано</option>
                      <option value="Packed">Запаковано</option>
                      <option value="Issued">Видано</option>
                      <option value="Out of Stock">Немає</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-mono text-slate-400">ID: {item.parentOrderId.slice(0, 8)}</span>
                      <a href={`#orders`} className="text-[10px] font-bold text-blue-500 hover:underline">Перейти</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredItems.length === 0 && !isLoading && (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <Layers className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium">Жодної позиції не знайдено</p>
            </div>
          )}
          
          {isLoading && (
            <div className="py-24 flex justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
