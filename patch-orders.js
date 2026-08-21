import fs from 'fs';

let content = fs.readFileSync('src/components/OrdersView.tsx', 'utf8');

content = content.replace(
  /<div className="space-y-6">/,
  '<div className="space-y-6 print:block">'
);

// We want to hide everything inside OrdersView except the modal. 
// A simple way is to add a wrapper around the non-modal content.
// But we can also just use print:hidden on the direct children and print:block on the modal.
// Let's just find the first div inside space-y-6 (the Search & Filter div)
content = content.replace(
  /<div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">/,
  '<div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center print:hidden">'
);

// The grid of orders
content = content.replace(
  /<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">/,
  '<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print:hidden">'
);

// empty state
content = content.replace(
  /<div className="text-center py-20 bg-white rounded-2xl border border-slate-200">/,
  '<div className="text-center py-20 bg-white rounded-2xl border border-slate-200 print:hidden">'
);

fs.writeFileSync('src/components/OrdersView.tsx', content);
console.log('Patched OrdersView.tsx');
