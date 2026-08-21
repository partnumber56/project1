import fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');
content = content.replace(
  'allow write: if false;',
  'allow update: if isAdmin(); allow delete: if isAdmin();'
);
fs.writeFileSync('firestore.rules', content);
console.log("Patched rules");
