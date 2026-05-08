import { useEffect, useState, FormEvent, useRef, ChangeEvent } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Package, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Layers,
  Tag,
  DollarSign,
  X,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { read, utils } from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { cn, formatCurrency } from '../lib/utils';

export default function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    supplier: '',
    stock: '' as string | number,
    price: '' as string | number,
    category: '',
    description: '',
    deliveryTime: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsubscribe();
  }, []);

  const suppliers = ['All', ...new Set(products.map(p => p.supplier).filter(Boolean) as string[])];

  const filteredProducts = products.filter(p => {
    const nameStr = (p.name || '').toLowerCase();
    const skuStr = (p.sku || '').toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    const matchesSearch = nameStr.includes(searchTermLower) || skuStr.includes(searchTermLower);
    const matchesSupplier = supplierFilter === 'All' || p.supplier === supplierFilter;
    return matchesSearch && matchesSupplier;
  }).sort((a, b) => {
    // Sort by name if no createdAt
    return (a.name || '').localeCompare(b.name || '');
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const path = 'products';
    try {
      if (editingProduct) {
        await updateDoc(doc(db, path, editingProduct.id), {
          ...formData,
          stock: Number(formData.stock),
          price: Number(formData.price)
        });
      } else {
        await addDoc(collection(db, path), {
          ...formData,
          stock: Number(formData.stock),
          price: Number(formData.price),
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', sku: '', brand: '', supplier: '', stock: '', price: '', category: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цей товар?')) return;
    const path = 'products';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      brand: product.brand || '',
      supplier: product.supplier || '',
      stock: product.stock,
      price: product.price,
      category: product.category || '',
      description: product.description || '',
      deliveryTime: product.deliveryTime || ''
    });
    setIsModalOpen(true);
  };

  const handleImportExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('Файл порожній');
          setIsImporting(false);
          return;
        }

        const batch = writeBatch(db);
        const productsCol = collection(db, 'products');

        data.forEach((row: any) => {
          // Flexible mapping
          const name = row['Назва'] || row['Name'] || row['productName'] || row['Товар'];
          const sku = row['SKU'] || row['Артикул'] || row['sku'] || row['Код'];
          const stock = Number(row['Кількість'] || row['Stock'] || row['stock'] || row['Залишок'] || 0);
          const price = Number(row['Ціна'] || row['Price'] || row['price'] || row['Вартість'] || 0);
          const brand = row['Бренд'] || row['Brand'] || row['brand'] || row['Виробник'] || '';
          const supplier = row['Постачальник'] || row['Supplier'] || row['supplier'] || '';
          const category = row['Категорія'] || row['Category'] || row['category'] || '';
          const description = row['Опис'] || row['Description'] || row['description'] || '';

          if (name && sku) {
            const newDocRef = doc(productsCol);
            batch.set(newDocRef, {
              name,
              sku,
              stock,
              price,
              brand,
              supplier,
              category,
              description,
              createdAt: serverTimestamp()
            });
          }
        });

        await batch.commit();
        alert(`Успішно імпортовано ${data.length} товарів`);
      } catch (error) {
        console.error('Excel Import Error:', error);
        alert('Помилка при імпорті Excel. Перевірте формат файлу.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-4 max-w-2xl">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Пошук по назві або SKU..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-4 flex items-center gap-2 group focus-within:border-blue-500 transition-all">
            <Layers className="w-4 h-4 text-slate-400" />
            <select 
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full py-2 outline-none text-sm font-medium bg-transparent cursor-pointer"
            >
              {suppliers.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'Всі постачальники' : s}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button 
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-6 rounded-xl border border-slate-200 shadow-sm active:scale-95 transition-all whitespace-nowrap disabled:opacity-50"
          >
            {isImporting ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            )}
            Імпорт Excel
          </button>
          
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', sku: '', brand: '', supplier: '', stock: '', price: '', category: '', description: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl shadow-lg shadow-blue-900/10 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Додати товар
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Товар</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Категорія</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Срок</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Наявність</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ціна</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                      <span className="font-semibold text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{product.sku}</span>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {product.brand && <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{product.brand}</p>}
                      {product.supplier && <p className="text-[10px] text-blue-500 uppercase font-black tracking-tighter">{product.supplier}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{product.category || 'Без категорії'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-blue-600 uppercase italic">{product.deliveryTime || 'н/д'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">
                      {product.stock} шт
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEdit(product)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Товарів не знайдено</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingProduct ? 'Редагувати товар' : 'Новий товар'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Назва товару</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-sans"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">SKU (Код)</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Бренд / Виробник</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Постачальник</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Категорія</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Ціна (₴)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-sans"
                      value={formData.price === 0 ? '' : formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Кількість</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                      value={formData.stock === 0 ? '' : formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? 0 : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Срок поставки</label>
                    <input 
                      type="text" 
                      placeholder="напр. 1-2 дні"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all uppercase text-sm font-bold text-blue-600"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Опис</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-6 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Скасувати
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-95"
                  >
                    Зберегти
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
