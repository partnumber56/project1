import fs from 'fs';
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

content = content.replace(
  "import { db, handleFirestoreError, OperationType } from '../firebase';",
  "import { db, handleFirestoreError, OperationType, logAdminAction } from '../firebase';"
);

content = content.replace(
  "await deleteDoc(doc(db, path, id));",
  "await deleteDoc(doc(db, path, id));\n      logAdminAction('DELETE_PRODUCT', `Deleted product with ID ${id}`, { productId: id });"
);

fs.writeFileSync('src/components/InventoryView.tsx', content);
console.log("Patched InventoryView with logging");
