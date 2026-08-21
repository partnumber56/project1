import fs from 'fs';

let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

// The block to remove:
const carBlockRegex = /<div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Table \*\/\}/;
// Oh wait, I shouldn't remove the closing tag of the grid itself if I want to keep the grid.
// But better to replace the whole Client & Car Grid block for the print area.

const searchString = `          {/* Client & Car Grid */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Отримувач
              </h3>
              <p className="text-xl font-black text-slate-900 mb-1">{order.customerName}</p>
              <p className="font-bold text-slate-600">{order.customerPhone || 'Не вказано'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">
              <h3 className="text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2 justify-end">
                <Car className="w-3 h-3" /> Автомобіль
              </h3>
              <p className="text-lg font-black text-slate-900 mb-1">
                {order.carModel || '-'} {order.carYear ? \`(\${order.carYear})\` : ''}
              </p>
              <p className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{order.vin || 'VIN не вказано'}</p>
              <p className="text-[10px] uppercase font-black text-slate-400">{order.engineVolume ? \`Двигун: \${order.engineVolume}\` : ''}</p>
            </div>
          </div>`;

const replaceString = `          {/* Client Grid */}
          <div className="mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" /> Отримувач
              </h3>
              <p className="text-xl font-black text-slate-900 mb-1">{order.customerName}</p>
              <p className="font-bold text-slate-600">{order.customerPhone || 'Не вказано'}</p>
            </div>
          </div>`;

if (content.includes(searchString)) {
    content = content.replace(searchString, replaceString);
    fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
    console.log("Successfully removed car data from print area.");
} else {
    console.log("Could not find the target string.");
}
