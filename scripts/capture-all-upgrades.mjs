// scripts/capture-all-upgrades.mjs
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

const PORT = 4185;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Upgrade Capture Server running at http://127.0.0.1:${PORT}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const userDataDir = path.resolve(__dirname, '../.test-upgrades-profile-all');
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
    '--remote-debugging-port=9235',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  try {
    const listRes = await fetch('http://127.0.0.1:9235/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page');
    if (!target) throw new Error('No debugger page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

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
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1.5,
      mobile: false
    });

    async function navigateAndReady(url) {
      console.log(`\nNavigating to: ${url}`);
      await send('Page.navigate', { url });

      let ready = false;
      for (let retries = 0; retries < 30; retries++) {
        const check = await send('Runtime.evaluate', {
          expression: `(() => {
            const preloader = document.getElementById('app-preloader');
            const canvas = document.querySelector('canvas');
            const hasLenis = typeof window.__SCROLL_TO_PROGRESS__ === 'function';
            return {
              loaderPresent: !!preloader,
              canvasPresent: !!canvas,
              hasLenis
            };
          })()`,
          returnByValue: true
        });
        if (check?.result?.value?.canvasPresent && !check?.result?.value?.loaderPresent && check?.result?.value?.hasLenis) {
          ready = true;
          break;
        }
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`Page ready status: ${ready ? 'READY' : 'TIMEOUT'}`);
      await new Promise(r => setTimeout(r, 1500));
    }

    async function setProgressAndCapture(progress, filename, label, waitMs = 1800) {
      console.log(`\nSetting progress to ${progress} for ${label}...`);
      await send('Runtime.evaluate', {
        expression: `(() => {
          if (typeof window.__SCROLL_TO_PROGRESS__ === 'function') {
            window.__SCROLL_TO_PROGRESS__(${progress}, true);
          } else {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, ${progress} * maxScroll);
          }
        })()`
      });

      await new Promise(r => setTimeout(r, waitMs));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      const artPath = path.join(artifactDir, filename);
      fs.writeFileSync(artPath, Buffer.from(shot.data, 'base64'));
      const size = fs.statSync(outPath).size;
      console.log(`Saved screenshot: ${filename} (${(size / 1024).toFixed(1)} KB)`);
    }

    // 1. Initial Page Load
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1`);

    // --- FOLD PHONE & SCREEN DEFINITION ---
    // Scene 1: Folded Phone Cover Screen (p = 0.02)
    await setProgressAndCapture(0.02, 'fold-phone-scene1-closed.png', 'Fold Phone Closed Cover Screen');

    // Scene 2: Mechanical Unfolding to Wide Tablet OLED Display with Crisp Text (p = 0.08)
    await setProgressAndCapture(0.08, 'fold-phone-scene2-open.png', 'Fold Phone Unfolded Tablet OLED');

    // Scene 3: Search with High-Contrast Typography (p = 0.14)
    await setProgressAndCapture(0.14, 'fold-phone-scene3-search.png', 'Fold Phone Search Catalog');

    // --- HIGH-DEFINITION PHARMACY PACKING SCENE ---
    // Scene 7: Architectural fluted counter, pharmacist verifying, scanner laser, tamper-evident bag (p = 0.44)
    await setProgressAndCapture(0.44, 'packing-scene-definition.png', 'Scene 7 High-Definition Packing Station', 2200);

    // --- SCENE 9 TRANSIT DRONE VIEW & TURNS ---
    // Scene 9 FPV Drone Entering City (p = 0.655)
    await setProgressAndCapture(0.655, 'gate2-scene9-drone-entry.png', 'Scene 9 Dynamic FPV Drone View Entering City', 2200);

    // Scene 9 Left Turn Banking Roll (p = 0.72)
    await setProgressAndCapture(0.72, 'gate2-scene9-left-turn.png', 'Scene 9 Left Turn Lean', 2000);

    // Scene 9 Right Turn Banking Roll (p = 0.78)
    await setProgressAndCapture(0.78, 'gate2-scene9-right-turn.png', 'Scene 9 Right Turn Lean', 2000);

    // --- SCENE 8 4-ANGLE INSPECTION FOR GATE 2 ---
    // Front angle (?angle=front)
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1&angle=front`);
    await setProgressAndCapture(0.56, 'gate2-scene8-front.png', 'Scene 8 Front Angle', 2000);

    // Left angle (?angle=left)
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1&angle=left`);
    await setProgressAndCapture(0.56, 'gate2-scene8-left.png', 'Scene 8 Left Angle', 2000);

    // Right angle (?angle=right)
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1&angle=right`);
    await setProgressAndCapture(0.56, 'gate2-scene8-right.png', 'Scene 8 Right Angle', 2000);

    // Rear angle (?angle=rear)
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1&angle=rear`);
    await setProgressAndCapture(0.56, 'gate2-scene8-rear.png', 'Scene 8 Rear Angle', 2000);

    console.log('\nAll captures successfully finished!');
    ws.close();
    browser.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Capture error:', err);
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(1);
  }
});
