import fs from 'fs';

let content = fs.readFileSync('src/index.css', 'utf8');

content = content.replace(/@media print \{[\s\S]*?\}/, `@media print {
    body * {
      visibility: hidden;
    }
    #print-area, #print-area * {
      visibility: visible;
    }
    #print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: auto !important;
      overflow: visible !important;
    }
    html, body, #root {
      height: auto !important;
      overflow: visible !important;
      position: static !important;
    }
    .no-print {
      display: none !important;
    }
  }`);

fs.writeFileSync('src/index.css', content);
console.log('Patched index.css');
