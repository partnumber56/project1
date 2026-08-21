import fs from 'fs';
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');

const deleteLogic = `  const handleDeleteTransaction = async (tx: FinancialTransaction) => {
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

  const handleAddClient`;

content = content.replace("  const handleAddClient", deleteLogic);

// Add delete button in transaction list
const renderTransactionRowSearch = `<div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-bold text-slate-900">{tx.description}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                            tx.type === 'Payment' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            tx.type === 'Refund' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            tx.type === 'Order' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          )}>
                            {tx.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">`;

const renderTransactionRowReplace = `<div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-bold text-slate-900">{tx.description}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                            tx.type === 'Payment' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            tx.type === 'Refund' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            tx.type === 'Order' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          )}>
                            {tx.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => handleDeleteTransaction(tx)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                            title="Видалити транзакцію"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}`;

if (content.includes(renderTransactionRowSearch)) {
    content = content.replace(renderTransactionRowSearch, renderTransactionRowReplace);
    console.log("Added delete button for transactions");
} else {
    console.log("Could not find transaction row");
}

fs.writeFileSync('src/components/FinanceView.tsx', content);
