import fs from 'fs';

let content = fs.readFileSync('src/components/CreateOrderModal.tsx', 'utf8');

// We need to remove the stock deduction logic from order creation
const stockDeductionSearch = `          // Update stock if we have a productId
          if (item.productId) {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              const newStock = Math.max(0, currentStock - Number(String(item.quantity).replace(',', '.')));
              transaction.update(productRef, { stock: newStock });
            }
          }`;

if (content.includes(stockDeductionSearch)) {
    content = content.replace(stockDeductionSearch, '');
    fs.writeFileSync('src/components/CreateOrderModal.tsx', content);
    console.log("Removed stock deduction from CreateOrderModal.tsx");
} else {
    console.log("Could not find stock deduction in CreateOrderModal.tsx");
}
