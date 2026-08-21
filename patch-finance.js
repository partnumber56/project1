import fs from 'fs';
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');

if (!content.includes("deleteDoc")) {
  content = content.replace("  runTransaction,\n  doc\n} from 'firebase/firestore';", "  runTransaction,\n  doc,\n  deleteDoc\n} from 'firebase/firestore';");
}

if (!content.includes("Trash2")) {
  content = content.replace("  Phone\n} from 'lucide-react';", "  Phone,\n  Trash2\n} from 'lucide-react';");
}

if (!content.includes("userRole?: string | null")) {
  content = content.replace("export default function FinanceView() {", "export default function FinanceView({ userRole }: { userRole?: string | null }) {");
}

const handleDeleteTransaction = `
  const handleDeleteTransaction = async (tx: FinancialTransaction) => {
    if (userRole !== 'admin') return;
    if (!window.confirm('Ви впевнені, що хочете видалити цю транзакцію? Баланс клієнта буде перераховано.')) return;
    try {
      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'clients', tx.clientId);
        const txRef = doc(db, \`clients/\${tx.clientId}/transactions\`, tx.id);
        
        const clientSnap = await transaction.get(clientRef);
        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          // Revert the transaction effect on balance and turnover
          // tx.amount is positive for Payment, negative for Order
          const newBalance = (clientData.balance || 0) - tx.amount;
          let newTurnover = clientData.totalTurnover || 0;
          if (tx.type === 'Payment') {
             // If we remove a payment, it shouldn't really affect turnover, but originally adding payment might have?
             // Actually, usually turnover is only for Orders. Wait, let's check how handleAddTransaction does it.
          }
          
          transaction.update(clientRef, { balance: newBalance });
        }
        transaction.delete(txRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };
`;

// wait, let's check what handleAddTransaction does first.
