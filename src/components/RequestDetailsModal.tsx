import { useEffect, useState, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc,
  serverTimestamp,
  runTransaction,
  updateDoc,
  query,
  where,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { 
  X, 
  User, 
  Car, 
  Phone,
  Fingerprint,
  Calendar,
  Zap,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  FileText,
  Save,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderItem, Client } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface RequestDetailsModalProps {
  request: Order | null;
  onClose: () => void;
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
        "w-full px-3 py-1.5 bg-slate-50 border border-transparent focus:border-emerald-500 rounded-lg outline-none",
        className
      )}
    />
  );
}

export default function RequestDetailsModal({ request, onClose }: RequestDetailsModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
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
    if (!request) return;

    const unsubscribe = onSnapshot(collection(db, `requests/${request.id}/items`), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderItem)));
    });

    return () => unsubscribe();
  }, [request]);

  const updateRequestField = async (field: string, value: any) => {
    if (!request) return;
    try {
      await updateDoc(doc(db, 'requests', request.id), {
        [field]: value,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'requests');
    }
  };

  const updateItemField = async (itemId: string, field: string, value: any) => {
    if (!request) return;
    const val = field.includes('Price') || field === 'quantity' 
      ? (value === '' ? 0 : Number(String(value).replace(',', '.'))) 
      : value;

    try {
      await updateDoc(doc(db, `requests/${request.id}/items`, itemId), {
        [field]: val,
        updatedAt: serverTimestamp()
      });

      // Recalculate total amount and profit
      const updatedItems = items.map(i => i.id === itemId ? { ...i, [field]: val } : i);
      const totalAmount = updatedItems.reduce((acc, i) => acc + (Number(i.sellingPrice) * Number(i.quantity)), 0);
      const totalProfit = updatedItems.reduce((acc, i) => acc + (Number(i.sellingPrice) - Number(i.costPrice)) * Number(i.quantity), 0);

      await updateDoc(doc(db, 'requests', request.id), {
        totalAmount,
        totalProfit,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${request.id}/items/${itemId}`);
    }
  };

  const addItemRow = async () => {
    if (!request) return;
    try {
      const itemRef = doc(collection(db, `requests/${request.id}/items`));
      await runTransaction(db, async (transaction) => {
        transaction.set(itemRef, {
          productName: '',
          partNumber: '',
          brand: '',
          quantity: 1,
          costPrice: '',
          sellingPrice: '',
          supplier: '',
          status: 'Pending'
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `requests/${request.id}/items`);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!request) return;
    if (!confirm('Видалити цю позицію?')) return;
    try {
      await deleteDoc(doc(db, `requests/${request.id}/items`, itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${request.id}/items`);
    }
  };

  const convertToOrder = async () => {
    if (!request) return;
    setIsProcessing(true);

    try {
      let clientId = (request as any).clientId;
      
      if (!clientId) {
        // Try to find client by name
        const q = query(collection(db, 'clients'), where('name', '==', request.customerName));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          clientId = querySnapshot.docs[0].id;
        } else {
          // Create new client
          const clientRef = doc(collection(db, 'clients'));
          await setDoc(clientRef, {
            name: request.customerName,
            phone: request.customerPhone || '',
            balance: 0,
            totalTurnover: 0,
            createdAt: serverTimestamp()
          });
          clientId = clientRef.id;
        }
      }

      await runTransaction(db, async (transaction) => {
        // 1. Create order
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          ...request, // This includes customerName, carModel, etc.
          clientId: clientId || null,
          id: orderRef.id,
          status: 'Pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 2. Map items
        for (const item of items) {
          const itemRef = doc(collection(db, `orders/${orderRef.id}/items`));
          transaction.set(itemRef, {
            ...item,
            status: item.status || 'Pending' 
          });
        }

        // 3. Delete request
        const requestRef = doc(db, 'requests', request.id);
        transaction.delete(requestRef);
      });

      onClose();
    } catch (error) {
      console.error(error);
      alert('Помилка при перетворенні на замовлення.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteRequest = async () => {
    if (!request) return;
    if (!confirm('Ви впевнені, що хочете видалити цей запит?')) return;

    try {
      await deleteDoc(doc(db, 'requests', request.id));
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'requests');
    }
  };

  const handleSelectClient = async (client: Client) => {
    if (!request) return;
    try {
      await updateDoc(doc(db, 'requests', request.id), {
        clientId: client.id,
        customerName: client.name,
        customerPhone: client.phone || request.customerPhone || '',
        updatedAt: serverTimestamp()
      });
      setShowClientSuggestions(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'requests');
    }
  };

  const createNewClient = async () => {
    if (!request || !request.customerName) return;
    try {
      const clientRef = doc(collection(db, 'clients'));
      const clientData = {
        name: request.customerName,
        phone: request.customerPhone || '',
        balance: 0,
        totalTurnover: 0,
        createdAt: serverTimestamp()
      };
      await setDoc(clientRef, clientData);
      
      await updateDoc(doc(db, 'requests', request.id), {
        clientId: clientRef.id,
        updatedAt: serverTimestamp()
      });
      
      setShowClientSuggestions(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  if (!request) return null;

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
          className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Деталі запиту</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {request.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Дані Клієнта
                </h4>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ПІБ Клієнта</label>
                      {(request as any).clientId ? (
                        <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Зв'язано</span>
                      ) : (
                        <span className="text-[8px] font-black bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Чернетка</span>
                      )}
                    </div>
                    <input 
                      value={request.customerName} 
                      onChange={(e) => {
                        updateRequestField('customerName', e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      className={cn(
                        "w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-800",
                        (request as any).clientId ? "border-slate-100 focus:border-emerald-500" : "border-amber-400 focus:border-amber-500"
                      )} 
                    />

                    <AnimatePresence>
                      {showClientSuggestions && request.customerName.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {clients
                            .filter(c => 
                              c.name.toLowerCase().includes(request.customerName.toLowerCase()) ||
                              (c.phone && c.phone.toLowerCase().includes(request.customerName.toLowerCase()))
                            )
                            .map(client => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => handleSelectClient(client)}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{client.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{client.phone || 'Немає телефону'}</p>
                                </div>
                                <User className="w-4 h-3 text-slate-300 group-hover:text-emerald-500" />
                              </button>
                            ))
                          }
                          {clients.filter(c => 
                            c.name.toLowerCase().includes(request.customerName.toLowerCase()) ||
                            (c.phone && c.phone.toLowerCase().includes(request.customerName.toLowerCase()))
                          ).length === 0 && (
                            <button 
                              onClick={createNewClient}
                              className="w-full px-4 py-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
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
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Телефон</label>
                    <input 
                      value={request.customerPhone || ''} 
                      onChange={(e) => updateRequestField('customerPhone', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Автомобіль
                </h4>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Марка / Модель</label>
                    <input 
                      value={request.carModel || ''} 
                      onChange={(e) => updateRequestField('carModel', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">VIN Номер</label>
                      <input 
                        value={request.vin || ''} 
                        onChange={(e) => updateRequestField('vin', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-xs font-mono" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Рік випуску</label>
                      <input 
                        value={request.carYear || ''} 
                        onChange={(e) => updateRequestField('carYear', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-xs" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Об'єм двигуна</label>
                    <input 
                      value={request.engineVolume || ''} 
                      onChange={(e) => updateRequestField('engineVolume', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-emerald-500 text-xs" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Специфікація запиту (Процінка)
                </h4>
                <button onClick={addItemRow} className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors uppercase">
                  <Plus className="w-3.5 h-3.5" />
                  Додати запчастину
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Назва</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Артикул / Бренд</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Срок</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Постачальник</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">К-ть</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Вхід (₴)</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Продаж (₴)</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Статус</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
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
                            onChange={(e) => updateItemField(item.id, 'status', e.target.value)}
                            className={cn(
                              "text-[10px] font-black uppercase tracking-tighter py-1 px-2 rounded-lg outline-none border transition-all cursor-pointer",
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
              
              <div className="p-6 bg-slate-900 rounded-2xl flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Разом по запиту</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">{formatCurrency(request.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
            <button
              onClick={deleteRequest}
              className="px-6 py-3 text-red-600 font-bold flex items-center gap-2 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
              Видалити запит
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                Закрити
              </button>
              <button
                onClick={convertToOrder}
                disabled={isProcessing}
                className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isProcessing ? 'Обробка...' : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Оформити замовлення
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
