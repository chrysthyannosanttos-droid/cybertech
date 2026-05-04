const fs = require('fs');
const code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const lines = code.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div(?![a-zA-Z])/g) || []).length;
  const selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  
  const delta = (opens - selfCloses) - closes;
  balance += delta;
  
  if (delta !== 0) {
    console.log(`Line ${i + 1}: Delta ${delta}, Balance ${balance} | ${line.trim()}`);
  }
}

console.log(`Final Balance: ${balance}`);
