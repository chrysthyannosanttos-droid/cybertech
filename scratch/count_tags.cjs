const fs = require('fs');
const code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

function countTags(code) {
  const openDiv = (code.match(/<div/g) || []).length;
  const closeDiv = (code.match(/<\/div>/g) || []).length;
  const openDialog = (code.match(/<Dialog(?!Content|Header|Title)/g) || []).length;
  const closeDialog = (code.match(/<\/Dialog>/g) || []).length;
  const openContent = (code.match(/<DialogContent/g) || []).length;
  const closeContent = (code.match(/<\/DialogContent>/g) || []).length;
  
  console.log(`div: ${openDiv} open, ${closeDiv} close (Diff: ${openDiv - closeDiv})`);
  console.log(`Dialog: ${openDialog} open, ${closeDialog} close (Diff: ${openDialog - closeDialog})`);
  console.log(`DialogContent: ${openContent} open, ${closeContent} close (Diff: ${openContent - closeContent})`);
}

countTags(code);
