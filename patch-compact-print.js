import fs from 'fs';

let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

// Header
content = content.replace(
  '<div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-10">',
  '<div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">'
);
content = content.replace(
  '<h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Накладна # {order.id.substring(0, 8).toUpperCase()}</h1>',
  '<h1 className="text-2xl font-black uppercase tracking-tighter mb-1">Накладна # {order.id.substring(0, 8).toUpperCase()}</h1>'
);
content = content.replace(
  '<h2 className="text-2xl font-black uppercase tracking-tight text-blue-600">Система PartNumber</h2>',
  '<h2 className="text-xl font-black uppercase tracking-tight text-blue-600">Система PartNumber</h2>'
);

// Grid
content = content.replace(
  '<div className="grid grid-cols-2 gap-16 mb-12">',
  '<div className="grid grid-cols-2 gap-8 mb-6">'
);
content = content.replace(
  '<div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">',
  '<div className="bg-slate-50 p-4 rounded-xl border border-slate-100">'
);
content = content.replace(
  '<div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-right">',
  '<div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">'
);

// Table
content = content.replace(
  '<table className="w-full mb-12 text-left border-collapse">',
  '<table className="w-full mb-6 text-left border-collapse">'
);
content = content.replace(
  '<th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Назва</th>',
  '<th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Назва</th>'
);
content = content.replace(
  '<th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500">Бренд</th>',
  '<th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Бренд</th>'
);
content = content.replace(
  '<th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Ціна продажу (₴)</th>',
  '<th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ціна продажу (₴)</th>'
);
content = content.replace(
  '<th className="py-5 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">Кількість</th>',
  '<th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Кількість</th>'
);

content = content.replace(
  '<td className="py-6 px-4 font-bold text-slate-900 text-sm">{item.productName || \'Запчастина\'}</td>',
  '<td className="py-2 px-2 font-bold text-slate-900 text-xs">{item.productName || \'Запчастина\'}</td>'
);
content = content.replace(
  '<td className="py-6 px-4 font-bold text-slate-900 text-sm">{item.brand || \'-\'}</td>',
  '<td className="py-2 px-2 font-bold text-slate-900 text-xs">{item.brand || \'-\'}</td>'
);
content = content.replace(
  '<td className="py-6 px-4 text-right font-bold text-sm text-slate-900">{formatCurrency(item.sellingPrice)}</td>',
  '<td className="py-2 px-2 text-right font-bold text-xs text-slate-900">{formatCurrency(item.sellingPrice)}</td>'
);
content = content.replace(
  '<td className="py-6 px-4 text-center font-black text-sm text-slate-900">{item.quantity}</td>',
  '<td className="py-2 px-2 text-center font-black text-xs text-slate-900">{item.quantity}</td>'
);

// Totals
content = content.replace(
  '<div className="flex justify-end pt-10 border-t-2 border-slate-900">',
  '<div className="flex justify-end pt-4 border-t-2 border-slate-900">'
);
content = content.replace(
  '<div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl text-white shadow-xl">',
  '<div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl text-white shadow-md">'
);

// Footer
content = content.replace(
  '<div className="mt-32 pt-16 border-t font-medium border-slate-100 italic text-xs text-slate-400 text-center flex flex-col gap-4">',
  '<div className="mt-8 pt-4 border-t font-medium border-slate-100 italic text-xs text-slate-400 text-center flex flex-col gap-2">'
);
content = content.replace(
  '<div className="flex justify-around mb-12 italic text-sm text-slate-900">',
  '<div className="flex justify-around mb-4 italic text-sm text-slate-900">'
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log('Compacted print area');
