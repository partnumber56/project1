import { useEffect, useState, FormEvent } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  runTransaction,
  doc
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
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OrderItem, ItemStatus } from '../types';
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
  costPrice: number;
  sellingPrice: number;
  supplier: string;
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

  // Order Items Table
  const [items, setItems] = useState<NewOrderItem[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsubscribe();
  }, []);

  const totalAmount = items.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);

  const addNewRow = () => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      partNumber: '',
      brand: '',
      productName: '',
      quantity: 1,
      costPrice: 0,
      sellingPrice: 0,
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

    const totalProfit = items.reduce((acc, i) => acc + (i.sellingPrice - i.costPrice) * i.quantity, 0);

    const path = 'orders';
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Create the order
        const orderRef = doc(collection(db, path));
        transaction.set(orderRef, {
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
            supplier: item.supplier,
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
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Клієнт *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="ПІБ клієнта" />
                      </div>
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
                              <input type="number" value={item.costPrice} onChange={e => updateItem(item.id, 'costPrice', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input type="number" value={item.sellingPrice} onChange={e => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-bold text-slate-900" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.supplier} onChange={e => updateItem(item.id, 'supplier', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Постачальник" />
                            </td>
                            <td className="px-3 py-2">
                              <select value={item.status} onChange={e => updateItem(item.id, 'status', e.target.value as ItemStatus)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-[10px] font-bold">
                                <option value="Pending">Очікує</option>
                                <option value="Ordered">Замовлено</option>
                                <option value="Available">В наявності</option>
                                <option value="Out of Stock">Немає</option>
                                <option value="Picked">Зібрано</option>
                                <option value="Packed">Запаковано</option>
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
                          {formatCurrency(items.reduce((acc, i) => acc + (i.sellingPrice - i.costPrice) * i.quantity, 0))}
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
