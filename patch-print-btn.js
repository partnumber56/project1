import fs from 'fs';
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

content = content.replace(
  /const handlePrint = \(\) => \{\s*window\.print\(\);\s*\};/,
  `const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => {
      window.print();
    }, 100);
  };`
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched print button");
