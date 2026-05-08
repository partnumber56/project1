import { useEffect, useState, ReactNode } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { Order, Product } from '../types';

export default function DashboardView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    orderCount: 0,
    lowStockCount: 0,
    pendingOrders: 0
  });

  const [chartData, setChartData] = useState<{name: string, value: number}[]>([]);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(orderData);
      
      const sales = orderData.reduce((acc, curr) => curr.status !== 'Cancelled' ? acc + curr.totalAmount : acc, 0);
      const profit = orderData.reduce((acc, curr) => curr.status !== 'Cancelled' ? acc + (curr.totalProfit || 0) : acc, 0);
      
      setStats(prev => ({
        ...prev,
        totalSales: sales,
        totalProfit: profit,
        orderCount: orderData.length,
        pendingOrders: orderData.filter(o => o.status === 'Pending').length
      }));

      // Generate Chart Data (Last 7 Days)
      const now = new Date();
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        return d;
      });

      const processedChartData = last7Days.map(date => {
        const dayLabel = date.toLocaleDateString('uk-UA', { weekday: 'short' });
        const dayOrders = orderData.filter(o => {
          if (!o.createdAt) return false;
          const orderDate = o.createdAt.toDate();
          return orderDate.getDate() === date.getDate() && 
                 orderDate.getMonth() === date.getMonth() &&
                 orderDate.getFullYear() === date.getFullYear() &&
                 o.status !== 'Cancelled';
        });
        const daySales = dayOrders.reduce((acc, o) => acc + o.totalAmount, 0);
        return { name: dayLabel, value: daySales };
      });
      setChartData(processedChartData);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productData);
      setStats(prev => ({
        ...prev,
        lowStockCount: productData.filter(p => p.stock < 10).length
      }));
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Дохід" 
          value={formatCurrency(stats.totalSales)} 
          change="+12.5%" 
          trend="up" 
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="Прибуток" 
          value={formatCurrency(stats.totalProfit)} 
          change="+8.2%" 
          trend="up" 
          icon={<DollarSign className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="Очікують" 
          value={stats.pendingOrders.toString()} 
          change="Потребують уваги" 
          trend="neutral" 
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-50"
        />
        <StatCard 
          title="Низький запас" 
          value={stats.lowStockCount.toString()} 
          change="Товари < 10 шт" 
          trend="down" 
          icon={<Package className="w-5 h-5 text-rose-600" />}
          bgColor="bg-rose-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Динаміка доходів</h3>
              <p className="text-sm text-slate-500">Огляд продажів за поточний тиждень</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-sm font-medium outline-none">
              <option>Цей тиждень</option>
              <option>Минулий тиждень</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(val) => `₴${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Останні замовлення</h3>
            <button className="text-blue-600 text-sm font-semibold hover:underline">Всі</button>
          </div>
          
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    order.status === 'Delivered' ? 'bg-emerald-100' : 
                    order.status === 'Cancelled' ? 'bg-rose-100' : 'bg-blue-100'
                  )}>
                    <ShoppingCart className={cn(
                      "w-4 h-4",
                      order.status === 'Delivered' ? 'text-emerald-600' : 
                      order.status === 'Cancelled' ? 'text-rose-600' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate max-w-[120px]">{order.customerName}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{order.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(order.totalAmount)}</p>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic text-sm">Замовлень поки немає</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: ReactNode;
  bgColor: string;
}

function StatCard({ title, value, change, trend, icon, bgColor }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", bgColor)}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          trend === 'up' ? "text-emerald-600 bg-emerald-50" : 
          trend === 'down' ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-100"
        )}>
          {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}
