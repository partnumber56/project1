import fs from 'fs';
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

const handleDeleteOrderLogic = `  const handleDeleteOrder = async () => {
    if (!order || userRole !== 'admin') return;
    if (!window.confirm('Ви впевнені, що хочете видалити це замовлення? Всі пов\\'язані позиції також будуть видалені. Ця дія незворотня.')) return;
    try {
      setIsUpdating(true);
      // Delete all items first
      const itemsSnapshot = await getDocs(collection(db, \`orders/\${order.id}/items\`));
      const deleteItemPromises = itemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteItemPromises);
      
      // Delete the order itself
      await deleteDoc(doc(db, 'orders', order.id));
      
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
      setIsUpdating(false);
    }
  };

  const createNewClient`;

if (content.includes("  const createNewClient")) {
    content = content.replace("  const createNewClient", handleDeleteOrderLogic);
}

const deleteButton = `
              {userRole === 'admin' && (
                <button 
                  onClick={handleDeleteOrder}
                  className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-rose-600 hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                  title="Видалити замовлення"
                >
                  <Trash2 className="w-4 h-4" />
                  Видалити
                </button>
              )}
            </div>
            <button onClick={onClose}`;

content = content.replace("            </div>\n            <button onClick={onClose}", deleteButton);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched OrderDetailsModal for delete");
