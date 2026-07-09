import fs from 'fs';
import path from 'path';

function replaceInFile(filePath: string, replacements: [RegExp, string][]) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    for (const [regex, replacement] of replacements) {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

const files = [
  'src/pages/partners_portal/PartnersPortal.tsx',
  'src/pages/admin/AdminPortal.tsx',
  'src/pages/landing/LandingPage.tsx',
  'src/pages/pwa/MerchantDashboard.tsx',
  'src/services/ussd/config.ts',
  'src/services/ussd/parser.ts',
  'src/services/skuMatcher.ts',
  'src/constants/testData.ts',
  'supabase/functions/nx-ussd/config.ts',
  'supabase/functions/nx-ussd/parser.ts',
  'supabase/functions/nx-embed/index.ts',
  'scripts/seed_skus.ts'
];

const replacements: [RegExp, string][] = [
  [/MF:\s*\{\s*emoji:\s*'🌽',\s*label:\s*'Maize Flour',\s*unit:\s*'bags'\s*\}/g, "F: { emoji: '🌾', label: 'Maize & Wheat Flour', unit: 'bags'    }"],
  [/MF: \["1kg", "2kg", "5kg", "10kg", "25kg"\]/g, 'F: ["1kg", "2kg", "5kg", "10kg", "25kg"]'],
  [/{ code: "MF", desc: "Maize flour unga wa ngano unga wa mahindi pembe jogoo dola ndovu soko duma 1kg 2kg" }/g, '{ code: "F", desc: "Maize flour wheat flour unga wa ngano unga wa mahindi pembe jogoo dola ndovu soko duma 1kg 2kg" }'],
  [/{ icon: '🌽',\s*name: 'Maize Flour',\s*code: 'MF',\s*brands:\s*'Taifa · Jogoo · Soko · Pembe · Ajab · Hostess · Raha Premium · Ndume · Ndovu'\s*}/g, "{ icon: '🌾', name: 'Maize & Wheat Flour', code: 'F', brands: 'Taifa · Jogoo · Soko · Pembe · Ajab · Hostess · Raha Premium · Ndume · Ndovu' }"],
  [/"UNGA": "MF"/g, '"UNGA": "F"'],
  [/"PEMBE": "MF"/g, '"PEMBE": "F"'],
  [/"AJAB": "MF"/g, '"AJAB": "F"'],
  [/"JOGOO": "MF"/g, '"JOGOO": "F"'],
  [/"DOLA": "MF"/g, '"DOLA": "F"'],
  [/"EXE": "MF"/g, '"EXE": "F"'],
  [/"NDOVU": "MF"/g, '"NDOVU": "F"'],
  [/"SOKO": "MF"/g, '"SOKO": "F"'],
  [/"FAMILA": "MF"/g, '"FAMILA": "F"'],
  [/"DUMA": "MF"/g, '"DUMA": "F"'],
  [/"UGALI": "MF"/g, '"UGALI": "F"'],
  [/"HOSTESS": "MF"/g, '"HOSTESS": "F"'],
  [/"KABRAS": "MF"/g, '"KABRAS": "F"'],
  [/"RHINO": "MF"/g, '"RHINO": "F"'],
  [/"FLOUR": "MF"/g, '"FLOUR": "F"'],
  [/"MAIZE": "MF"/g, '"MAIZE": "F"'],
  [/\['BR', 'ML', 'SG', 'CO', 'MF'\]/g, "['BR', 'ML', 'SG', 'CO', 'F']"],
  [/MF: "Pembe Flour"/g, 'F: "Pembe Flour"'],
  [/MF: "Pembe"/g, 'F: "Pembe"'],
  [/MF\*8 or Pembe 5kg\*8/g, 'F*8 or Pembe 5kg*8'],
  [/\/\/ BR \(Bread\), ML \(Milk\), SG \(Sugar\), CO \(Cooking Oil\), MF \(Maize Flour\)/g, '// BR (Bread), ML (Milk), SG (Sugar), CO (Cooking Oil), F (Maize/Wheat Flour)'],
  [/ Maize Flour — MF /g, ' Maize/Wheat Flour — F '],
  [/new Set\(\["BR","ML","SG","CO","MF"\]\)/g, 'new Set(["BR","ML","SG","CO","F"])'],
  [/"mf": "pembe maize flour"/g, '"f": "pembe maize flour"'],
  [/sku: 'MF',/g, "sku: 'F',"],
  [/MF-2KG/g, "F-2KG"],
  [/MF-1KG/g, "F-1KG"],
  [/{ code: "MF", en: "Maize Flour", sw: "Unga" }/g, '{ code: "F", en: "Maize/Wheat Flour", sw: "Unga" }'],
  [/sku: 'MF',\s*name:\s*'Maize Flour',\s*category:\s*'Grains'/g, "sku: 'F', name: 'Maize & Wheat Flour', category: 'Flour'"],
  [/s\.sku === 'MF'/g, "s.sku === 'F'"],
  [/valid MF \(Maize Flour\)/g, "valid F (Maize/Wheat Flour)"],
];

for (const file of files) {
  replaceInFile(path.join(process.cwd(), file), replacements);
}
