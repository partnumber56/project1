import fs from 'fs';
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');

const txStateSearch = `  const [txDesc, setTxDesc] = useState('');`;
const txStateReplace = `  const [txDesc, setTxDesc] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);`;
content = content.replace(txStateSearch, txStateReplace);

const txDeleteLogicSearch = `    if (!window.confirm('Ви впевнені, що хочете видалити цю транзакцію? Баланс клієнта буде перераховано.')) return;`;
const txDeleteLogicReplace = ``;
content = content.replace(txDeleteLogicSearch, txDeleteLogicReplace);

const txButtonSearch = `                            <button 
                              onClick={() => handleDeleteTransaction(tx)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                              title="Видалити транзакцію"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>`;
const txButtonReplace = `                            {confirmDeleteId === tx.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDeleteTransaction(tx)}
                                  className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 px-2 py-1 rounded border border-rose-200 hover:bg-rose-100"
                                >
                                  Підтвердити
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100"
                                >
                                  Скасувати
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setConfirmDeleteId(tx.id)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                title="Видалити транзакцію"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}`;
content = content.replace(txButtonSearch, txButtonReplace);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched FinanceView confirm");
