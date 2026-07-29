import fs from 'fs';

const files = [
  'src/components/OrderDetailsModal.tsx',
  'src/components/RequestDetailsModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Find the start of the component body to insert the calculated totals
  const funcMatch = content.match(/export default function \w+\([^)]*\) \{/);
  
  if (funcMatch) {
    const calcStr = `
  const calculatedTotal = items.reduce((acc, i) => acc + (Number(String(i.sellingPrice).replace(',', '.')) * Number(String(i.quantity).replace(',', '.'))), 0);
  const calculatedProfit = items.reduce((acc, i) => acc + (Number(String(i.sellingPrice).replace(',', '.')) - Number(String(i.costPrice).replace(',', '.'))) * Number(String(i.quantity).replace(',', '.')), 0);
`;
    // Insert after state declarations, but let's just insert it before `const handleCopy`
    content = content.replace(/const handleCopyToGemini = \(\) => \{/, calcStr + '\n  const handleCopyToGemini = () => {');
    content = content.replace(/const handleCopy = \(\) => \{/, calcStr + '\n  const handleCopy = () => {');
  }

  // Replace order.totalAmount and order.totalProfit with calculated equivalents in JSX and formatCurrency
  content = content.replace(/order\.totalAmount/g, 'calculatedTotal');
  content = content.replace(/request\.totalAmount/g, 'calculatedTotal');
  content = content.replace(/currentOrder\.totalAmount/g, 'calculatedTotal');

  content = content.replace(/order\.totalProfit/g, 'calculatedProfit');
  content = content.replace(/request\.totalProfit/g, 'calculatedProfit');

  fs.writeFileSync(file, content);
  console.log('Patched totals in', file);
}
