import fs from 'fs';
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

const target = "      setIsUpdating(false);\n    }\n  };\n\n  const updateItemStatus = async";
const replacement = "      logAdminAction('STATUS_UPDATE', `Updated order ${order.id} status to ${newStatus}`, { orderId: order.id, status: newStatus });\n      setIsUpdating(false);\n    }\n  };\n\n  const updateItemStatus = async";
content = content.replace(target, replacement);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched OrderDetailsModal with status logging");
