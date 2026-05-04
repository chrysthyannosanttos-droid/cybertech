const parser = require('@babel/parser');
const fs = require('fs');

function checkFile(path) {
  const code = fs.readFileSync(path, 'utf8');
  try {
    parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    console.log(`✅ ${path} parsed successfully!`);
  } catch (err) {
    console.error(`❌ Error found in ${path}:`);
    console.error(`Line: ${err.loc.line}, Column: ${err.loc.column}`);
    console.error(err.message);
    const lines = code.split('\n');
    const start = Math.max(0, err.loc.line - 5);
    const end = Math.min(lines.length, err.loc.line + 5);
    for (let i = start; i < end; i++) {
      const marker = i === err.loc.line - 1 ? ' > ' : '   ';
      console.log(`${marker}${i + 1}: ${lines[i]}`);
    }
  }
}

checkFile('src/App.tsx');
checkFile('src/pages/EmployeeLogin.tsx');
checkFile('src/pages/Dashboard.tsx');
