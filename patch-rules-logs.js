import fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');

const logRule = `    match /systemLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isSignedIn();
      allow update, delete: if false;
    }
  }
}`;

content = content.replace(/  }\n}$/, logRule);
fs.writeFileSync('firestore.rules', content);
console.log("Patched rules for systemLogs");
