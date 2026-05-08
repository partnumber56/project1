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

interface EditableInputProps {
  value: string | number;
  onSave: (val: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
}

function EditableInput({ value, onSave, type = 'text', placeholder, className }: EditableInputProps) {
  const [localValue, setLocalValue] = useState(String(value === 0 && type === 'number' ? '' : value));
  
  useEffect(() => {
    setLocalValue(String(value === 0 && type === 'number' ? '' : value));
  }, [value, type]);

  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (String(localValue) !== String(value)) {
          onSave(localValue);
        }
      }}
      placeholder={placeholder}
      className={cn(
        "bg-transparent outline-none focus:ring-1 focus:ring-blue-100 px-1 rounded",
        className
      )}
    />
  );
}

export default function OrderManagementView() {
  const [items, setItems] = useState<OrderItemWithContext[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ItemStatus | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collectionGroup(db, 'items'), orderBy('productName', 'asc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const itemsData: OrderItemWithContext[] = [];
      
      const parentOrderCache: Record<string, { customerName: string; createdAt: any }> = {};

      for (const itemDoc of snapshot.docs) {
        if (itemDoc.ref.parent.parent?.parent?.path === 'orders' || itemDoc.ref.parent.parent?.path === 'orders') {
           const data = itemDoc.data() as OrderItem;
           const parentOrderId = itemDoc.ref.parent.parent?.id || '';
           
           if (!parentOrderCache[parentOrderId]) {
             const parentDoc = await getDoc(doc(db, 'orders', parentOrderId));
             if (parentDoc.exists()) {
               parentOrderCache[parentOrderId] = {
                 customerName: parentDoc.data().customerName,
                 createdAt: parentDoc.data().createdAt
               };
             }
           }

           itemsData.push({
             ...data,
             id: itemDoc.id,
             parentOrderId,
             customerName: parentOrderCache[parentOrderId]?.customerName,
             orderDate: parentOrderCache[parentOrderId]?.createdAt
           });
        }
      }
      
      setItems(itemsData);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'items-group');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateItemField = async (item: OrderItemWithContext, field: string, value: any) => {
    const val = field.includes('Price') || field === 'quantity' 
      ? (value === '' ? 0 : Number(String(value).replace(',', '.'))) 
      : value;

    try {
      const itemRef = doc(db, `orders/${item.parentOrderId}/items/${item.id}`);
      await updateDoc(itemRef, { 
        [field]: val,
        updatedAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'orders', item.parentOrderId), {
        updatedAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `orders/${item.parentOrderId}/items/${item.id}`);
    }
  };

  const updateItemStatus = async (item: OrderItemWithContext, newStatus: ItemStatus) => {
    await updateItemField(item, 'status', newStatus);
  };

  const filteredItems = items.filter(i => {
    const productName = (i.productName || '').toLowerCase();
    const partNumber = (i.partNumber || '').toLowerCase();
    const brand = (i.brand || '').toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearch = productName.includes(searchTermLower) || 
                         partNumber.includes(searchTermLower) ||
                         brand.includes(searchTermLower);
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

  const stats = {
    pending: items.filter(i => i.status === 'Pending').length,
    ordered: items.filter(i => i.status === 'Ordered').length,
    available: items.filter(i => i.status === 'Available').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Управління позиціями</h1>
          <p className="text-slate-500 text-sm font-medium">Контроль статусу кожної деталі в замовленнях</p>
        </div>

        <div className="flex gap-2">
          {[
            { label: 'Очікує', count: stats.pending, color: 'bg-amber-500', bg: 'bg-amber-50' },
            { label: 'Замовлено', count: stats.ordered, color: 'bg-purple-500', bg: 'bg-purple-50' },
            { label: 'На складі', count: stats.available, color: 'bg-blue-500', bg: 'bg-blue-50' },
          ].map((stat, idx) => (
            <div key={idx} className={cn("px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3", stat.bg)}>
              <div className={cn("w-2 h-2 rounded-full", stat.color)} />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{stat.label}</p>
                <p className="text-sm font-black text-slate-700 leading-none">{stat.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Дата</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Артикул / Бренд</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Назва</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">К-ть</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Вхід (₴)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Продаж (₴)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Прибуток / ROI</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Срок</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Постачальник</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Статус</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Замовлення</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const roi = item.costPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.costPrice * 100).toFixed(0) : '0';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-slate-400 leading-none">
                        {item.orderDate?.toDate ? item.orderDate.toDate().toLocaleDateString('uk-UA') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <EditableInput 
                        value={item.partNumber} 
                        onSave={(val) => updateItemField(item, 'partNumber', val)}
                        className="text-sm font-mono font-bold text-slate-700 uppercase tracking-wider"
                      />
                      <EditableInput 
                        value={item.brand || ''} 
                        onSave={(val) => updateItemField(item, 'brand', val)}
                        className="text-[10px] font-black text-blue-500 uppercase mt-0.5"
                        placeholder="Бренд"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <EditableInput 
                        value={item.productName} 
                        onSave={(val) => updateItemField(item, 'productName', val)}
                        className="text-sm font-medium text-slate-900"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <EditableInput 
                        type="number"
                        value={item.quantity} 
                        onSave={(val) => updateItemField(item, 'quantity', val)}
                        className="w-12 bg-slate-100 text-sm font-bold text-slate-600 px-2 py-1 rounded text-center"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <EditableInput 
                        type="number"
                        value={item.costPrice} 
                        onSave={(val) => updateItemField(item, 'costPrice', val)}
                        className="w-20 bg-slate-50 border border-transparent rounded-lg px-2 py-1 text-xs"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <EditableInput 
                        type="number"
                        value={item.sellingPrice} 
                        onSave={(val) => updateItemField(item, 'sellingPrice', val)}
                        className="w-20 bg-slate-50 border border-transparent rounded-lg px-2 py-1 text-sm font-black text-slate-900"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-black",
                          Number(roi) > 30 ? "bg-emerald-100 text-emerald-600" : 
                          Number(roi) > 15 ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-50"
                        )}>
                          {roi}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatCurrency(item.sellingPrice - item.costPrice)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <EditableInput 
                        value={item.deliveryTime || ''} 
                        onSave={(val) => updateItemField(item, 'deliveryTime', val)}
                        className="text-xs font-bold text-blue-600"
                        placeholder="н/д"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <EditableInput 
                        value={item.supplier || ''} 
                        onSave={(val) => updateItemField(item, 'supplier', val)}
                        className="text-xs font-bold text-slate-600 italic focus:text-blue-600"
                        placeholder="н/д"
                      />
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
                        <span className="text-[10px] font-black text-slate-900 line-clamp-1">{item.customerName || 'Клієнт'}</span>
                        <span className="text-[9px] font-mono text-slate-400">ID: {item.parentOrderId.slice(0, 8)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
