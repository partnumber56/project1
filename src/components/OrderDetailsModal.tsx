import { useEffect, useState, ReactNode } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import { 
  X, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  User, 
  Phone,
  Car,
  Fingerprint,
  Calendar,
  Zap,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus, OrderItem, ItemStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!order) return;
    const unsubscribe = onSnapshot(collection(db, `orders/${order.id}/items`), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderItem)));
    });
    return () => unsubscribe();
  }, [order]);

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      alert('Неможливо змінити статус уже завершеного або скасованого замовлення');
      return;
    }
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: ItemStatus) => {
    if (!order) return;
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      alert('Неможливо змінити статус позиції у завершеному або скасованому замовленні');
      return;
    }
    try {
      await updateDoc(doc(db, `orders/${order.id}/items`, itemId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}/items`);
    }
  };

  if (!order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">#{order.id}</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                  order.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                )}>
                  {order.status}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900">Деталі замовлення</h3>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 self-start">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content (Items Table) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-500" />
                      Склад замовлення
                    </h4>
                    <span className="text-xs font-bold text-slate-400 uppercase">{items.length} ПОЗИЦІЙ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Запчастина</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Бренд</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">К-сть</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ціна (П)</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Постачальник</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-800">{item.productName}</p>
                              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{item.partNumber}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded">{item.brand || '-'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-600">x{item.quantity}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-800">{formatCurrency(item.sellingPrice)}</p>
                              <p className="text-[10px] text-slate-300 font-bold">ВХІД: {formatCurrency(item.costPrice)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500 italic">{item.supplier || '-'}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <select 
                                value={item.status}
                                onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)}
                                className={cn(
                                  "text-xs font-bold py-1 px-3 rounded-lg outline-none border transition-all",
                                  item.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                  item.status === 'Ordered' ? "bg-purple-50 text-purple-600 border-purple-200" :
                                  item.status === 'Available' ? "bg-blue-50 text-blue-600 border-blue-200" :
                                  item.status === 'Packed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                  item.status === 'Issued' ? "bg-slate-900 text-white border-slate-900" :
                                  "bg-slate-50 text-slate-600 border-slate-200"
                                )}
                              >
                                <option value="Pending">Очікує</option>
                                <option value="Ordered">Замовлено</option>
                                <option value="Available">В наявності</option>
                                <option value="Out of Stock">Немає</option>
                                <option value="Picked">Зібрано</option>
                                <option value="Packed">Запаковано</option>
                                <option value="Issued">Видано</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                    <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Всього до сплати</span>
                    <span className="text-2xl font-black text-slate-900">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Status Timeline / Transitions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-6">Змінити статус замовлення</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatusButton 
                      status="Pending" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Pending')} 
                      icon={<Clock className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Processing" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Processing')} 
                      icon={<Package className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Shipped" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Shipped')} 
                      icon={<Truck className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Delivered" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Delivered')} 
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Cancelled" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Cancelled')} 
                      icon={<XCircle className="w-4 h-4" />}
                      isDangerous
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-900/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Дані клієнта та авто</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Клієнт</p>
                        <p className="font-bold text-sm">{order.customerName}</p>
                      </div>
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                          <Phone className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Телефон</p>
                          <p className="font-bold text-sm">{order.customerPhone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Авто / Рік / Об'єм</p>
                        <p className="font-bold text-sm">{order.carModel || '-'} / {order.carYear || '-'} / {order.engineVolume || '-'}</p>
                      </div>
                    </div>
                    {order.vin && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                          <Fingerprint className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">VIN-код</p>
                          <p className="font-bold text-sm font-mono tracking-wider">{order.vin}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-600/5 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <CheckCircle2 className="w-5 h-5" />
                    Маржинальність
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                      <span>Прибуток (EST)</span>
                      <span>{formatCurrency(items.reduce((acc, i) => acc + (i.sellingPrice - i.costPrice) * i.quantity, 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-blue-500 uppercase font-black">
                      <span>Дата створення</span>
                      <span>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('uk-UA') : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function StatusButton({ 
  status, 
  current, 
  onClick, 
  icon, 
  isDangerous = false 
}: { 
  status: OrderStatus; 
  current: OrderStatus; 
  onClick: () => void; 
  icon: ReactNode;
  isDangerous?: boolean;
}) {
  const isActive = current === status;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95",
        isActive 
          ? (isDangerous ? "bg-rose-600 border-rose-600 text-white" : "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20")
          : (isDangerous ? "border-slate-100 text-slate-400 hover:border-rose-100 hover:text-rose-500 hover:bg-rose-50" : "border-slate-100 text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50")
      )}
    >
      {icon}
      <span className="text-[8px] font-black uppercase tracking-tight">{status}</span>
    </button>
  );
}
