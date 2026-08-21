import fs from 'fs';
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

const orderStateSearch = `  const [isUpdating, setIsUpdating] = useState(false);`;
const orderStateReplace = `  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);`;
content = content.replace(orderStateSearch, orderStateReplace);

const orderDeleteLogicSearch = `    if (!window.confirm('Ви впевнені, що хочете видалити це замовлення? Всі пов\\'язані позиції також будуть видалені. Ця дія незворотня.')) return;`;
const orderDeleteLogicReplace = ``;
content = content.replace(orderDeleteLogicSearch, orderDeleteLogicReplace);

const orderButtonSearch = `              {userRole === 'admin' && (
                <button 
                  onClick={handleDeleteOrder}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-rose-600 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                  title="Видалити замовлення"
                >
                  <Trash2 className="w-4 h-4" />
                  Видалити
                </button>
              )}`;
const orderButtonReplace = `              {userRole === 'admin' && (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDeleteOrder}
                      className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      Підтвердити
                    </button>
                    <button 
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                      Скасувати
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-rose-600 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                    title="Видалити замовлення"
                  >
                    <Trash2 className="w-4 h-4" />
                    Видалити
                  </button>
                )
              )}`;
content = content.replace(orderButtonSearch, orderButtonReplace);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched OrderDetailsModal confirm");
