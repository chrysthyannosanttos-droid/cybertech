const fs = require('fs');
const code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const lines = code.split('\n');

let balance = 0;
lines.forEach((line, i) => {
  const opens = (line.match(/<div(?![a-zA-Z])/g) || []).length;
  const selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  
  const delta = (opens - selfCloses) - closes;
  if (delta !== 0) {
    balance += delta;
    console.log(`L${i+1} [${delta > 0 ? '+' : ''}${delta}] Bal:${balance} | ${line.trim()}`);
  }
});
