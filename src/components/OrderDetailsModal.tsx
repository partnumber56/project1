import React, { useEffect, useState, ReactNode, useRef, MouseEvent } from 'react';
import { db, handleFirestoreError, OperationType, logAdminAction } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  deleteDoc,
  runTransaction,
  getDocs,
  setDoc
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
  ClipboardList,
  Plus,
  Trash2,
  ChevronDown,
  Printer,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus, OrderItem, ItemStatus, Client } from '../types';
import { cn, formatCurrency, parseSafeNumber } from '../lib/utils';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  userRole?: string | null;
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
        "w-full px-3 py-1.5 bg-slate-50 border border-transparent focus:border-blue-500 rounded-lg outline-none",
        className
      )}
    />
  );
}

export default function OrderDetailsModal({ order, onClose, userRole }: OrderDetailsModalProps) {

  const [modalWidth, setModalWidth] = useState(1200);

  const handleResize = (e: any, direction: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = modalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = direction === 'right' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      setModalWidth(Math.max(800, Math.min(window.innerWidth * 0.95, startWidth + delta * 2)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const [items, setItems] = useState<OrderItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  
  const calculatedTotal = items.reduce((acc, i) => acc + (parseSafeNumber(i.sellingPrice) * parseSafeNumber(i.quantity, 1)), 0);
  const calculatedProfit = items.reduce((acc, i) => acc + (parseSafeNumber(i.sellingPrice) - parseSafeNumber(i.costPrice)) * parseSafeNumber(i.quantity, 1), 0);

  const handleCopyToGemini = () => {
    if (!order) return;
    const itemsText = items.map((item, index) => {
      return `${index + 1}. ${item.productName}
   Артикул: ${item.partNumber || 'н/д'}
   Бренд: ${item.brand || 'н/д'}
   Кількість: ${item.quantity} шт.
   Закупівля: ${formatCurrency(item.costPrice)} | Продаж: ${formatCurrency(item.sellingPrice)}
   Постачальник: ${item.supplier || 'н/д'} | Доставка: ${item.deliveryTime || 'н/д'}
   Статус: ${item.status || 'Pending'}`;
    }).join('\n\n');

    const textToCopy = `Замовлення #${order.id}
Статус: ${order.status}
Клієнт: ${order.customerName}
Телефон: ${order.customerPhone || 'н/д'}
Автомобіль: ${order.carModel || 'н/д'} ${order.carYear ? `(${order.carYear})` : ''}
VIN: ${order.vin || 'н/д'}
Двигун: ${order.engineVolume || 'н/д'}

Товари в замовленні:
${itemsText}

Загальна сума: ${formatCurrency(calculatedTotal)}
Очікуваний прибуток: ${formatCurrency(calculatedProfit || 0)}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!order) return;
    const unsubscribe = onSnapshot(collection(db, `orders/${order.id}/items`), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as OrderItem)));
    });
    return () => unsubscribe();
  }, [order]);

  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', order.id);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error('Order not found');
        const currentOrder = orderSnap.data() as Order;

        const updates: any = {
          status: newStatus,
          updatedAt: serverTimestamp()
        };

        // Handle Inventory Deduction
        if (newStatus === 'Delivered' && currentOrder.status !== 'Delivered') {
          for (const item of items) {
            if (item.productId) {
              const productRef = doc(db, 'products', item.productId);
              const productSnap = await transaction.get(productRef);
              if (productSnap.exists()) {
                const currentStock = productSnap.data().stock || 0;
                const newStock = Math.max(0, currentStock - parseSafeNumber(item.quantity, 1));
                transaction.update(productRef, { stock: newStock });
              }
            }
          }
        } else if (currentOrder.status === 'Delivered' && newStatus !== 'Delivered') {
          // Restore inventory stock if order is reverted from Delivered
          for (const item of items) {
            if (item.productId) {
              const productRef = doc(db, 'products', item.productId);
              const productSnap = await transaction.get(productRef);
              if (productSnap.exists()) {
                const currentStock = productSnap.data().stock || 0;
                const newStock = currentStock + parseSafeNumber(item.quantity, 1);
                transaction.update(productRef, { stock: newStock });
              }
            }
          }
        }

        // Handle Financial logic when Delivered
        const safeTotal = parseSafeNumber(calculatedTotal, 0);
        if (newStatus === 'Delivered' && !currentOrder.isFinancialProcessed) {
          if (currentOrder.clientId) {
            const clientRef = doc(db, 'clients', currentOrder.clientId);
            const clientSnap = await transaction.get(clientRef);
            if (clientSnap.exists()) {
              const clientData = clientSnap.data();
              transaction.update(clientRef, {
                balance: (clientData.balance || 0) - safeTotal,
                totalTurnover: (clientData.totalTurnover || 0) + safeTotal
              });

              const txRef = doc(collection(db, `clients/${currentOrder.clientId}/transactions`));
              transaction.set(txRef, {
                clientId: currentOrder.clientId,
                amount: -safeTotal,
                type: 'Order',
                description: `Замовлення #${order.id}`,
                orderId: order.id,
                createdAt: serverTimestamp()
              });
              updates.isFinancialProcessed = true;
            }
          }
        } else if (currentOrder.status === 'Delivered' && newStatus !== 'Delivered' && currentOrder.isFinancialProcessed) {
          // Rollback financial transaction if moving away from Delivered
          if (currentOrder.clientId) {
            const clientRef = doc(db, 'clients', currentOrder.clientId);
            const clientSnap = await transaction.get(clientRef);
            if (clientSnap.exists()) {
              const clientData = clientSnap.data();
              transaction.update(clientRef, {
                balance: (clientData.balance || 0) + safeTotal,
                totalTurnover: Math.max(0, (clientData.totalTurnover || 0) - safeTotal)
              });

              const txRef = doc(collection(db, `clients/${currentOrder.clientId}/transactions`));
              transaction.set(txRef, {
                clientId: currentOrder.clientId,
                amount: safeTotal,
                type: 'Refund',
                description: `Скасування статусу (Повернення) #${order.id}`,
                orderId: order.id,
                createdAt: serverTimestamp()
              });
              updates.isFinancialProcessed = false;
            }
          }
        }

        transaction.update(orderRef, updates);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    } finally {
      logAdminAction('STATUS_UPDATE', `Updated order ${order.id} status to ${newStatus}`, { orderId: order.id, status: newStatus });
      setIsUpdating(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: ItemStatus) => {
    if (!order) return;
    try {
      await updateDoc(doc(db, `orders/${order.id}/items`, itemId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}/items`);
    }
  };

  const updateOrderField = async (field: string, value: any) => {
    if (!order) return;
    const finalValue = field === 'totalAmount' || field === 'totalProfit' 
      ? Number(String(value).replace(',', '.')) 
      : value;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        [field]: finalValue,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleSelectClient = async (client: Client) => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        clientId: client.id,
        customerName: client.name,
        customerPhone: client.phone || order.customerPhone || '',
        updatedAt: serverTimestamp()
      });
      setShowClientSuggestions(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const updateItemField = async (itemId: string, field: string, value: any) => {
    if (!order) return;
    
    const val = field.includes('Price') || field === 'quantity' 
      ? (value === '' ? '' : parseSafeNumber(value)) 
      : value;
    
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem) return;

    try {
      const itemRef = doc(db, `orders/${order.id}/items`, itemId);
      await updateDoc(itemRef, {
        [field]: val,
        updatedAt: serverTimestamp()
      });

      // Recalculate totals using the latest available items state
      const updatedItems = items.map(i => i.id === itemId ? { ...i, [field]: val } : i);
      const totalAmount = updatedItems.reduce((acc, i) => acc + (parseSafeNumber(i.sellingPrice) * parseSafeNumber(i.quantity, 1)), 0);
      const totalProfit = updatedItems.reduce((acc, i) => acc + (parseSafeNumber(i.sellingPrice) - parseSafeNumber(i.costPrice)) * parseSafeNumber(i.quantity, 1), 0);

      await updateDoc(doc(db, 'orders', order.id), {
        totalAmount,
        totalProfit,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        console.warn('Item not found, possibly already deleted:', itemId);
        return;
      }
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}/items/${itemId}`);
    }
  };

  const addNewItem = async () => {
    if (!order) return;
    try {
      const itemRef = doc(collection(db, `orders/${order.id}/items`));
      await runTransaction(db, async (transaction) => {
        transaction.set(itemRef, {
          productName: '',
          partNumber: '',
          brand: '',
          quantity: 1,
          costPrice: '',
          sellingPrice: '',
          supplier: '',
          deliveryTime: '',
          status: 'Pending'
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${order.id}/items`);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!order) return;
    if (!confirm('Видалити цю позицію?')) return;
    try {
      await deleteDoc(doc(db, `orders/${order.id}/items`, itemId));
      
      const updatedItems = items.filter(i => i.id !== itemId);
      const totalAmount = updatedItems.reduce((acc, i) => acc + (parseSafeNumber(i.sellingPrice) * parseSafeNumber(i.quantity, 1)), 0);
      const totalProfit = updatedItems.reduce((acc, i) => acc + (parseSafeNumber(i.sellingPrice) - parseSafeNumber(i.costPrice)) * parseSafeNumber(i.quantity, 1), 0);

      await updateDoc(doc(db, 'orders', order.id), {
        totalAmount,
        totalProfit,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${order.id}/items`);
    }
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDeleteOrder = async () => {
    if (!order || userRole !== 'admin') return;

    try {
      setIsUpdating(true);
      // Delete all items first
      const itemsSnapshot = await getDocs(collection(db, `orders/${order.id}/items`));
      const deleteItemPromises = itemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteItemPromises);
      
      // Delete the order itself
      await deleteDoc(doc(db, 'orders', order.id));
      logAdminAction('DELETE_ORDER', `Deleted order ${order.id}`, { orderId: order.id, customer: order.customerName });
      
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
      setIsUpdating(false);
    }
  };

  const createNewClient = async () => {
    if (!order || !order.customerName) return;
    try {
      const clientRef = doc(collection(db, 'clients'));
      const clientData = {
        name: order.customerName,
        phone: order.customerPhone || '',
        balance: 0,
        totalTurnover: 0,
        createdAt: serverTimestamp()
      };
      await setDoc(clientRef, clientData);
      
      await updateDoc(doc(db, 'orders', order.id), {
        clientId: clientRef.id,
        updatedAt: serverTimestamp()
      });
      
      setShowClientSuggestions(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  if (!order) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:p-0 print:block">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{ maxWidth: `${modalWidth}px` }}
          className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:hidden"
        >
          
            {/* Resize Handles */}
            <div 
              className="absolute top-0 left-0 w-3 h-full cursor-col-resize z-50 hover:bg-blue-500/20 transition-colors"
              onMouseDown={(e) => handleResize(e, 'left')}
            />
            <div 
              className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-50 hover:bg-blue-500/20 transition-colors"
              onMouseDown={(e) => handleResize(e, 'right')}
            />
            {/* Header */}
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
            <div className="flex items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">#{order.id}</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={order.status}
                      disabled={isUpdating}
                      onChange={(e) => updateOrderStatus(e.target.value as OrderStatus)}
                      aria-label="Змінити статус замовлення"
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border outline-none cursor-pointer transition-all shadow-sm",
                        order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' : 
                        order.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' :
                        order.status === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' :
                        order.status === 'Shipped' ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100' :
                        'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                      )}
                    >
                      <option value="Pending">Очікує</option>
                      <option value="Processing">В обробці</option>
                      <option value="Shipped">Відправлено</option>
                      <option value="Delivered">Виконано</option>
                      <option value="Cancelled">Скасовано</option>
                    </select>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900">Деталі замовлення</h3>
              </div>

              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Друк Накладної
              </button>

              <button 
                onClick={handleCopyToGemini}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-indigo-600 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Скопійовано!' : 'Копіювати для Gemini'}
              </button>

              {userRole === 'admin' && (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDeleteOrder}
                      className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      Підтвердити
                    </button>
                    <button 
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                      Скасувати
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-rose-600 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                    title="Видалити замовлення"
                  >
                    <Trash2 className="w-4 h-4" />
                    Видалити
                  </button>
                )
              )}
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 self-start">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content (Items Table) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-blue-500" />
                      Склад замовлення
                    </h4>
                    <button onClick={addNewItem} className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors uppercase">
                      <Plus className="w-3.5 h-3.5" />
                      Додати позицію
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Запчастина</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Артикул / Бренд</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Срок</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Постачальник</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">К-ть</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Вхід (₴)</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Продаж (₴)</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Статус</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-3">
                              <EditableInput 
                                value={item.productName} 
                                onSave={(val) => updateItemField(item.id, 'productName', val)}
                                placeholder="Назва"
                              />
                            </td>
                            <td className="px-3 py-3 space-y-1">
                              <EditableInput 
                                value={item.partNumber} 
                                onSave={(val) => updateItemField(item.id, 'partNumber', val)}
                                className="font-mono uppercase text-[10px]"
                                placeholder="Артикул"
                              />
                              <EditableInput 
                                value={item.brand || ''} 
                                onSave={(val) => updateItemField(item.id, 'brand', val)}
                                className="text-[9px] font-black text-blue-600 uppercase"
                                placeholder="Бренд"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <EditableInput 
                                value={item.deliveryTime || ''} 
                                onSave={(val) => updateItemField(item.id, 'deliveryTime', val)}
                                className="text-xs font-bold text-blue-600"
                                placeholder="н/д"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <EditableInput 
                                value={item.supplier || ''} 
                                onSave={(val) => updateItemField(item.id, 'supplier', val)}
                                className="text-xs italic"
                                placeholder="Постачальник"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <EditableInput 
                                type="number"
                                value={item.quantity} 
                                onSave={(val) => updateItemField(item.id, 'quantity', val)}
                                className="text-sm text-center font-bold"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <EditableInput 
                                type="number"
                                value={item.costPrice} 
                                onSave={(val) => updateItemField(item.id, 'costPrice', val)}
                                className="text-xs"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <EditableInput 
                                type="number"
                                value={item.sellingPrice} 
                                onSave={(val) => updateItemField(item.id, 'sellingPrice', val)}
                                className="text-sm font-black text-slate-900"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <select 
                                value={item.status}
                                onChange={(e) => updateItemStatus(item.id, e.target.value as ItemStatus)}
                                className={cn(
                                  "text-[10px] font-black uppercase tracking-tighter py-1 px-2 rounded-lg outline-none border transition-all",
                                  item.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                  item.status === 'Ordered' ? "bg-purple-50 text-purple-600 border-purple-200" :
                                  item.status === 'In Transit' ? "bg-orange-50 text-orange-600 border-orange-200" :
                                  item.status === 'Available' ? "bg-blue-50 text-blue-600 border-blue-200" :
                                  item.status === 'Confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                  item.status === 'Issued' ? "bg-slate-900 text-white border-slate-900" :
                                  "bg-slate-50 text-slate-600 border-slate-200"
                                )}
                              >
                                <option value="Pending">Очікує</option>
                                <option value="Ordered">Замовлено</option>
                                <option value="In Transit">В дорозі</option>
                                <option value="Available">В наявності</option>
                                <option value="Out of Stock">Немає</option>
                                <option value="Picked">Зібрано</option>
                                <option value="Confirmed">Підтверджено клієнтом</option>
                                <option value="Issued">Видано</option>
                              </select>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                    <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Всього до сплати</span>
                    <span className="text-2xl font-black text-slate-900">{formatCurrency(calculatedTotal)}</span>
                  </div>
                </div>

                {/* Issue Goods Button */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">Видача товару</h4>
                      <p className="text-sm text-slate-500">Списання товару зі складу та фіксація оплати</p>
                    </div>
                    {order.status !== 'Delivered' ? (
                      <button
                        onClick={() => updateOrderStatus('Delivered')}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        <Package className="w-5 h-5" />
                        {isUpdating ? 'Обробка...' : 'Видати товар'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-200">
                        <CheckCircle2 className="w-5 h-5" />
                        Товар видано
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-900/10">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Дані клієнта та авто</h4>
                  <div className="space-y-4">
                    <div className="space-y-1 relative" ref={dropdownRef}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Клієнт</label>
                        {order.clientId ? (
                          <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">Зв'язано</span>
                        ) : (
                          <span className="text-[8px] font-black bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded uppercase tracking-tighter animation-pulse">Не прив'язано</span>
                        )}
                      </div>
                      <input 
                        value={order.customerName}
                        onChange={(e) => {
                          updateOrderField('customerName', e.target.value);
                          setShowClientSuggestions(true);
                        }}
                        onFocus={() => setShowClientSuggestions(true)}
                        className={cn(
                          "w-full px-4 py-2 bg-slate-800 rounded-xl outline-none transition-all text-sm font-bold text-white border-2",
                          order.clientId ? "border-slate-700 focus:border-blue-500" : "border-rose-500/50 focus:border-rose-500"
                        )}
                      />
                      
                      <AnimatePresence>
                        {showClientSuggestions && order.customerName.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
                          >
                            {clients
                              .filter(c => 
                                c.name.toLowerCase().includes(order.customerName.toLowerCase()) ||
                                (c.phone && c.phone.toLowerCase().includes(order.customerName.toLowerCase()))
                              )
                              .map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectClient(client);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-slate-700 flex items-center justify-between group transition-colors"
                                >
                                  <div>
                                    <p className="text-xs font-bold text-white">{client.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{client.phone || 'Немає телефону'}</p>
                                  </div>
                                  <User className="w-4 h-3 text-slate-500 group-hover:text-blue-400" />
                                </button>
                              ))
                            }
                            {clients.filter(c => 
                              c.name.toLowerCase().includes(order.customerName.toLowerCase()) ||
                              (c.phone && c.phone.toLowerCase().includes(order.customerName.toLowerCase()))
                            ).length === 0 && (
                              <button 
                                onClick={createNewClient}
                                className="w-full px-4 py-4 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Створити картку клієнта</span>
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Телефон</label>
                      <input 
                        value={order.customerPhone || ''}
                        onChange={(e) => updateOrderField('customerPhone', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Марка / Модель</label>
                      <input 
                        value={order.carModel || ''}
                        onChange={(e) => updateOrderField('carModel', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">VIN-код</label>
                        <input 
                          value={order.vin || ''}
                          onChange={(e) => updateOrderField('vin', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-[10px] font-mono uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Рік / Об'єм</label>
                        <div className="flex items-center gap-2">
                          <input 
                            value={order.carYear || ''}
                            onChange={(e) => updateOrderField('carYear', e.target.value)}
                            className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-[10px]"
                            placeholder="Рік"
                          />
                          <input 
                            value={order.engineVolume || ''}
                            onChange={(e) => updateOrderField('engineVolume', e.target.value)}
                            className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 text-[10px]"
                            placeholder="Об'єм"
                          />
                        </div>
                      </div>
                    </div>
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
                      <span>{formatCurrency(items.reduce((acc, i) => acc + (Number(String(i.sellingPrice).replace(',', '.')) - Number(String(i.costPrice).replace(',', '.'))) * Number(String(i.quantity).replace(',', '.')), 0))}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-blue-500 uppercase font-black">
                      <span>Дата створення</span>
                      <span>
                        {order.createdAt?.toDate ? (
                          <>
                            {order.createdAt.toDate().toLocaleDateString('uk-UA')} <span className="opacity-70 ml-1">{order.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                          </>
                        ) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hidden Print Content */}
        <div id="print-area" className="hidden print:block p-8 bg-white min-h-screen text-slate-900 font-sans">
          {/* Invoice Header */}
          <div className="mb-6 pb-4 border-b-2 border-slate-900 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-lg tracking-tight uppercase text-slate-900">OrderFlow</span>
                <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded">Автозапчастини</span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                Видаткова накладна № {order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Дата оформлення: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA')}
              </p>
            </div>
            <div className="text-right text-xs space-y-1">
              <p className="font-bold text-slate-900">Постачальник: OrderFlow Склад-Магазин</p>
              <p className="text-slate-500">Система обліку та замовлень</p>
              <div className="inline-block mt-1 px-2.5 py-1 bg-slate-100 rounded text-[11px] font-bold text-slate-800 border border-slate-200">
                Статус: {order.status === 'Delivered' ? 'Виконано' : order.status === 'Processing' ? 'В обробці' : order.status === 'Cancelled' ? 'Скасовано' : order.status === 'Shipped' ? 'Відправлено' : 'Очікує'}
              </div>
            </div>
          </div>

          {/* Client & Vehicle Details */}
          <div className="grid grid-cols-2 gap-4 p-4 mb-6 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Одержувач / Замовник</p>
              <p className="font-bold text-sm text-slate-900">{order.customerName}</p>
              <p className="text-slate-600 mt-0.5 font-medium">Тел: {order.customerPhone || 'Не вказано'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Транспортний засіб</p>
              <p className="font-bold text-slate-900">{order.carModel || 'Автомобіль не вказано'}</p>
              <p className="text-slate-600 font-mono mt-0.5">VIN: {order.vin ? order.vin.toUpperCase() : '—'}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full mb-6 text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-t-2 border-slate-900 bg-slate-100/70">
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-center w-10">№</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600">Артикул / Код</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600">Найменування товару</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600">Бренд</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-center">К-сть</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-right">Ціна (₴)</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-right">Сума (₴)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.length > 0 ? (
                items.map((item, index) => {
                  const qty = Number(String(item.quantity).replace(',', '.')) || 1;
                  const price = Number(String(item.sellingPrice).replace(',', '.')) || 0;
                  const sum = qty * price;
                  return (
                    <tr key={item.id} className="page-break-inside-avoid">
                      <td className="py-2.5 px-2 text-center text-slate-500 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-800">{item.partNumber || '—'}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900">{item.productName || 'Запчастина'}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">{item.brand || '—'}</td>
                      <td className="py-2.5 px-2 text-center font-black text-slate-900">{qty}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-800">{formatCurrency(price)}</td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-900">{formatCurrency(sum)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 px-2 text-center text-slate-500 italic">
                    Позиції відсутні або розраховуються за загальною сумою
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals & Summary */}
          <div className="flex justify-between items-start pt-2 border-t-2 border-slate-900 mb-8">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Всього найменувань: <span className="font-bold text-slate-900">{items.length}</span></p>
              <p>
                Загальна кількість: <span className="font-bold text-slate-900">
                  {items.reduce((acc, i) => acc + (Number(String(i.quantity).replace(',', '.')) || 0), 0)} шт.
                </span>
              </p>
            </div>
            <div className="w-72 bg-slate-900 text-white p-4 rounded-xl shadow-sm text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1">
                Разом до сплати:
              </span>
              <span className="text-2xl font-black text-white">{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <p className="font-bold text-slate-800 mb-6">Відпустив (ПІБ, підпис):</p>
              <div className="border-b border-slate-400 w-3/4 mb-1"></div>
              <p className="text-[10px] text-slate-400">М.П. / Дата</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-6">Отримав (ПІБ, підпис):</p>
              <div className="border-b border-slate-400 w-3/4 mb-1"></div>
              <p className="text-[10px] text-slate-400">Претензій до кількості та зовнішнього вигляду не маю</p>
            </div>
          </div>
        </div>
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
