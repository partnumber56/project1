import fs from 'fs';

// 1. Fix index.css
let indexCss = fs.readFileSync('src/index.css', 'utf8');
indexCss = indexCss.replace(/@media print \{[\s\S]*?\}\s*\}/, '');
fs.writeFileSync('src/index.css', indexCss);

// 2. Fix App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('print:hidden') && appContent.includes('bg-slate-900 text-white flex flex-col fixed h-full z-30 transition-all"')) {
    appContent = appContent.replace(
        'className="bg-slate-900 text-white flex flex-col fixed h-full z-30 transition-all"',
        'className="bg-slate-900 text-white flex flex-col fixed h-full z-30 transition-all print:hidden"'
    );
    appContent = appContent.replace(
        '"flex-1 flex flex-col transition-all duration-300",',
        '"flex-1 flex flex-col transition-all duration-300 print:ml-0 print:w-full",'
    );
    appContent = appContent.replace(
        'className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20"',
        'className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 print:hidden"'
    );
    fs.writeFileSync('src/App.tsx', appContent);
}

// 3. Fix OrdersView.tsx
let ordersContent = fs.readFileSync('src/components/OrdersView.tsx', 'utf8');
if (!ordersContent.includes('print:hidden')) {
    ordersContent = ordersContent.replace(
        '<div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">',
        '<div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center print:hidden">'
    );
    ordersContent = ordersContent.replace(
        '<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">',
        '<div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print:hidden">'
    );
    ordersContent = ordersContent.replace(
        '<div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400">',
        '<div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 print:hidden">'
    );
    fs.writeFileSync('src/components/OrdersView.tsx', ordersContent);
}

// 4. Fix OrderDetailsModal.tsx
let modalContent = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');
if (modalContent.includes('className="fixed inset-0 z-50 flex items-center justify-center p-4"')) {
    modalContent = modalContent.replace(
        'className="fixed inset-0 z-50 flex items-center justify-center p-4"',
        'className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:p-0 print:block"'
    );
    modalContent = modalContent.replace(
        'className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"',
        'className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"'
    );
    modalContent = modalContent.replace(
        'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"',
        'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:h-auto print:shadow-none print:overflow-visible"'
    );
    modalContent = modalContent.replace(
        'className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 no-print"',
        'className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 print:hidden"'
    );
    modalContent = modalContent.replace(
        'className="flex-1 overflow-y-auto p-8 bg-slate-50/30"',
        'className="flex-1 overflow-y-auto p-8 bg-slate-50/30 print:hidden"'
    );
    fs.writeFileSync('src/components/OrderDetailsModal.tsx', modalContent);
}

console.log('Fixed print layout with Tailwind');
