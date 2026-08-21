import fs from 'fs';

let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

const searchStr = `          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">Накладна # {order.id.substring(0, 8).toUpperCase()}</h1>
              <p className="text-slate-500 font-bold flex items-center gap-2">
                Дата: {new Date().toLocaleDateString('uk-UA')}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black uppercase tracking-tight text-blue-600">Система PartNumber</h2>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Автоматизований облік СТО</p>
            </div>
          </div>

          {/* Client Grid */}
          <div className="mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Отримувач
              </h3>
              <p className="text-xl font-black text-slate-900 mb-1">{order.customerName}</p>
              <p className="font-bold text-slate-600">{order.customerPhone || 'Не вказано'}</p>
            </div>
          </div>`;

const replaceStr = `          {/* Invoice Header */}
          <div className="mb-6 pb-4 border-b-2 border-slate-900">
            <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">Накладна від {new Date().toLocaleDateString('uk-UA')}</h1>
            <p className="text-sm font-medium text-slate-600">
              <span className="font-bold text-slate-900">Клієнт:</span> {order.customerName} {order.customerPhone ? \`, \${order.customerPhone}\` : ''}
            </p>
          </div>`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
    console.log("Successfully replaced header.");
} else {
    console.log("Could not find the target string.");
}
