import fs from 'fs';
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');

// The thead part:
const theadSearch = `                      <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Сума</th>
                    </tr>`;
const theadReplace = `                      <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Сума</th>
                      {userRole === 'admin' && <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Дія</th>}
                    </tr>`;
content = content.replace(theadSearch, theadReplace);

// The tbody part:
const tbodySearch = `                        <td className={cn(
                          "px-4 py-4 text-right font-black",
                          tx.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </td>
                      </tr>`;

const tbodyReplace = `                        <td className={cn(
                          "px-4 py-4 text-right font-black",
                          tx.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </td>
                        {userRole === 'admin' && (
                          <td className="px-4 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteTransaction(tx)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                              title="Видалити транзакцію"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>`;

content = content.replace(tbodySearch, tbodyReplace);

const colspanSearch = `<td colSpan={3} className="py-24 text-center text-slate-400 italic font-medium">`;
const colspanReplace = `<td colSpan={userRole === 'admin' ? 4 : 3} className="py-24 text-center text-slate-400 italic font-medium">`;
content = content.replace(colspanSearch, colspanReplace);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched FinanceView table");
