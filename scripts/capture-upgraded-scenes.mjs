// scripts/capture-upgraded-scenes.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

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

const PORT = 4175;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Upgrade Capture Server running at http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

  if (!browserBin) {
    console.error('No browser binary found');
    server.close();
    process.exit(1);
  }

  const userDataDir = path.resolve(__dirname, '../.test-upgrades-capture-profile');
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
    '--remote-debugging-port=9226',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  try {
    const listRes = await fetch('http://127.0.0.1:9226/json/list');
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1.5,
      mobile: false
    });

    async function captureUrl(url, filename, label) {
      console.log(`\nNavigating: ${label} (${url})...`);
      const loadPromise = new Promise((resolve) => {
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Page.loadEventFired') {
            ws.removeEventListener('message', handler);
            resolve();
          }
        };
        ws.addEventListener('message', handler);
      });

      await send('Page.navigate', { url });
      await loadPromise;
      await new Promise(r => setTimeout(r, 2200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      const artPath = path.join(artifactDir, filename);
      fs.writeFileSync(artPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${outPath} & ${artPath}`);
    }

    // 1. Scene 1: Folded Phone
    await captureUrl(`http://127.0.0.1:${PORT}/?scene=1`, 'fold-phone-scene1-closed.png', 'Fold Phone Scene 1 Closed');

    // 2. Scene 2: Unfolded Phone with Crisp Wording
    await captureUrl(`http://127.0.0.1:${PORT}/?scene=2`, 'fold-phone-scene2-open.png', 'Fold Phone Scene 2 Open with Crisp Wording');

    // 3. Scene 3: Search with High-Contrast Typography
    await captureUrl(`http://127.0.0.1:${PORT}/?scene=3`, 'fold-phone-scene3-search.png', 'Fold Phone Scene 3 Search');

    // 4. Scene 7: High-Definition Packing Scene
    await captureUrl(`http://127.0.0.1:${PORT}/?scene=7`, 'packing-scene-definition.png', 'Scene 7 High-Definition Packing Station');

    ws.close();
    browser.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during capture:', err);
    browser.kill();
    server.close();
    process.exit(1);
  }
});

