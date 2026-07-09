import fs from 'fs';
import path from 'path';

function fixFiles(dir) {
    fs.readdirSync(dir).forEach(file => {
        const p = path.join(dir, file);
        if (fs.lstatSync(p).isDirectory()) {
            fixFiles(p);
        } else if (p.endsWith('.ts')) {
            let content = fs.readFileSync(p, 'utf8');
            content = content.replace(/Deno\.env\.get\((['"`])(.*?)\1\)/g, "process.env['$2']");
            content = content.replace(/npm:@supabase\/supabase-js@2/g, '@supabase/supabase-js');
            fs.writeFileSync(p, content);
        }
    });
}
fixFiles('src/services/ussd');
