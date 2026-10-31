import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const srcFiles = walk('src');
console.log(`Auditing ${srcFiles.length} files in src/...`);

const assetLoaders = [];
const patterns = [
  /useGLTF\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /useTexture\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /useLoader\([^,]+,\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /files:\s*['"`]([^'"`]+)['"`]/g,
  /url:\s*['"`]([^'"`]+)['"`]/g,
  /['"`](\/assets\/[^'"`]+)['"`]/g,
  /['"`](\/?fonts\/[^'"`]+)['"`]/g,
  /['"`](\/?images\/[^'"`]+)['"`]/g,
  /['"`](\/?models\/[^'"`]+)['"`]/g,
];

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pat of patterns) {
    let match;
    while ((match = pat.exec(content)) !== null) {
      assetLoaders.push({ file, asset: match[1] });
    }
  }
}

console.log('\n--- ASSET LOADER REFERENCES ---');
const uniqueAssets = Array.from(new Set(assetLoaders.map(a => a.asset)));
for (const a of uniqueAssets) {
  const refs = assetLoaders.filter(x => x.asset === a).map(x => x.file);
  console.log(`Asset: ${a}`);
  console.log(`  Referenced in: ${refs.join(', ')}`);
}

console.log('\n--- VERIFYING AGAINST PUBLIC DIR ---');
const publicFiles = walk('public').map(f => f.replace(/\\/g, '/'));
console.log('Public files on disk:', publicFiles);

for (const a of uniqueAssets) {
  const relPath = a.startsWith('/') ? a.slice(1) : a;
  const target = 'public/' + relPath;
  const exists = fs.existsSync(target);
  console.log(`Checking ${a} -> ${target}: ${exists ? 'EXISTS' : 'MISSING'}`);
  if (exists) {
    // Check exact case
    const parts = target.split('/');
    let cur = '';
    let caseMatches = true;
    for (const part of parts) {
      const parentDir = cur || '.';
      const actualEntries = fs.readdirSync(parentDir);
      if (!actualEntries.includes(part)) {
        console.error(`  CASE MISMATCH on disk: segment "${part}" vs actual [${actualEntries.filter(e => e.toLowerCase() === part.toLowerCase())}]`);
        caseMatches = false;
      }
      cur = cur ? cur + '/' + part : part;
    }
    if (caseMatches) {
      console.log(`  Case check: OK`);
    }
  }
}

// Check .gitignore
if (fs.existsSync('.gitignore')) {
  console.log('\n--- CHECKING .gitignore ---');
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  console.log(gitignore);
}
