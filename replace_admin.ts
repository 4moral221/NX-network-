import fs from 'fs';

const path = 'src/pages/admin/AdminPortal.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);')) {
  // Add state
  content = content.replace(/const \[isLoggedIn, setIsLoggedIn\] = useState\(false\);/, "const [isLoggedIn, setIsLoggedIn] = useState(false);\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);");
  
  // Update import to include Menu wrapper
  if(!content.includes("Menu")) {
    content = content.replace(/import \{ \n  LayoutDashboard,/, "import { \n  Menu,\n  LayoutDashboard,");
  }
}

// Sidebar wrappers
const sidebarRegex = /\{\/\* Sidebar \*\/\}\s*<Sidebar[\s\S]*?onLogout=\{\(\) => setIsLoggedIn\(false\)\}\s*\/>/;
const sidebarMatch = content.match(sidebarRegex);

if (sidebarMatch && !content.includes('md:block')) {
  const replacement = `
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar Wrapper */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 h-full",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          activeSection={activeSection}
          onSetSection={(s: Section) => {
            if (isRoleAllowed(s)) {
              handleSetSection(s);
              setIsMobileMenuOpen(false);
            }
          }}
          adminRole={adminRole}
          adminEmail={adminEmail}
          stats={stats}
          onLogout={() => setIsLoggedIn(false)}
        />
      </div>
  `;
  content = content.replace(sidebarRegex, replacement);
  
  // Add Hamburger to header
  const headerRegex = /<header className="px-8 h-16 flex items-center justify-between border-b border-white\/5 bg-\[\#060810\]\/50 backdrop-blur-md z-10">\s*<div className="flex items-center gap-4">/;
  const headerReplacement = `<header className="px-4 md:px-8 h-16 flex items-center justify-between border-b border-white/5 bg-[#060810]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-white/60 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>`;
  
  content = content.replace(headerRegex, headerReplacement);
}

fs.writeFileSync(path, content);
console.log("AdminPortal Mobile Responsive patched.");
