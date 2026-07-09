import fs from 'fs';

const path = 'src/pages/admin/AdminPortal.tsx';
let content = fs.readFileSync(path, 'utf8');

if(!content.includes("import toast from 'react-hot-toast';")) {
  content = content.replace(/import \{ cn \} from '@\/src\/lib\/utils';/, "import { cn } from '@/src/lib/utils';\nimport toast, { Toaster } from 'react-hot-toast';");
}

if(!content.includes('<Toaster position="top-right" />')) {
  content = content.replace(/<div className="flex h-screen overflow-hidden bg-white text-\[\#1a1d23\] font-sans">/, '<div className="flex h-screen overflow-hidden bg-white text-[#1a1d23] font-sans">\n      <Toaster position="top-right" />');
  content = content.replace(/<div className="flex h-screen bg-gray-50 overflow-hidden text-\[\#1a1d23\] font-sans">/, '<div className="flex h-screen bg-gray-50 overflow-hidden text-[#1a1d23] font-sans">\n      <Toaster position="top-right" />');
  content = content.replace(/<div className="flex h-screen overflow-hidden text-\[\#1a1d23\] font-sans">/, '<div className="flex h-screen overflow-hidden text-[#1a1d23] font-sans">\n      <Toaster position="top-right" />');
}

let changed = true;
while (changed) {
  changed = false;
  
  const okMatch = content.match(/alert\((['"`])(.*?)(['"`])\)/);
  if(okMatch && (okMatch[2].toLowerCase().includes('success') || okMatch[2].toLowerCase().includes('complete') || okMatch[2].toLowerCase().includes('approved') || okMatch[2].toLowerCase().includes('assigned') || okMatch[2].toLowerCase().includes('live'))) {
     content = content.replace(okMatch[0], `toast.success(${okMatch[1]}${okMatch[2]}${okMatch[3]})`);
     changed = true;
     continue;
  }

  const failedMatch = content.match(/alert\(([^)]*)\)/);
  if (failedMatch) {
    if(failedMatch[1].toLowerCase().includes('error') || failedMatch[1].toLowerCase().includes('fail') || failedMatch[1].toLowerCase().includes('missing') || failedMatch[1].toLowerCase().includes('invalid')) {
       content = content.replace(failedMatch[0], `toast.error(${failedMatch[1]})`);
    } else {
       content = content.replace(failedMatch[0], `toast.success(${failedMatch[1]})`);
    }
    changed = true;
  }
}

fs.writeFileSync(path, content);
console.log("Alerts replaced.");
