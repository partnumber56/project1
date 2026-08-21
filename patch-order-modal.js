import fs from 'fs';
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

content = content.replace(
  'interface OrderDetailsModalProps {\n  order: Order | null;\n  onClose: () => void;\n}',
  'interface OrderDetailsModalProps {\n  order: Order | null;\n  onClose: () => void;\n  userRole?: string | null;\n}'
);

content = content.replace(
  'export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {',
  'export default function OrderDetailsModal({ order, onClose, userRole }: OrderDetailsModalProps) {'
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched OrderDetailsModal props");
