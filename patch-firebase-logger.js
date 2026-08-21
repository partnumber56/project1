import fs from 'fs';
let content = fs.readFileSync('src/firebase.ts', 'utf8');

const logFn = `import { getFirestore, doc, getDocFromCache, getDocFromServer, collection, addDoc, serverTimestamp } from 'firebase/firestore';`;
content = content.replace(`import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';`, logFn);

const logImpl = `
export async function logAdminAction(actionType: string, description: string, details?: any) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(db, 'systemLogs'), {
      adminId: auth.currentUser.uid,
      adminEmail: auth.currentUser.email,
      actionType,
      description,
      details: details || {},
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to write admin log:', error);
  }
}
`;

content += logImpl;
fs.writeFileSync('src/firebase.ts', content);
console.log("Patched firebase.ts with logger");
