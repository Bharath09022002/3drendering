// scripts/capture-handover-journey.mjs
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

const PORT = 4188;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Handover Capture Server running at http://127.0.0.1:${PORT}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const userDataDir = path.resolve(__dirname, '../.test-handover-profile');
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
    '--remote-debugging-port=9238',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  try {
    const listRes = await fetch('http://127.0.0.1:9238/json/list');
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
      await new Promise(r => setTimeout(r, 1600));
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

    // Load initial page
    await navigateAndReady(`http://127.0.0.1:${PORT}/?debug=1&skipLoader=1`);

    // 1. Scene 7: Clinical Pharmacist with Human Skin, Hair, Stethoscope & Verification Station (p = 0.44)
    await setProgressAndCapture(0.44, 'human-pharmacist-detail.png', 'Scene 7 Human Pharmacist with Stethoscope & Station');

    // 2. Scene 8: Curbside Seated Rider with Tan Skin, Courier Jacket & Helmet (p = 0.56)
    await setProgressAndCapture(0.56, 'human-rider-pickup.png', 'Scene 8 Human Rider Pickup at Pharmacy Curb');

    // 3. Scene 10 Phase A: Driver Dismounts Curbside & Takes Parcel from Cargo Box (p = 0.89, localP = 0.22)
    await setProgressAndCapture(0.89, 'scene10-driver-dismount.png', 'Scene 10 Driver Dismounts from Scooter Curbside');

    // 4. Scene 10 Phase B: Driver Walks across Walkway Carrying Parcel to Customer (p = 0.915, localP = 0.50)
    await setProgressAndCapture(0.915, 'scene10-driver-walk-to-customer.png', 'Scene 10 Driver Walks Carrying Parcel to Customer');

    // 5. Scene 10 Phase C: Handover Moment on Porch Threshold (p = 0.935, localP = 0.72)
    await setProgressAndCapture(0.935, 'scene10-handover-threshold.png', 'Scene 10 Handover Moment on Porch Threshold');

    // 6. Scene 10 Phase D: Customer Steps Back Inside with Parcel & Driver Goodbye (p = 0.955, localP = 0.94)
    await setProgressAndCapture(0.955, 'scene10-customer-inside.png', 'Scene 10 Customer Steps Back Inside Entryway');

    console.log('\nAll Handover & Human Detail captures successfully finished!');
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

