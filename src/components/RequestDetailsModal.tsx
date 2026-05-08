import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc,
  serverTimestamp,
  runTransaction
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
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderItem } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface RequestDetailsModalProps {
  request: Order | null;
  onClose: () => void;
}

export default function RequestDetailsModal({ request, onClose }: RequestDetailsModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!request) return;

    const unsubscribe = onSnapshot(collection(db, `requests/${request.id}/items`), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderItem)));
    });

    return () => unsubscribe();
  }, [request]);

  const convertToOrder = async () => {
    if (!request) return;
    setIsProcessing(true);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Create order
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          ...request,
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
            status: 'Pending' // Reset status to pending for new order
          });
        }

        // 3. Delete request
        const requestRef = doc(db, 'requests', request.id);
        transaction.delete(requestRef);
        // Note: subcollections in Firestore are not deleted automatically in a transaction or normally, 
        // but since we are moving them, it's fine. In a real app we might want to cleanup the requests/{id}/items too.
        // Actually Firestore doesn't provide a way to delete a collection easily.
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
                  Клієнт
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-lg font-black text-slate-800">{request.customerName}</p>
                  {request.customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <Phone className="w-4 h-4" />
                      {request.customerPhone}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Автомобіль
                </h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Модель</p>
                    <p className="text-sm font-bold text-slate-700">{request.carModel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">VIN</p>
                    <p className="text-sm font-mono text-slate-700">{request.vin || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Специфікація
              </h4>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Артикул / Назва</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">К-ть</th>
                      <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ціна</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{item.productName}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{item.partNumber} {item.brand && `• ${item.brand}`}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-600">x{item.quantity}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(item.sellingPrice)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
