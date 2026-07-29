import fs from 'fs';

const file = 'src/components/CreateOrderModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const stateVarInsert = `
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isPastingList, setIsPastingList] = useState(false);
  const [pasteText, setPasteText] = useState('');
  
  const handleParseList = () => {
    const lines = pasteText.split('\\n');
    const newItems = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.endsWith(':')) continue;
      
      let qty = 1;
      let partNumber = '';
      let name = trimmed;
      
      const qtyMatch = name.match(/(\\d+)\\s*шт\\.?/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
        name = name.replace(qtyMatch[0], '').trim();
      }
      
      const words = name.split(/\\s+/);
      const partMatch = words.find(w => /^[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(w) || (/^[A-Za-z0-9]{8,}$/.test(w) && /\\d/.test(w)));
      
      if (partMatch) {
        partNumber = partMatch;
        name = name.replace(partMatch, '').trim();
      }
      
      name = name.replace(/^[-.,]+|[-.,]+$/g, '').trim();
      
      newItems.push({
        id: Date.now().toString() + Math.random().toString(),
        partNumber: partNumber.toUpperCase(),
        brand: '',
        productName: name || 'Запчастина',
        quantity: qty,
        costPrice: '',
        sellingPrice: '',
        supplier: '',
        status: 'Pending'
      });
    }
    
    if (newItems.length > 0) {
      const filteredItems = items.filter(i => i.partNumber || i.productName);
      setItems([...filteredItems, ...newItems]);
    }
    
    setIsPastingList(false);
    setPasteText('');
  };
`;

content = content.replace('const [isSubmitting, setIsSubmitting] = useState(false);', stateVarInsert);

const tableHeaderSearch = `Позиції замовлення
                    </h4>
                    <button type="button" onClick={addNewRow} className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-4 h-4" />
                      Додати рядок
                    </button>
                  </div>`;

const tableHeaderReplace = `Позиції замовлення
                    </h4>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setIsPastingList(!isPastingList)} className={cn("flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors", isPastingList ? "bg-emerald-50 text-emerald-700" : "text-emerald-600 hover:bg-emerald-50")}>
                        <ClipboardList className="w-4 h-4" />
                        {isPastingList ? 'Сховати' : 'Вставити список'}
                      </button>
                      <button type="button" onClick={addNewRow} className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                        Додати рядок
                      </button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isPastingList && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 bg-emerald-50/50 border-b border-slate-100 space-y-3">
                          <label className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                            Швидке додавання текстом
                            <span className="text-[10px] font-medium normal-case opacity-70 bg-emerald-100 px-2 py-0.5 rounded-full">З Viber або Telegram</span>
                          </label>
                          <textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Вставте список запчастин (напр: 12290rwca01 4шт)"
                            className="w-full h-32 p-4 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-y"
                          />
                          <div className="flex justify-end">
                            <button type="button" onClick={handleParseList} disabled={!pasteText.trim()} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2">
                              <ClipboardList className="w-4 h-4" />
                              Обробити список
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>`;

content = content.replace(tableHeaderSearch, tableHeaderReplace);

fs.writeFileSync(file, content);
console.log('done CreateOrderModal');
