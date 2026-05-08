import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  runTransaction,
  doc
} from 'firebase/firestore';
import { 
  DollarSign, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Users, 
  History,
  TrendingUp,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, FinancialTransaction } from '../types';
import { cn, formatCurrency } from '../lib/utils';

export default function FinanceView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [txType, setTxType] = useState<'Payment' | 'Refund' | 'Adjustment'>('Payment');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txDesc, setTxDesc] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      setTransactions([]);
      return;
    }
    const q = query(
      collection(db, `clients/${selectedClient.id}/transactions`), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialTransaction)));
    });
    return () => unsubscribe();
  }, [selectedClient]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const handleAddTransaction = async () => {
    if (!selectedClient || !txAmount || isNaN(parseFloat(txAmount))) return;

    const amount = parseFloat(txAmount);
    // For Payment: balance increases (client gave us money)
    // For Refund: balance decreases (we gave client money back)
    const balanceEffect = txType === 'Payment' ? amount : -amount;

    try {
      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'clients', selectedClient.id);
        const clientSnap = await transaction.get(clientRef);
        
        if (!clientSnap.exists()) throw new Error('Client not found');
        
        const currentBalance = clientSnap.data().balance || 0;
        const currentTurnover = clientSnap.data().totalTurnover || 0;

        // Create transaction
        const txRef = doc(collection(db, `clients/${selectedClient.id}/transactions`));
        transaction.set(txRef, {
          clientId: selectedClient.id,
          amount: txType === 'Payment' ? amount : -amount,
          type: txType,
          description: txDesc || (txType === 'Payment' ? 'Оплата' : 'Повернення'),
          createdAt: serverTimestamp()
        });

        // Update client
        transaction.update(clientRef, {
          balance: currentBalance + balanceEffect,
          // Turnover only increases if it's a payment? 
          // Usually turnover is the sum of orders. 
          // Let's just track balance correctly.
        });
      });

      setIsAddTransactionOpen(false);
      setTxAmount('');
      setTxDesc('');
    } catch (error) {
       console.error(error);
       alert('Помилка при збереженні транзакції');
    }
  };

  const createClient = async () => {
    const name = prompt('Введіть ПІБ клієнта:');
    if (!name) return;
    try {
      await addDoc(collection(db, 'clients'), {
        name,
        balance: 0,
        totalTurnover: 0,
        createdAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
      {/* Sidebar: Client List */}
      <div className="xl:col-span-4 flex flex-col gap-6 h-full">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col flex-1 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Клієнти
            </h3>
            <button onClick={createClient} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Пошук клієнта..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredClients.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                  selectedClient?.id === client.id 
                    ? "bg-blue-50 border-blue-200 shadow-sm" 
                    : "bg-white border-slate-100 hover:border-blue-200"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                  selectedClient?.id === client.id ? "bg-blue-600 border-white text-white" : "bg-slate-50 border-slate-100 text-slate-400"
                )}>
                  <span className="text-sm font-black">{client.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 line-clamp-1">{client.name}</p>
                  <p className={cn(
                    "text-xs font-black mt-1",
                    client.balance >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {formatCurrency(client.balance)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Client Detail & History */}
      <div className="xl:col-span-8 h-full">
        {selectedClient ? (
          <div className="flex flex-col gap-8 h-full">
            {/* Header Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0">
              <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Поточний Баланс</span>
                </div>
                <h4 className={cn(
                  "text-2xl font-black",
                  selectedClient.balance >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {formatCurrency(selectedClient.balance)}
                </h4>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Загальний Оборот</span>
                </div>
                <h4 className="text-2xl font-black text-slate-900">
                  {formatCurrency(selectedClient.totalTurnover)}
                </h4>
              </div>

              <button 
                onClick={() => setIsAddTransactionOpen(true)}
                className="bg-blue-600 rounded-3xl p-6 text-white flex flex-col justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-black uppercase tracking-widest">Провести Оплату</span>
              </button>
            </div>

            {/* History Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <History className="w-5 h-5 text-slate-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Історія транзакцій</h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 mb-4 h-12">
                    <tr>
                      <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата</th>
                      <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Тип / Опис</th>
                      <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Сума</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 text-xs font-mono text-slate-400">
                          {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString('uk-UA') : '...'}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-800">{tx.description}</p>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                            tx.type === 'Payment' ? "bg-emerald-50 text-emerald-600" :
                            tx.type === 'Refund' ? "bg-rose-50 text-rose-600" :
                            tx.type === 'Order' ? "bg-blue-50 text-blue-600" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={cn(
                          "px-4 py-4 text-right font-black",
                          tx.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-24 text-center text-slate-400 italic font-medium">
                          Транзакцій поки немає
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white border border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 p-12">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 opacity-20" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Оберіть клієнта</h3>
            <p className="text-sm max-w-xs text-center font-medium">Для перегляду балансу та історії платежів, будь ласка, оберіть клієнта зі списку зліва або створіть нового.</p>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddTransactionOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTransactionOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800">Нова транзакція</h3>
                <button onClick={() => setIsAddTransactionOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Тип транзакції</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setTxType('Payment')}
                      className={cn(
                        "py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2",
                        txType === 'Payment' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 text-slate-400"
                      )}
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Оплата
                    </button>
                    <button 
                      onClick={() => setTxType('Refund')}
                      className={cn(
                        "py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2",
                        txType === 'Refund' ? "border-rose-600 bg-rose-50 text-rose-600" : "border-slate-100 text-slate-400"
                      )}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Повернення
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Сума (₴)</label>
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all text-2xl font-black text-slate-900"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Опис (коментар)</label>
                  <textarea 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm min-h-[100px]"
                    placeholder="За що оплата..."
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleAddTransaction}
                  disabled={!txAmount}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                >
                  ПІДТВЕРДИТИ ОПЕРАЦІЮ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
