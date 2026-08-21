import fs from 'fs';
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

const stateSearch = `  const [isImporting, setIsImporting] = useState(false);`;
const stateReplace = `  const [isImporting, setIsImporting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);`;
content = content.replace(stateSearch, stateReplace);

const logicSearch = `  const handleDelete = async (id: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цей товар?')) return;`;
const logicReplace = `  const handleDelete = async (id: string) => {`;
content = content.replace(logicSearch, logicReplace);

const buttonSearch = `                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>`;
const buttonReplace = `                      {confirmDeleteId === product.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { handleDelete(product.id); setConfirmDeleteId(null); }}
                            className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 px-2 py-1 rounded border border-rose-200 hover:bg-rose-100"
                          >
                            Видалити
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100"
                          >
                            Відміна
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(product.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}`;
content = content.replace(buttonSearch, buttonReplace);

fs.writeFileSync('src/components/InventoryView.tsx', content);
console.log("Patched InventoryView confirm");
