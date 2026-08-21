import fs from 'fs';

let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

// 1. Update updateOrderStatus to deduct stock
const updateStatusSearch = `        // Handle Financial logic when Delivered
        if (newStatus === 'Delivered' && !currentOrder.isFinancialProcessed) {`;

const updateStatusReplace = `        // Handle Inventory Deduction
        if (newStatus === 'Delivered' && currentOrder.status !== 'Delivered') {
          for (const item of items) {
            if (item.productId) {
              const productRef = doc(db, 'products', item.productId);
              const productSnap = await transaction.get(productRef);
              if (productSnap.exists()) {
                const currentStock = productSnap.data().stock || 0;
                const newStock = Math.max(0, currentStock - Number(String(item.quantity).replace(',', '.')));
                transaction.update(productRef, { stock: newStock });
              }
            }
          }
        }

        // Handle Financial logic when Delivered
        if (newStatus === 'Delivered' && !currentOrder.isFinancialProcessed) {`;

if (content.includes(updateStatusSearch)) {
    content = content.replace(updateStatusSearch, updateStatusReplace);
    console.log("Updated updateOrderStatus with stock deduction.");
} else {
    console.log("Could not find updateOrderStatus logic.");
}

// 2. Replace the StatusButton grid with the new "Видати товар" button
const statusButtonsSearch = `                {/* Status Timeline / Transitions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-6">Змінити статус замовлення</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatusButton 
                      status="Pending" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Pending')} 
                      icon={<Clock className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Processing" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Processing')} 
                      icon={<Package className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Shipped" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Shipped')} 
                      icon={<Truck className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Delivered" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Delivered')} 
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    />
                    <StatusButton 
                      status="Cancelled" 
                      current={order.status} 
                      onClick={() => updateOrderStatus('Cancelled')} 
                      icon={<XCircle className="w-4 h-4" />}
                      isDangerous
                    />
                  </div>
                </div>`;

const statusButtonsReplace = `                {/* Issue Goods Button */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">Видача товару</h4>
                      <p className="text-sm text-slate-500">Списання товару зі складу та фіксація оплати</p>
                    </div>
                    {order.status !== 'Delivered' ? (
                      <button
                        onClick={() => updateOrderStatus('Delivered')}
                        disabled={isUpdating}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        <Package className="w-5 h-5" />
                        {isUpdating ? 'Обробка...' : 'Видати товар'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold border border-emerald-200">
                        <CheckCircle2 className="w-5 h-5" />
                        Товар видано
                      </div>
                    )}
                  </div>
                </div>`;

if (content.includes(statusButtonsSearch)) {
    content = content.replace(statusButtonsSearch, statusButtonsReplace);
    console.log("Replaced status buttons with Issue Goods button.");
} else {
    console.log("Could not find status buttons block.");
}

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
