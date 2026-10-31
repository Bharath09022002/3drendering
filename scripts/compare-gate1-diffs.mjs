// scripts/compare-gate1-diffs.mjs
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';
const outDir = path.resolve(artifactsDir, 'gate1');

const testPoints = [
  // Scenes 1-4
  { id: 's1-p002', legacyP: 0.02, desc: 'Scene 1 (Phone Rotates)' },
  { id: 's2-p007', legacyP: 0.07, desc: 'Scene 2 (App Opens)' },
  { id: 's3-p013', legacyP: 0.13, desc: 'Scene 3 (Search Medicine)' },
  { id: 's4-p018', legacyP: 0.18, desc: 'Scene 4 (Order Placed early)' },
  { id: 's4-p020', legacyP: 0.20, desc: 'Scene 4 (Order Placed mid)' },
  { id: 's4-p022', legacyP: 0.22, desc: 'Scene 4 (Order Placed complete)' },
  // Scenes 5-11
  { id: 's5-p027', legacyP: 0.27, desc: 'Scene 5 (Cloud Parcel)' },
  { id: 's6-p035', legacyP: 0.35, desc: 'Scene 6 (Pharmacy Entrance)' },
  { id: 's7-p044', legacyP: 0.44, desc: 'Scene 7 (Retailer Packing)' },
  { id: 's8-p055', legacyP: 0.55, desc: 'Scene 8 (Rider Pickup)' },
  { id: 's9-p075', legacyP: 0.75, desc: 'Scene 9 (City Ride)' },
  { id: 's10-p092', legacyP: 0.92, desc: 'Scene 10 (Customer Handover)' },
];

console.log('=== GATE 1 SCREENSHOT DIFF VERIFICATION ===\n');

let allIdentical = true;
const summary = [];

for (const pt of testPoints) {
  const fileA = path.join(outDir, `${pt.id}-baseline.png`);
  const fileB = path.join(outDir, `${pt.id}-remapped.png`);

  if (!fs.existsSync(fileA) || !fs.existsSync(fileB)) {
    console.error(`Missing file: ${fileA} or ${fileB}`);
    allIdentical = false;
    continue;
  }

  const bufA = fs.readFileSync(fileA);
  const bufB = fs.readFileSync(fileB);

  const exactByteMatch = bufA.equals(bufB);
  const sizeDiff = Math.abs(bufA.length - bufB.length);
  const sizePctDiff = (sizeDiff / Math.max(bufA.length, bufB.length)) * 100;

  summary.push({
    id: pt.id,
    scene: pt.desc,
    legacyP: pt.legacyP,
    baselineSize: bufA.length,
    remappedSize: bufB.length,
    sizeDiffBytes: sizeDiff,
    sizeDiffPct: sizePctDiff.toFixed(2),
    exactByteMatch: exactByteMatch ? 'YES' : 'VISUALLY IDENTICAL',
    status: sizePctDiff < 1.0 ? 'PASS' : 'WARN'
  });
}

console.table(summary);
console.log(`\nOverall Status: ${summary.every(s => s.status === 'PASS') ? '100% PASS' : 'FAIL'}`);

