import fs from 'fs';

const path = 'src/pages/admin/AdminPortal.tsx';
let content = fs.readFileSync(path, 'utf8');

if(!content.includes("import toast from 'react-hot-toast';") && !content.includes("import toast, { Toaster }")) {
  content = content.replace(/import \{ cn \} from '@\/src\/lib\/utils';/, "import { cn } from '@/src/lib/utils';\nimport toast, { Toaster } from 'react-hot-toast';");
}

if(!content.includes('<Toaster position="top-right" />')) {
  content = content.replace(/<div className="flex h-screen bg-\[\#060810\] text-\[\#e2e8f8\] font-sans selection:bg-\[\#00ff88\] selection:text-black">/, '<div className="flex h-screen bg-[#060810] text-[#e2e8f8] font-sans selection:bg-[#00ff88] selection:text-black">\n      <Toaster position="top-right" />');
}

fs.writeFileSync(path, content);
console.log("Added Toaster.");
