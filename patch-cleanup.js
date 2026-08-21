import fs from 'fs';

// Clean App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace('print:hidden bg-slate-900', 'bg-slate-900');
appContent = appContent.replace('transition-all duration-300 print:ml-0 print:w-full', 'transition-all duration-300');
appContent = appContent.replace('sticky top-0 z-20 print:hidden', 'sticky top-0 z-20');
fs.writeFileSync('src/App.tsx', appContent);

// Clean OrdersView.tsx
let ordersContent = fs.readFileSync('src/components/OrdersView.tsx', 'utf8');
ordersContent = ordersContent.replace('space-y-6 print:block', 'space-y-6');
ordersContent = ordersContent.replace('items-center print:hidden', 'items-center');
ordersContent = ordersContent.replace('gap-4 print:hidden', 'gap-4');
ordersContent = ordersContent.replace('border-slate-200 print:hidden', 'border-slate-200');
fs.writeFileSync('src/components/OrdersView.tsx', ordersContent);

// Clean OrderDetailsModal.tsx
let modalContent = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');
modalContent = modalContent.replace(
  /className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:block print:p-0 print:bg-white print:overflow-visible print:h-auto print:w-full"/,
  'className="fixed inset-0 z-50 flex items-center justify-center p-4"'
);
modalContent = modalContent.replace(
  /className="absolute inset-0 bg-slate-900\/60 backdrop-blur-sm print:hidden"/,
  'className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"'
);
modalContent = modalContent.replace(
  /className="relative bg-white w-full h-\[90vh\] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:hidden"/,
  'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"'
);

// The #print-area is what we want visible. We shouldn't use print: classes, just basic classes, and let CSS handle print.
// But we should hide it when NOT printing. So `hidden print:block` is good.
modalContent = modalContent.replace(
  /className="hidden print:block p-10 bg-white min-h-screen text-slate-900 print:static print:w-full print:h-auto print:overflow-visible"/,
  'className="hidden print:block p-10 bg-white min-h-screen text-slate-900"'
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', modalContent);
console.log("Cleanup complete");
