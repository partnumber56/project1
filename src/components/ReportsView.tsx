import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  FileText, 
  Download, 
  Filter,
  TrendingUp,
  CircleDollarSign,
  Car
} from 'lucide-react';
import { Order } from '../types';
import { formatCurrency, cn } from '../lib/utils';

export default function ReportsView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter(o => {
    if (timeFilter === 'all') return true;
    if (!o.createdAt) return false;
    const date = o.createdAt.toDate();
    const now = new Date();
    if (timeFilter === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (timeFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (timeFilter === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalRevenue = filteredOrders.reduce((acc, o) => o.status !== 'Cancelled' ? acc + o.totalAmount : acc, 0);
  const totalProfit = filteredOrders.reduce((acc, o) => o.status !== 'Cancelled' ? acc + (o.totalProfit || 0) : acc, 0);
  const averageOrder = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800">Звітність</h3>
          <p className="text-slate-500">Детальна статистика виконання замовлень</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="text-sm font-bold text-slate-700 outline-none"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
            >
              <option value="all">За весь час</option>
              <option value="today">Сьогодні</option>
              <option value="week">Останні 7 днів</option>
              <option value="month">Цей місяць</option>
            </select>
          </div>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
            <Download className="w-4 h-4" />
            Експорт
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Загальний дохід</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CircleDollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Чистий прибуток</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(totalProfit)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Сер. чек</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatCurrency(averageOrder)}</p>
        </div>
      </div>

      {/* Detailed Order Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 font-bold text-slate-800">
          Журнал замовлень
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Клієнт</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Автомобіль</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Сума</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Прибуток</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('uk-UA') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{order.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">#{order.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Car className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600">{order.carModel || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-right font-bold",
                    (order.totalProfit || 0) > 0 ? "text-emerald-600" : "text-slate-400"
                  )}>
                    {formatCurrency(order.totalProfit || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase border",
                        order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        order.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      )}>
                        {order.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="py-20 text-center text-slate-400 italic">Даних не знайдено</div>
          )}
        </div>
      </div>
    </div>
  );
}
