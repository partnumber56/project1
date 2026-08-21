import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "{activeView === 'orders' && <OrdersView />}",
  "{activeView === 'orders' && <OrdersView userRole={userRole} />}"
);
content = content.replace(
  "{activeView === 'finance' && <FinanceView />}",
  "{activeView === 'finance' && <FinanceView userRole={userRole} />}"
);
content = content.replace(
  "{activeView === 'clients' && <ClientsView />}",
  "{activeView === 'clients' && <ClientsView />}"
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx");
