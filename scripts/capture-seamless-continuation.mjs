// scripts/capture-seamless-continuation.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactsDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';
const outDir = path.resolve(artifactsDir, 'continuation');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

const PORT = 4202;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Continual Server running at http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.resolve(__dirname, '../.test-continuation-profile-' + Date.now());
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = spawn(edgePath, [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--remote-debugging-port=9265',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const listRes = await fetch('http://127.0.0.1:9265/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page') || pages[0];
    const wsUrl = target?.webSocketDebuggerUrl;

    if (!wsUrl) throw new Error('No debugger target found');

    const ws = new WebSocket(wsUrl);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = id++;
      const timeout = setTimeout(() => {
        reject(new Error(`CDP ${method} timed out`));
      }, 25000);
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === curId) {
          clearTimeout(timeout);
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise((resolve) => {
      if (ws.readyState === 1) resolve();
      else ws.addEventListener('open', resolve, { once: true });
    });

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

    console.log('Navigating to landing page...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1` });
    await new Promise(r => setTimeout(r, 3500));

    // Capture Frame 1: Scene 4 Order Placed (master = 0.180, legacy = 0.225)
    console.log('1. Capturing Scene 4: Order Placed on Phone...');
    await send('Runtime.evaluate', {
      expression: `window.__SCROLL_TO_PROGRESS__(0.180, true);`
    });
    await new Promise(r => setTimeout(r, 600));
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, '01-order-placed-phone.png'), Buffer.from(shot1.data, 'base64'));
    console.log('✓ Saved 01-order-placed-phone.png');

    // Capture Frame 2: Foldable Continuation (master = 0.220, foldProgress = 0.18)
    console.log('2. Capturing Continuation (Single Phone Centering)...');
    await send('Runtime.evaluate', {
      expression: `window.__SCROLL_TO_PROGRESS__(0.220, true);`
    });
    await new Promise(r => setTimeout(r, 600));
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, '02-continuation-centering.png'), Buffer.from(shot2.data, 'base64'));
    console.log('✓ Saved 02-continuation-centering.png');

    // Capture Frame 3: Screen Detaching & Expanding (master = 0.320, foldProgress = 0.68)
    console.log('3. Capturing Screen Expanding to Viewport...');
    await send('Runtime.evaluate', {
      expression: `window.__SCROLL_TO_PROGRESS__(0.320, true);`
    });
    await new Promise(r => setTimeout(r, 600));
    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, '03-screen-expanding-viewport.png'), Buffer.from(shot3.data, 'base64'));
    console.log('✓ Saved 03-screen-expanding-viewport.png');

    // Capture Frame 4: Scene 5 Direct Render Handover (master = 0.380, foldProgress = 0.98)
    console.log('4. Capturing Handover to Story World...');
    await send('Runtime.evaluate', {
      expression: `window.__SCROLL_TO_PROGRESS__(0.380, true);`
    });
    await new Promise(r => setTimeout(r, 600));
    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, '04-story-world-handover.png'), Buffer.from(shot4.data, 'base64'));
    console.log('✓ Saved 04-story-world-handover.png');

    console.log('\n=== ALL CONTINUATION FRAMES CAPTURED SUCCESSFULLY ===');
    ws.close();
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(0);
  }
});

