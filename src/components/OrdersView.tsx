import React, { useEffect, useState, useMemo } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  MoreVertical,
  Eye,
  Filter,
  Package,
  User,
  Calendar,
  X,
  Download,
  Printer,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderStatus, OrderItem } from '../types';
import { cn, formatCurrency, exportToCSV } from '../lib/utils';
import CreateOrderModal from './CreateOrderModal';
import OrderDetailsModal from './OrderDetailsModal';

export const getOrderStatusLabel = (status: OrderStatus | string | undefined): string => {
  switch (status) {
    case 'Pending':
    case 'Очікує':
    case 'Очікують':
      return 'Очікує';
    case 'Processing':
    case 'В обробці':
      return 'В обробці';
    case 'Shipped':
    case 'Відправлено':
      return 'Відправлено';
    case 'Delivered':
    case 'Виконано':
    case 'Доставлено':
      return 'Виконано';
    case 'Cancelled':
    case 'Скасовано':
      return 'Скасовано';
    case 'Request':
    case 'Запит':
      return 'Запит';
    default:
      return status || 'Очікує';
  }
};

export const normalizeOrderStatus = (status: string | undefined): OrderStatus => {
  if (!status) return 'Pending';
  if (status === 'Delivered' || status === 'Виконано' || status === 'Доставлено') return 'Delivered';
  if (status === 'Processing' || status === 'В обробці') return 'Processing';
  if (status === 'Cancelled' || status === 'Скасовано') return 'Cancelled';
  if (status === 'Shipped' || status === 'Відправлено') return 'Shipped';
  if (status === 'Request' || status === 'Запит') return 'Request';
  return 'Pending';
};

export default function OrdersView({ userRole }: { userRole?: string | null }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setOrderToPrint(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintOrder = async (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setPrintingOrderId(order.id);
      const itemsSnapshot = await getDocs(collection(db, `orders/${order.id}/items`));
      const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderItem));
      setOrderToPrint({ order, items });
      setTimeout(() => {
        window.print();
      }, 150);
    } catch (error) {
      console.error('Error fetching order items for print:', error);
      setOrderToPrint({ order, items: [] });
      setTimeout(() => {
        window.print();
      }, 150);
    } finally {
      setPrintingOrderId(null);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsub();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: orders.length,
      Processing: 0,
      Delivered: 0,
      Cancelled: 0,
      Pending: 0,
      Shipped: 0,
    };
    orders.forEach(o => {
      const s = normalizeOrderStatus(o.status);
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const customerName = (o.customerName || '').toLowerCase();
      const orderId = (o.id || '').toLowerCase();
      const phone = (o.customerPhone || '').toLowerCase();
      const vin = (o.vin || '').toLowerCase();
      const carModel = (o.carModel || '').toLowerCase();
      const searchTermLower = searchTerm.trim().toLowerCase();
      
      const matchesSearch = !searchTermLower || 
                           customerName.includes(searchTermLower) || 
                           orderId.includes(searchTermLower) ||
                           phone.includes(searchTermLower) ||
                           vin.includes(searchTermLower) ||
                           carModel.includes(searchTermLower);
                           
      const normalizedStatus = normalizeOrderStatus(o.status);
      const matchesFilter = filterStatus === 'All' || normalizedStatus === filterStatus;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [orders, searchTerm, filterStatus]);

  const getStatusIcon = (status: OrderStatus | string) => {
    const norm = normalizeOrderStatus(status);
    switch (norm) {
      case 'Pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Processing': return <Package className="w-4 h-4 text-blue-500" />;
      case 'Shipped': return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'Delivered': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Cancelled': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusClass = (status: OrderStatus | string) => {
    const norm = normalizeOrderStatus(status);
    switch (norm) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Shipped': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Клієнт', 'Телефон', 'Авто', 'VIN', 'Статус', 'Сума', 'Дата'];
    const data = filteredOrders.map(o => [
      o.id,
      o.customerName,
      o.customerPhone || '',
      o.carModel || '',
      o.vin || '',
      getOrderStatusLabel(o.status),
      o.totalAmount,
      o.createdAt?.toDate ? `${o.createdAt.toDate().toLocaleDateString('uk-UA')} ${o.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}` : ''
    ]);
    exportToCSV(`orders_${new Date().toLocaleDateString('uk-UA')}`, headers, data);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center print:hidden">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ім'я, телефон, авто, VIN або ID..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                title="Очистити пошук"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className={cn(
            "flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shrink-0 transition-all shadow-sm",
            filterStatus !== 'All' 
              ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/10" 
              : "border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
          )}>
            <Filter className={cn("w-4 h-4", filterStatus !== 'All' ? "text-blue-600" : "text-slate-400")} />
            <select 
              id="order-status-filter"
              aria-label="Фільтр замовлень за статусом"
              className={cn(
                "text-sm font-semibold outline-none bg-transparent cursor-pointer pr-1",
                filterStatus !== 'All' ? "text-blue-700" : "text-slate-700"
              )}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'All')}
            >
              <option value="All">Всі статуси ({statusCounts.All})</option>
              <option value="Processing">В обробці ({statusCounts.Processing})</option>
              <option value="Delivered">Виконано ({statusCounts.Delivered})</option>
              <option value="Cancelled">Скасовано ({statusCounts.Cancelled})</option>
              <option value="Pending">Очікують ({statusCounts.Pending})</option>
              <option value="Shipped">Відправлено ({statusCounts.Shipped})</option>
            </select>
            {filterStatus !== 'All' && (
              <button 
                onClick={() => setFilterStatus('All')}
                className="p-1 hover:bg-blue-100 rounded-md text-blue-500 hover:text-blue-700 transition-colors ml-0.5"
                title="Скинути фільтр статусів"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={handleExport}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Експорт</span>
          </button>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
          >
            <Plus className="w-5 h-5" />
            Нове замовлення
          </button>
        </div>
      </div>

      {/* Quick Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs print:hidden no-scrollbar">
        <button
          onClick={() => setFilterStatus('All')}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border",
            filterStatus === 'All'
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <span>Всі</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold", 
            filterStatus === 'All' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
          )}>
            {statusCounts.All}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('Processing')}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border",
            filterStatus === 'Processing'
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50/50 hover:text-blue-600"
          )}
        >
          <Package className="w-3.5 h-3.5" />
          <span>В обробці</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold", 
            filterStatus === 'Processing' ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600"
          )}>
            {statusCounts.Processing}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('Delivered')}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border",
            filterStatus === 'Delivered'
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50/50 hover:text-emerald-600"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Виконано</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold", 
            filterStatus === 'Delivered' ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600"
          )}>
            {statusCounts.Delivered}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('Cancelled')}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border",
            filterStatus === 'Cancelled'
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-rose-50/50 hover:text-rose-600"
          )}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Скасовано</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold", 
            filterStatus === 'Cancelled' ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-600"
          )}>
            {statusCounts.Cancelled}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('Pending')}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border",
            filterStatus === 'Pending'
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50/50 hover:text-amber-600"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Очікують</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold", 
            filterStatus === 'Pending' ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600"
          )}>
            {statusCounts.Pending}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('Shipped')}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 border",
            filterStatus === 'Shipped'
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50/50 hover:text-indigo-600"
          )}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Відправлено</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold", 
            filterStatus === 'Shipped' ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-600"
          )}>
            {statusCounts.Shipped}
          </span>
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map(order => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group flex flex-col relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold",
                  getStatusClass(order.status)
                )}>
                  {getStatusIcon(order.status)}
                  {getOrderStatusLabel(order.status)}
                </div>
                <span className="text-xs text-slate-400 font-mono">#{order.id.slice(0, 8)}</span>
              </div>

                  <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 line-clamp-1">{order.customerName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{order.carModel || 'Авто не вказано'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('uk-UA') : 'Сьогодні'}
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Сума до сплати</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handlePrintOrder(e, order)}
                    disabled={printingOrderId === order.id}
                    title="Друк накладної замовлення"
                    aria-label={`Друк накладної замовлення #${order.id}`}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {printingOrderId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    title="Деталі замовлення"
                    aria-label={`Деталі замовлення #${order.id}`}
                    className="p-2 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 print:hidden bg-white rounded-3xl border border-dashed border-slate-200 p-8">
            <ShoppingCart className="w-14 h-14 mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-base mb-1">Замовлень не знайдено</p>
            <p className="text-sm text-slate-400 mb-4 text-center max-w-sm">
              {filterStatus !== 'All' 
                ? `Немає замовлень зі статусом "${getOrderStatusLabel(filterStatus)}"${searchTerm ? ` та запитом "${searchTerm}"` : ''}.`
                : 'Немає замовлень за вказаними критеріями пошуку.'}
            </p>
            {(filterStatus !== 'All' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterStatus('All');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors shadow-sm"
              >
                Скинути фільтр та показати всі
              </button>
            )}
          </div>
        )}
      </div>

      <CreateOrderModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />

      <OrderDetailsModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
      />

      {/* Clean Printable Invoice Sheet for Individual Order (Visible strictly during print) */}
      {orderToPrint && (
        <div id="order-card-print-area" className="hidden print:block p-8 bg-white min-h-screen text-slate-900 font-sans w-full">
          {/* Invoice Header */}
          <div className="mb-6 pb-4 border-b-2 border-slate-900 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-lg tracking-tight uppercase text-slate-900">OrderFlow</span>
                <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded">Автозапчастини</span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                Видаткова накладна № {orderToPrint.order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Дата оформлення: {orderToPrint.order.createdAt?.toDate ? orderToPrint.order.createdAt.toDate().toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA')}
              </p>
            </div>
            <div className="text-right text-xs space-y-1">
              <p className="font-bold text-slate-900">Постачальник: OrderFlow Склад-Магазин</p>
              <p className="text-slate-500">Система обліку та управління замовленнями</p>
              <div className="inline-block mt-1 px-2.5 py-1 bg-slate-100 rounded text-[11px] font-bold text-slate-800 border border-slate-200">
                Статус: {getOrderStatusLabel(orderToPrint.order.status)}
              </div>
            </div>
          </div>

          {/* Client & Vehicle Details */}
          <div className="grid grid-cols-2 gap-4 p-4 mb-6 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Одержувач / Замовник</p>
              <p className="font-bold text-sm text-slate-900">{orderToPrint.order.customerName}</p>
              <p className="text-slate-600 mt-0.5 font-medium">Телефон: {orderToPrint.order.customerPhone || 'Не вказано'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Транспортний засіб</p>
              <p className="font-bold text-slate-900">{orderToPrint.order.carModel || 'Автомобіль не вказано'}</p>
              <p className="text-slate-600 font-mono mt-0.5">VIN: {orderToPrint.order.vin ? orderToPrint.order.vin.toUpperCase() : '—'}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-t-2 border-slate-900 bg-slate-100/70">
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-center w-10">№</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600">Артикул / Код</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600">Найменування товару</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600">Бренд</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-center">К-сть</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-right">Ціна (₴)</th>
                <th className="py-2.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-600 text-right">Сума (₴)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orderToPrint.items.length > 0 ? (
                orderToPrint.items.map((item, index) => {
                  const qty = Number(String(item.quantity).replace(',', '.')) || 1;
                  const price = Number(String(item.sellingPrice).replace(',', '.')) || 0;
                  const sum = qty * price;
                  return (
                    <tr key={item.id} className="page-break-inside-avoid">
                      <td className="py-2.5 px-2 text-center text-slate-500 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-800">{item.partNumber || '—'}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900">{item.productName || 'Запчастина'}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">{item.brand || '—'}</td>
                      <td className="py-2.5 px-2 text-center font-black text-slate-900">{qty}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-800">{formatCurrency(price)}</td>
                      <td className="py-2.5 px-2 text-right font-black text-slate-900">{formatCurrency(sum)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 px-2 text-center text-slate-500 italic">
                    Замовлення #{orderToPrint.order.id.slice(0, 8)} (загальний розрахунок на суму {formatCurrency(orderToPrint.order.totalAmount)})
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals & Summary */}
          <div className="flex justify-between items-start pt-2 border-t-2 border-slate-900 mb-8">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Всього найменувань: <span className="font-bold text-slate-900">{orderToPrint.items.length}</span></p>
              <p>
                Загальна кількість: <span className="font-bold text-slate-900">
                  {orderToPrint.items.reduce((acc, i) => acc + (Number(String(i.quantity).replace(',', '.')) || 0), 0)} шт.
                </span>
              </p>
            </div>
            <div className="w-72 bg-slate-900 text-white p-4 rounded-xl shadow-sm text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1">
                Разом до сплати:
              </span>
              <span className="text-2xl font-black text-white">{formatCurrency(orderToPrint.order.totalAmount)}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <p className="font-bold text-slate-800 mb-6">Відпустив (ПІБ, підпис):</p>
              <div className="border-b border-slate-400 w-3/4 mb-1"></div>
              <p className="text-[10px] text-slate-400">М.П. / Дата</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-6">Отримав (ПІБ, підпис):</p>
              <div className="border-b border-slate-400 w-3/4 mb-1"></div>
              <p className="text-[10px] text-slate-400">Претензій до кількості та зовнішнього вигляду не маю</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
