// scripts/capture-gate2-angles.mjs
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
if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

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

const PORT = 4173;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Gate 2 Test Server running at http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

  if (!browserBin) {
    console.error('No browser binary found');
    server.close();
    process.exit(1);
  }

  const userDataDir = path.resolve(__dirname, '../.test-gate2-angles-profile');
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
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  try {
    const listRes = await fetch('http://127.0.0.1:9224/json/list');
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

    // Helper to capture a specific view
    async function captureView(url, filename, label) {
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

      // Allow 3D canvas and character assets to warm up
      await new Promise(r => setTimeout(r, 2200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));

      // Also copy to artifact directory
      const artPath = path.join(artifactDir, filename);
      fs.writeFileSync(artPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${outPath} & ${artPath}`);
    }

    // 1. Scene 8: 4 Angles (front, left, right, rear)
    await captureView(`http://127.0.0.1:${PORT}/?debug=1&scene=8&angle=front`, 'gate2-scene8-front.png', 'Scene 8 Front Angle');
    await captureView(`http://127.0.0.1:${PORT}/?debug=1&scene=8&angle=left`, 'gate2-scene8-left.png', 'Scene 8 Left Angle');
    await captureView(`http://127.0.0.1:${PORT}/?debug=1&scene=8&angle=right`, 'gate2-scene8-right.png', 'Scene 8 Right Angle');
    await captureView(`http://127.0.0.1:${PORT}/?debug=1&scene=8&angle=rear`, 'gate2-scene8-rear.png', 'Scene 8 Rear Angle');

    // 2. Scene 9 Drone View Entering City (p = 0.655, localP = 0.10)
    await captureView(`http://127.0.0.1:${PORT}/?debug=1&scene=9`, 'gate2-scene9-drone-entry.png', 'Scene 9 Dynamic FPV Drone View Entering City');

    // Scroll to Left Turn in Scene 9 (p = 0.72)
    console.log('\nNavigating to Scene 9 Left Turn (p = 0.72)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, 0.72 * maxScroll);
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1800));
    const shotLeftTurn = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'gate2-scene9-left-turn.png'), Buffer.from(shotLeftTurn.data, 'base64'));
    fs.writeFileSync(path.join(artifactDir, 'gate2-scene9-left-turn.png'), Buffer.from(shotLeftTurn.data, 'base64'));
    console.log('Saved: gate2-scene9-left-turn.png');

    // Scroll to Right Turn in Scene 9 (p = 0.78)
    console.log('\nNavigating to Scene 9 Right Turn (p = 0.78)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, 0.78 * maxScroll);
        })()
      `
    });
    await new Promise(r => setTimeout(r, 1800));
    const shotRightTurn = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(screenshotsDir, 'gate2-scene9-right-turn.png'), Buffer.from(shotRightTurn.data, 'base64'));
    fs.writeFileSync(path.join(artifactDir, 'gate2-scene9-right-turn.png'), Buffer.from(shotRightTurn.data, 'base64'));
    console.log('Saved: gate2-scene9-right-turn.png');

    // Retrieve Penetration Report from browser
    const penResult = await send('Runtime.evaluate', {
      expression: `window.__PHARMAFLY_PENETRATION_REPORT__ || null`,
      returnByValue: true
    });
    console.log('\n--- BROWSER PENETRATION REPORT ---');
    console.log(JSON.stringify(penResult?.result?.value, null, 2));

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
