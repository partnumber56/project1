import fs from 'fs';
let content = fs.readFileSync('src/components/OrdersView.tsx', 'utf8');

content = content.replace(
  'export default function OrdersView() {',
  'export default function OrdersView({ userRole }: { userRole?: string | null }) {'
);

content = content.replace(
  '<OrderDetailsModal \n        order={selectedOrder} \n        onClose={() => setSelectedOrder(null)} \n      />',
  '<OrderDetailsModal \n        order={selectedOrder} \n        onClose={() => setSelectedOrder(null)}\n        userRole={userRole}\n      />'
);
// Also single line replace just in case:
content = content.replace(
  '<OrderDetailsModal \n        order={selectedOrder} \n        onClose={() => setSelectedOrder(null)} \n      />',
  '<OrderDetailsModal \n        order={selectedOrder} \n        onClose={() => setSelectedOrder(null)}\n        userRole={userRole}\n      />'
);

fs.writeFileSync('src/components/OrdersView.tsx', content);
console.log("Patched OrdersView");
