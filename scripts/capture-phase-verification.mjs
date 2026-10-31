// scripts/capture-phase-verification.mjs
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

const PORT = 4192;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Phase Verification Server running at http://127.0.0.1:${PORT}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const userDataDir = path.resolve(__dirname, '../.test-verify-profile');
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
    '--remote-debugging-port=9242',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  try {
    const listRes = await fetch('http://127.0.0.1:9242/json/list');
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

    async function setProgressAndCapture(progress, filename, label, waitMs = 2000) {
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

    // --- GALAXY Z FOLD 5 SCROLL-DRIVEN UNFOLDING ---
    // Scene 1: Closed Folded Cover Screen (p = 0.02)
    await setProgressAndCapture(0.02, 'fold-phone-scene1-closed.png', 'Galaxy Z Fold 5 Closed Cover Screen', 2000);

    // Scene 2: Mechanical Unfolding (p = 0.075)
    await setProgressAndCapture(0.075, 'fold-phone-scene2-open.png', 'Galaxy Z Fold 5 Unfolding', 2000);

    // Scene 3: Wide Mini-Tablet OLED Dual Pane Display (p = 0.15)
    await setProgressAndCapture(0.15, 'fold-phone-scene3-search.png', 'Galaxy Z Fold 5 Unfolded Wide Tablet Display', 2000);

    // --- SCENE 8 RIDER PICKUP (NATURAL ANATOMICAL ARM POSTURE & NO T-POSE) ---
    // Scene 8: Rider on Scooter & Pharmacist Handover (p = 0.55)
    await setProgressAndCapture(0.55, 'human-rider-pickup.png', 'Scene 8 Natural Rider Grip & Pharmacist Handover', 2200);

    // Front angle for rider posture
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1&angle=front`);
    await setProgressAndCapture(0.55, 'gate2-scene8-front.png', 'Scene 8 Front Angle Rider & Pharmacist Posture', 2000);

    // --- SCENE 10 DISMOUNT & THRESHOLD HANDOVER ---
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1`);
    // Scene 10: Courier dismounting curbside with parcel (p = 0.90)
    await setProgressAndCapture(0.90, 'scene10-driver-dismount.png', 'Scene 10 Courier Curbside Dismount', 2000);

    // Scene 10: Handover at threshold with pulsing green verification ring (p = 0.94)
    await setProgressAndCapture(0.94, 'scene10-handover-threshold.png', 'Scene 10 Threshold Parcel Handover', 2000);

    console.log('\nAll phase verification captures successfully completed!');
    ws.close();
    browser.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Verification capture error:', err);
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(1);
  }
});

