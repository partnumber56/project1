import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// fix sidebar
content = content.replace(
  /<motion.aside[\s\S]*?className="bg-slate-900 text-white flex flex-col fixed h-full z-30 transition-all"/,
  match => match.replace('className="', 'className="print:hidden ')
);

// fix main
content = content.replace(
  /<main className={cn\([\s\S]*?"flex-1 flex flex-col transition-all duration-300",/,
  match => match.replace('"flex-1 flex flex-col transition-all duration-300",', '"flex-1 flex flex-col transition-all duration-300 print:ml-0 print:w-full",')
);

// fix header
content = content.replace(
  /<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">/,
  '<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 print:hidden">'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx');
