import { useEffect, useState, FormEvent, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  runTransaction,
  doc,
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Search,
  Package,
  Check,
  User,
  Phone,
  Car,
  Fingerprint,
  Calendar,
  Zap,
  Tag,
  Building2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OrderItem, ItemStatus, Client } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewOrderItem {
  id: string;
  productId?: string;
  partNumber: string;
  brand: string;
  productName: string;
  quantity: number;
  costPrice: string | number;
  sellingPrice: string | number;
  supplier: string;
  deliveryTime?: string;
  status: ItemStatus;
}

export default function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  
  // Order Header Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [carModel, setCarModel] = useState('');
  const [vin, setVin] = useState('');
  const [carYear, setCarYear] = useState('');
  const [engineVolume, setEngineVolume] = useState('');

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Order Items Table
  const [items, setItems] = useState<NewOrderItem[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribeProd = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubscribeClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    return () => {
      unsubscribeProd();
      unsubscribeClients();
    };
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

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCustomerName(client.name);
    setCustomerPhone(client.phone || '');
    setShowClientSuggestions(false);
  };

  const totalAmount = items.reduce((acc, item) => {
    const price = item.sellingPrice === '' ? 0 : Number(item.sellingPrice);
    return acc + (price * item.quantity);
  }, 0);

  const addNewRow = () => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      partNumber: '',
      brand: '',
      productName: '',
      quantity: 1,
      costPrice: '',
      sellingPrice: '',
      supplier: '',
      status: 'Pending'
    }]);
  };

  const updateItem = (id: string, field: keyof NewOrderItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addFromCatalog = (product: Product) => {
    setItems(prev => {
      // Check if item already exists in the table to avoid duplicates
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      }

      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        partNumber: product.sku,
        brand: product.brand || '',
        productName: product.name,
        quantity: 1,
        costPrice: product.price * 0.8, // Estimate cost price if not stored
        sellingPrice: product.price,
        supplier: '',
        status: 'Pending'
      }];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !customerName || !auth.currentUser) return;
    setIsSubmitting(true);

    const totalProfit = items.reduce((acc, i) => {
      const sp = i.sellingPrice === '' ? 0 : Number(i.sellingPrice);
      const cp = i.costPrice === '' ? 0 : Number(i.costPrice);
      return acc + (sp - cp) * i.quantity;
    }, 0);

    const path = 'orders';
    try {
      let clientId = selectedClient?.id;

      // 1. Handle Client Creation
      if (!clientId) {
        const existingClient = clients.find(c => c.name.toLowerCase() === customerName.toLowerCase());
        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const clientRef = doc(collection(db, 'clients'));
          await setDoc(clientRef, {
            name: customerName,
            phone: customerPhone || '',
            balance: 0,
            totalTurnover: 0,
            createdAt: serverTimestamp()
          });
          clientId = clientRef.id;
        }
      }

      await runTransaction(db, async (transaction) => {
        // 2. Create the order
        const orderRef = doc(collection(db, path));
        transaction.set(orderRef, {
          clientId,
          customerName,
          customerPhone,
          carModel,
          vin,
          carYear,
          engineVolume,
          status: 'Pending',
          totalAmount,
          totalProfit,
          creatorId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 2. Process items and update stock
        for (const item of items) {
          const itemRef = doc(collection(db, `orders/${orderRef.id}/items`));
          transaction.set(itemRef, {
            productId: item.productId || null,
            partNumber: item.partNumber,
            brand: item.brand,
            productName: item.productName,
            quantity: item.quantity,
            costPrice: Number(item.costPrice),
            sellingPrice: Number(item.sellingPrice),
            supplier: item.supplier || '',
            deliveryTime: item.deliveryTime || '',
            status: item.status
          });

          // Update stock if we have a productId
          if (item.productId) {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              transaction.update(productRef, { stock: newStock });
            }
          }
        }

        // 3. Create notification
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: auth.currentUser?.uid,
          message: `Нове замовлення запчастин: ${customerName} (${carModel})`,
          type: 'info',
          read: false,
          createdAt: serverTimestamp()
        });
      });

      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      alert('Помилка при створенні замовлення. Можливо, недостатньо товару на складі або помилка мережі.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCarModel('');
    setVin('');
    setCarYear('');
    setEngineVolume('');
    setItems([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Оформлення замовлення</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Деталі автомобіля та запчастин</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Customer & Car Data */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Дані клієнта та автомобіля
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2 relative" ref={dropdownRef}>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Клієнт *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          required 
                          value={customerName} 
                          onChange={e => {
                            setCustomerName(e.target.value);
                            setShowClientSuggestions(true);
                            if (selectedClient && e.target.value !== selectedClient.name) {
                              setSelectedClient(null);
                            }
                          }} 
                          onFocus={() => setShowClientSuggestions(true)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" 
                          placeholder="ПІБ клієнта" 
                        />
                      </div>

                      <AnimatePresence>
                        {showClientSuggestions && customerName.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                          >
                            {clients
                              .filter(c => 
                                c.name.toLowerCase().includes(customerName.toLowerCase()) ||
                                (c.phone && c.phone.toLowerCase().includes(customerName.toLowerCase()))
                              )
                              .map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleSelectClient(client)}
                                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{client.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{client.phone || 'Немає телефону'}</p>
                                  </div>
                                  <div className="text-[10px] font-black text-blue-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    Обрати <ChevronDown className="w-3 h-3" />
                                  </div>
                                </button>
                              ))
                            }
                            {clients.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).length === 0 && (
                              <div className="px-4 py-4 text-xs text-slate-400 text-center italic">Новий клієнт (буде створено автоматично)</div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Телефон</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="+380..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Автомобіль</label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={carModel} onChange={e => setCarModel(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Марка, модель" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">VIN-код</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={vin} onChange={e => setVin(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-mono" placeholder="17 символів" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Рік випуску</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={carYear} onChange={e => setCarYear(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="РРРР" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Об'єм двигуна</label>
                      <div className="relative">
                        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={engineVolume} onChange={e => setEngineVolume(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="2.0L, 3.5..." />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Items Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Позиції замовлення
                    </h4>
                    <button type="button" onClick={addNewRow} className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-4 h-4" />
                      Додати рядок
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Артикул</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Бренд</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Назва</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">К-ть</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Вхід (₴)</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Продаж (₴)</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Срок</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Постачальник</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Статус</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2">
                              <input value={item.partNumber} onChange={e => updateItem(item.id, 'partNumber', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-mono uppercase" placeholder="SKU" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.brand} onChange={e => updateItem(item.id, 'brand', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Виробник" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.productName} onChange={e => updateItem(item.id, 'productName', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Назва запчастини" />
                            </td>
                            <td className="px-3 py-2 w-16">
                              <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs text-center" />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input type="number" value={item.costPrice} onChange={e => updateItem(item.id, 'costPrice', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input type="number" value={item.sellingPrice} onChange={e => updateItem(item.id, 'sellingPrice', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-bold text-slate-900" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.deliveryTime || ''} onChange={e => updateItem(item.id, 'deliveryTime', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-bold text-blue-600" placeholder="Срок" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.supplier} onChange={e => updateItem(item.id, 'supplier', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Постачальник" />
                            </td>
                            <td className="px-3 py-2">
                              <select 
                                value={item.status} 
                                onChange={e => updateItem(item.id, 'status', e.target.value as ItemStatus)} 
                                className={cn(
                                  "w-full px-2 py-1.5 rounded-lg outline-none border text-[10px] font-black uppercase tracking-tighter transition-all cursor-pointer",
                                  item.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                  item.status === 'Ordered' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                  item.status === 'Available' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                  item.status === 'Out of Stock' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                  item.status === 'Picked' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  item.status === 'Packed' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                  item.status === 'Issued' ? "bg-slate-900 text-white border-slate-900" :
                                  "bg-slate-50 text-slate-500 border-slate-200"
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
                            <td className="px-3 py-2 text-center">
                              <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-sm text-slate-400 italic">Натисніть "Додати рядок" або оберіть з каталогу нижче</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 bg-slate-900 flex items-center justify-between">
                    <div className="flex gap-8">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Прибуток (EST)</p>
                        <p className="text-lg font-bold text-emerald-400">
                          {formatCurrency(items.reduce((acc, i) => {
                            const sp = i.sellingPrice === '' ? 0 : Number(i.sellingPrice);
                            const cp = i.costPrice === '' ? 0 : Number(i.costPrice);
                            return acc + (sp - cp) * i.quantity;
                          }, 0))}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Разом до сплати</p>
                      <p className="text-3xl font-black text-white">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Catalog Selection (Optional Quick Add) */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Каталог (Швидкий вибір)
                  </h4>
                  <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Пошук в каталозі..." 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="relative min-w-[200px]">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold text-slate-700 appearance-none"
                        value={selectedSupplier}
                        onChange={e => setSelectedSupplier(e.target.value)}
                      >
                        <option value="all">Усі постачальники</option>
                        {Array.from(new Set(products.map(p => p.supplier).filter(Boolean))).map(supplier => (
                          <option key={supplier} value={supplier}>{supplier}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {products
                      .filter(p => {
                        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                              p.sku.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesSupplier = selectedSupplier === 'all' || p.supplier === selectedSupplier;
                        return matchesSearch && matchesSupplier;
                      })
                      .slice(0, 4)
                      .map(p => (
                        <button key={p.id} type="button" onClick={() => addFromCatalog(p)} className="p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-blue-500 transition-all active:scale-95 group">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{p.name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                            <p className="text-[9px] font-black text-blue-500 uppercase">{p.supplier}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Скасувати
                  </button>
                  <button type="submit" disabled={isSubmitting || items.length === 0} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3">
                    {isSubmitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <>Створити замовлення</>}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
