import fs from 'fs';
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');

const logic = `  const handleDeleteTransaction = async (tx: FinancialTransaction) => {
    if (userRole !== 'admin') return;
    if (!window.confirm('Ви впевнені, що хочете видалити цю транзакцію? Баланс клієнта буде перераховано.')) return;
    try {
      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'clients', tx.clientId);
        const txRef = doc(db, \`clients/\${tx.clientId}/transactions\`, tx.id);
        
        const clientSnap = await transaction.get(clientRef);
        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          const newBalance = (clientData.balance || 0) - tx.amount;
          transaction.update(clientRef, { balance: newBalance });
        }
        transaction.delete(txRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };

  const handleAddTransaction`;

content = content.replace("  const handleAddTransaction", logic);
fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Added handleDeleteTransaction logic");
