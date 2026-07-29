import fs from 'fs';

const files = [
  'src/components/OrderDetailsModal.tsx',
  'src/components/RequestDetailsModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix total calculations in update functions
  content = content.replace(/Number\(i\.sellingPrice\)/g, "Number(String(i.sellingPrice).replace(',', '.'))");
  content = content.replace(/Number\(i\.costPrice\)/g, "Number(String(i.costPrice).replace(',', '.'))");
  content = content.replace(/Number\(i\.quantity\)/g, "Number(String(i.quantity).replace(',', '.'))");

  // Fix inline reduce inside the JSX markup (Прибуток)
  content = content.replace(/\(i\.sellingPrice - i\.costPrice\) \* i\.quantity/g, 
    "(Number(String(i.sellingPrice).replace(',', '.')) - Number(String(i.costPrice).replace(',', '.'))) * Number(String(i.quantity).replace(',', '.'))");

  content = content.replace(/Number\(item\.sellingPrice\)/g, "Number(String(item.sellingPrice).replace(',', '.'))");
  content = content.replace(/Number\(item\.costPrice\)/g, "Number(String(item.costPrice).replace(',', '.'))");
  content = content.replace(/Number\(item\.quantity\)/g, "Number(String(item.quantity).replace(',', '.'))");

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}
