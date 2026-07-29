import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot
} from 'firebase/firestore';
import { 
  Users, 
  Search, 
  Download,
  Mail,
  Phone,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '../types';
import { cn, formatCurrency, exportToCSV } from '../lib/utils';

export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });
    return () => unsub();
  }, []);

  const filteredClients = clients.filter(c => {
    const name = (c.name || '').toLowerCase();
    const phone = (c.phone || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    return name.includes(searchTermLower) || 
           phone.includes(searchTermLower) || 
           email.includes(searchTermLower);
  }).sort((a, b) => b.totalTurnover - a.totalTurnover);

  const handleExport = () => {
    const headers = ['ID', 'Ім\'я', 'Телефон', 'Email', 'Баланс', 'Оборот', 'Дата реєстрації'];
    const data = filteredClients.map(c => [
      c.id,
      c.name,
      c.phone || '',
      c.email || '',
      c.balance,
      c.totalTurnover,
      c.createdAt?.toDate ? `${c.createdAt.toDate().toLocaleDateString('uk-UA')} ${c.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}` : ''
    ]);
    exportToCSV(`clients_${new Date().toLocaleDateString('uk-UA')}`, headers, data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          Клієнти
        </h2>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Пошук клієнтів..." 
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm shrink-0"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Експорт</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="py-4 px-6">Клієнт</th>
                <th className="py-4 px-6">Контакти</th>
                <th className="py-4 px-6 text-right">Баланс</th>
                <th className="py-4 px-6 text-right">Оборот</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredClients.map((client) => (
                  <motion.tr 
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        ID: {client.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-slate-600">
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {client.email}
                          </div>
                        )}
                        {!client.phone && !client.email && (
                          <span className="text-slate-400 italic">Немає контактів</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold",
                        client.balance > 0 ? "bg-emerald-50 text-emerald-700" :
                        client.balance < 0 ? "bg-rose-50 text-rose-700" :
                        "bg-slate-50 text-slate-600"
                      )}>
                        {client.balance > 0 ? <ArrowUpRight className="w-4 h-4" /> : 
                         client.balance < 0 ? <ArrowDownLeft className="w-4 h-4" /> : null}
                        {formatCurrency(Math.abs(client.balance))}
                      </div>
                      {client.balance < 0 && (
                        <div className="text-[10px] text-rose-500 font-medium uppercase tracking-wider mt-1">Борг</div>
                      )}
                      {client.balance > 0 && (
                        <div className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider mt-1">Аванс</div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(client.totalTurnover)}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="font-medium text-lg">Клієнтів не знайдено</p>
              <p className="text-sm mt-1">Спробуйте змінити параметри пошуку</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
