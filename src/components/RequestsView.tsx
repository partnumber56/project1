import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  orderBy, 
  query
} from 'firebase/firestore';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock, 
  User, 
  Calendar,
  Eye,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailsModal from './RequestDetailsModal';

export default function RequestsView() {
  const [requests, setRequests] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Order | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return () => unsubscribe();
  }, []);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Шукати за ім'ям або ID..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
        >
          <Plus className="w-5 h-5" />
          Новий запит
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredRequests.map(request => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={request.id}
              onClick={() => setSelectedRequest(request)}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-emerald-200/50 transition-all cursor-pointer group flex flex-col relative border-l-4 border-l-emerald-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  Запит/Чернетка
                </div>
                <span className="text-xs text-slate-400 font-mono">#{request.id.slice(0, 8)}</span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 line-clamp-1">{request.customerName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{request.carModel || 'Авто не вказано'}</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    <Calendar className="w-3 h-3" />
                    {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString('uk-UA') : 'Сьогодні'}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Орієнтовна сума</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(request.totalAmount)}</p>
                </div>
                <button className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all text-emerald-600">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredRequests.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">Запитів не знайдено</p>
          </div>
        )}
      </div>

      <CreateRequestModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />

      {selectedRequest && (
        <RequestDetailsModal 
          request={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
        />
      )}
    </div>
  );
}
