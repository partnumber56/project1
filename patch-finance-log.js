import fs from 'fs';
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');

content = content.replace(
  "import { db, handleFirestoreError, OperationType } from '../firebase';",
  "import { db, handleFirestoreError, OperationType, logAdminAction } from '../firebase';"
);

content = content.replace(
  "transaction.delete(txRef);",
  "transaction.delete(txRef);\n        logAdminAction('DELETE_TRANSACTION', `Deleted transaction ${tx.id} for client ${clientData.name || tx.clientId}`, tx);"
);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched FinanceView with logging");
