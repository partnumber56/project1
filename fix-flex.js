import fs from 'fs';

let modalContent = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');
modalContent = modalContent.replace(
    'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:h-auto print:shadow-none print:overflow-visible"',
    'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:block print:h-auto print:shadow-none print:overflow-visible"'
);
fs.writeFileSync('src/components/OrderDetailsModal.tsx', modalContent);
console.log('Fixed flex to block for print');
