// scripts/capture-gate1-samples.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactsDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';
const outDir = path.resolve(artifactsDir, 'gate1');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const mode = process.argv.includes('--mode=remapped') ? 'remapped' : 'baseline';
console.log(`=== RUNNING GATE 1 CAPTURE IN [${mode.toUpperCase()}] MODE ===`);

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexPath).pipe(res);
  }
});

const PORT = 4174;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Gate 1 Server running at http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

  if (!browserBin) {
    console.error('No browser binary found');
    server.close();
    process.exit(1);
  }

  const userDataDir = path.resolve(__dirname, `../.test-gate1-${mode}-profile`);
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = spawn(browserBin, [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--remote-debugging-port=9227',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9227/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page') || pages[0];
    const wsUrl = target?.webSocketDebuggerUrl;

    if (!wsUrl) throw new Error('No debugger target');

    const ws = new WebSocket(wsUrl);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    await send('Page.enable');
    await send('Runtime.enable');

    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1.0,
      mobile: false
    });

    console.log('Navigating to app...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise(r => setTimeout(r, 3500));

    // The 12 sample points across scenes 1-4 and scenes 5-11
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

    if (mode === 'remapped') {
      testPoints.push(
        { id: 'fold-p025-hidden', masterP: 0.306, desc: 'Fold Phase B (p_fold=0.25, Headlines Hidden)' },
        { id: 'fold-p065-caption', masterP: 0.386, desc: 'Fold Phase C (p_fold=0.65, Meet Pharmafly Caption)' }
      );
    }

    const FOLD_SPAN = 0.20;
    const FOLD_START = 0.32 * (1 - FOLD_SPAN); // 0.256
    const FOLD_END = FOLD_START + FOLD_SPAN; // 0.456

    function legacyToMaster(p) {
      if (p < 0.32) return p * (1 - FOLD_SPAN);
      return FOLD_END + (p - 0.32) * (1 - FOLD_SPAN);
    }

    for (const pt of testPoints) {
      const targetScrollProgress = pt.masterP !== undefined
        ? pt.masterP
        : (mode === 'remapped' ? legacyToMaster(pt.legacyP) : pt.legacyP);
      
      // Execute scroll in page
      await send('Runtime.evaluate', {
        expression: `
          (function() {
            if (window.__SCROLL_TO_PROGRESS__) {
              window.__SCROLL_TO_PROGRESS__(${targetScrollProgress}, true);
            } else {
              const max = document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo(0, ${targetScrollProgress} * max);
            }
          })()
        `
      });

      // Wait for Three.js render frame to settle
      await new Promise(r => setTimeout(r, 600));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const filename = `${pt.id}-${mode}.png`;
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved [${mode}]: ${filename} (legacyP=${pt.legacyP}, targetScroll=${targetScrollProgress.toFixed(4)})`);
    }

    console.log(`All 12 [${mode}] checkpoints captured.`);
    ws.close();
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(0);
  }
});
