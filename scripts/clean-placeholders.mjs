// scripts/clean-placeholders.mjs
import fs from 'fs';
import path from 'path';

const dir = path.resolve('src/sections');
for (const f of fs.readdirSync(dir)) {
  if (f.endsWith('.tsx') || f.endsWith('.ts')) {
    const fp = path.join(dir, f);
    let c = fs.readFileSync(fp, 'utf8');
    c = c.replace(/\[PLACEHOLDER:\s*([^\]]+)\]/g, '$1');
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Cleaned placeholder tags from:', f);
  }
}

