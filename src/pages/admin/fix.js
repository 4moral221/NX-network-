const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminPortal.tsx.bak', 'utf8');

// 1. Remove 'deliveries' from Section type and arrays
content = content.replace(/ \| 'deliveries'/g, '');
content = content.replace(/'deliveries', /g, '');
content = content.replace(/\|\| activeSection === 'deliveries' /g, '');
content = content.replace(/ activeSection === 'deliveries' \|\|/g, '');

// 2. We want to remove the block mapping 'deliveries' in invoices
// It starts with `{activeSection === 'deliveries' && getFilteredData(invoices, 'deliveries').map((inv, i) => {`
const startStr = "{activeSection === 'deliveries' && getFilteredData(invoices, 'deliveries').map((inv, i) => {";
const startIndex = content.indexOf(startStr);

if (startIndex !== -1) {
  // Find the exact matching closing "})}"
  let bracketCount = 1; // start after the first `{`
  let ptr = startIndex + 1;
  while (bracketCount > 0 && ptr < content.length) {
    if (content[ptr] === '{') bracketCount++;
    if (content[ptr] === '}') bracketCount--;
    ptr++;
  }
  const endIndex = ptr;
  
  if (bracketCount === 0) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    content = before + after;
  }
}

// 3. We also want to remove case 'deliveries': from getFilteredData
content = content.replace(/case 'deliveries':\s*/g, '');


fs.writeFileSync('src/pages/admin/AdminPortal.tsx', content);
