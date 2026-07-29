import fs from 'fs';

const files = [
  'src/components/CreateOrderModal.tsx',
  'src/components/CreateRequestModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Change type="number" to type="text" for price/quantity inputs
  content = content.replace(/<input type="number" value={item\.quantity}/g, '<input type="text" value={item.quantity}');
  content = content.replace(/<input type="number" value={item\.costPrice}/g, '<input type="text" value={item.costPrice}');
  content = content.replace(/<input type="number" value={item\.sellingPrice}/g, '<input type="text" value={item.sellingPrice}');
  // CreateRequestModal has `item.sellingPrice === 0 ? '' : item.sellingPrice`
  content = content.replace(/<input type="number" value={item\.sellingPrice === 0 \? '' : item\.sellingPrice}/g, '<input type="text" value={item.sellingPrice === 0 ? "" : item.sellingPrice}');
  content = content.replace(/<input type="number" value={item\.costPrice === 0 \? '' : item\.costPrice}/g, '<input type="text" value={item.costPrice === 0 ? "" : item.costPrice}');
  
  // CreateOrderModal updateItem calls:
  content = content.replace(/parseInt\(e\.target\.value\) \|\| 1/g, "e.target.value"); // let quantity be a string in state until saved

  // Update total calculations
  // Find `Number(item.sellingPrice)` and replace with `Number(String(item.sellingPrice).replace(',', '.'))`
  content = content.replace(/Number\(item\.sellingPrice\)/g, "Number(String(item.sellingPrice).replace(',', '.'))");
  content = content.replace(/Number\(item\.costPrice\)/g, "Number(String(item.costPrice).replace(',', '.'))");
  
  content = content.replace(/Number\(i\.sellingPrice\)/g, "Number(String(i.sellingPrice).replace(',', '.'))");
  content = content.replace(/Number\(i\.costPrice\)/g, "Number(String(i.costPrice).replace(',', '.'))");

  // Fix quantity multiplication
  content = content.replace(/i\.quantity/g, "Number(String(i.quantity).replace(',', '.'))");
  content = content.replace(/item\.quantity/g, "Number(String(item.quantity).replace(',', '.'))");

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}
