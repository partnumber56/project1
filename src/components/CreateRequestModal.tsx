import { useEffect, useState, FormEvent } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  serverTimestamp, 
  runTransaction,
  doc
} from 'firebase/firestore';
import { 
  X, 
  Plus, 
  Trash2, 
  Search,
  Package,
  User,
  Phone,
  Car,
  Fingerprint,
  Calendar,
  Zap,
  Tag,
  Building2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ItemStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewRequestItem {
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

export default function CreateRequestModal({ isOpen, onClose }: CreateRequestModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  
  // Request Header Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [carModel, setCarModel] = useState('');
  const [vin, setVin] = useState('');
  const [carYear, setCarYear] = useState('');
  const [engineVolume, setEngineVolume] = useState('');

  // Request Items Table
  const [items, setItems] = useState<NewRequestItem[]>([]);
  
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

  const updateItem = (id: string, field: keyof NewRequestItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addFromCatalog = (product: Product) => {
    setItems(prev => {
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
        costPrice: product.price * 0.8,
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

    const path = 'requests';
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(collection(db, path));
        transaction.set(requestRef, {
          customerName,
          customerPhone,
          carModel,
          vin,
          carYear,
          engineVolume,
          status: 'Request',
          totalAmount,
          totalProfit,
          creatorId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        for (const item of items) {
          const itemRef = doc(collection(db, `requests/${requestRef.id}/items`));
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
        }

        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: auth.currentUser?.uid,
          message: `Новий запит на запчастини: ${customerName}`,
          type: 'info',
          read: false,
          createdAt: serverTimestamp()
        });
      });

      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      alert('Помилка при створенні запиту.');
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
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Новий Запит</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Попередня калькуляція</p>
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
                    Дані клієнта
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Клієнт *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="ПІБ клієнта" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Телефон</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="+380..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Автомобіль</label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={carModel} onChange={e => setCarModel(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm" placeholder="Марка, модель" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Items Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Специфікація запиту
                    </h4>
                    <button type="button" onClick={addNewRow} className="flex items-center gap-2 text-emerald-600 text-sm font-bold hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
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
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2">
                              <input value={item.partNumber} onChange={e => updateItem(item.id, 'partNumber', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-emerald-500 text-xs font-mono uppercase" placeholder="SKU" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.brand} onChange={e => updateItem(item.id, 'brand', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-emerald-500 text-xs" placeholder="Виробник" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.productName} onChange={e => updateItem(item.id, 'productName', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-emerald-500 text-xs" placeholder="Назва запчастини" />
                            </td>
                            <td className="px-3 py-2 w-16">
                              <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-emerald-500 text-xs text-center" />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input type="number" value={item.costPrice} onChange={e => updateItem(item.id, 'costPrice', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-emerald-500 text-xs" />
                            </td>
                            <td className="px-3 py-2 w-24">
                              <input type="number" value={item.sellingPrice} onChange={e => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-emerald-500 text-xs font-bold text-slate-900" />
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
                  </div>
                  
                  <div className="p-6 bg-emerald-900 flex items-center justify-between">
                    <div className="text-right ml-auto">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1 underline decoration-emerald-500/50">Попередня сума</p>
                      <p className="text-3xl font-black text-white">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Скасувати
                  </button>
                  <button type="submit" disabled={isSubmitting || items.length === 0} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3">
                    {isSubmitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <>Створити запит</>}
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
