import fs from 'fs';

let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

// Fix wrapper
content = content.replace(
  /<div className="fixed inset-0 z-50 flex items-center justify-center p-4">/,
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:block print:p-0 print:bg-white print:overflow-visible print:h-auto print:w-full">'
);

// Fix backdrop
content = content.replace(
  /className="absolute inset-0 bg-slate-900\/60 backdrop-blur-sm"/,
  'className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"'
);

// Fix main modal
content = content.replace(
  /className="relative bg-white w-full h-\[90vh\] rounded-3xl shadow-2xl flex flex-col overflow-hidden"/,
  'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:hidden"'
);

// Fix print area structure
const oldTableStr = `<th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Позиція / Артикул</th>
                <th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">К-ть</th>
                <th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Ціна (₴)</th>
                <th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Сума (₴)</th>`;

const newTableStr = `<th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Назва</th>
                <th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Бренд</th>
                <th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Ціна продажу (₴)</th>
                <th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">Кількість</th>`;

content = content.replace(oldTableStr, newTableStr);

const oldRowStr = `<td className="py-6 px-4">
                    <p className="font-bold text-slate-900 text-sm mb-1">{index + 1}. {item.productName || 'Запчастина'}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {item.partNumber || '-'} {item.brand ? \`/ \${item.brand}\` : ''}
                    </p>
                  </td>
                  <td className="py-6 px-4 text-center font-black text-sm text-slate-900">{item.quantity}</td>
                  <td className="py-6 px-4 text-right font-bold text-sm text-slate-900">{formatCurrency(item.sellingPrice)}</td>
                  <td className="py-6 px-4 text-right font-black text-sm text-slate-900">{formatCurrency(item.sellingPrice * item.quantity)}</td>`;

const newRowStr = `<td className="py-6 px-4 font-bold text-slate-900 text-sm">{item.productName || 'Запчастина'}</td>
                  <td className="py-6 px-4 font-bold text-slate-900 text-sm">{item.brand || '-'}</td>
                  <td className="py-6 px-4 text-right font-bold text-sm text-slate-900">{formatCurrency(item.sellingPrice)}</td>
                  <td className="py-6 px-4 text-center font-black text-sm text-slate-900">{item.quantity}</td>`;

content = content.replace(oldRowStr, newRowStr);

// Let's also check if print-area class has what we need
content = content.replace(
  /<div id="print-area" className="hidden print:block p-10 bg-white min-h-screen text-slate-900">/,
  '<div id="print-area" className="hidden print:block p-10 bg-white min-h-screen text-slate-900 print:absolute print:inset-0 print:w-full print:h-auto print:overflow-visible">'
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log('Patched print in OrderDetailsModal.tsx');
