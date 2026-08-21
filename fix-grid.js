import fs from 'fs';

let ordersContent = fs.readFileSync('src/components/OrdersView.tsx', 'utf8');
ordersContent = ordersContent.replace(
    '<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">',
    '<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden">'
);
fs.writeFileSync('src/components/OrdersView.tsx', ordersContent);
console.log('Fixed grid in OrdersView');
