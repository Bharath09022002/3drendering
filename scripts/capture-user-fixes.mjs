// scripts/capture-user-fixes.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1\\fixes';

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
  console.log(`Fixes Capture Server running at http://127.0.0.1:${PORT}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const userDataDir = path.resolve(__dirname, '../.test-fixes-profile');
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

  let listRes;
  for (let retry = 0; retry < 10; retry++) {
    await new Promise(r => setTimeout(r, 800));
    try {
      listRes = await fetch('http://127.0.0.1:9242/json/list');
      if (listRes.ok) break;
    } catch (e) {}
  }
  if (!listRes || !listRes.ok) throw new Error('Could not connect to Chrome debugger on port 9242');

  try {
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page');
    if (!target) throw new Error('No debugger page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        cb(msg.result);
      }
    };

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((r) => { ws.onopen = r; });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to landing page...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1` });

    // Wait for 3D engine and shaders to compile
    await new Promise(r => setTimeout(r, 4000));

    // Capture shots:
    const shots = [
      {
        filename: '01-phone-scene1-closed-cover.png',
        master: 0.02,
        desc: 'Scene 1 Phone Rotates - Closed Galaxy Z Fold 5'
      },
      {
        filename: '02-phone-scene2-unfolding-book.png',
        master: 0.065,
        desc: 'Scene 2 App Opens - Mechanical book unfold'
      },
      {
        filename: '03-phone-scene3-search-typing.png',
        master: 0.11,
        desc: 'Scene 3 Search Medicine - Typing search'
      },
      {
        filename: '04-phone-scene4-order-placed.png',
        master: 0.165,
        desc: 'Scene 4 Place Order - Order placed sheet'
      },
      {
        filename: '04a-fold-screen-centered-zero-black.png',
        master: 0.194, // f = 0.05
        desc: 'Fold Phase A - Device centered, ZERO center black line, parcel launching'
      },
      {
        filename: '05-cloud-descent-pharmacy.png',
        master: 0.44, // Scene 6
        desc: 'Scene 6 Pharmacy confirms - Clean view of pharmacy counter & pharmacist, clouds dispersed'
      },
      {
        filename: '06-rider-pickup-handlebar-grip.png',
        master: 0.58, // Scene 8
        desc: 'Scene 8 Rider Pickup - Driver hands firmly gripping handlebars, feet on footboard, no black square'
      },
      {
        filename: '07-rider-city-transit-pose.png',
        master: 0.72, // Scene 9
        desc: 'Scene 9 City Transit - Driver leaning with turn, gripping bars, tailored jacket & pants'
      },
      {
        filename: '08-handover-waist-and-wardrobe.png',
        master: 0.93, // Scene 10
        desc: 'Scene 10 Delivered - Tailored shirt & pants on both, solid belt & waistband, ZERO waist gap'
      }
    ];

    for (const shot of shots) {
      console.log(`Setting scroll for ${shot.filename} (master = ${shot.master})...`);

      // Set master scroll position
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const master = ${shot.master};
            if (window.__SCROLL_TO_PROGRESS__) {
              window.__SCROLL_TO_PROGRESS__(master, true);
            } else {
              const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo(0, master * maxScroll);
            }
          })()
        `
      });

      // Wait 1200ms for camera, render target, and animations to settle
      await new Promise(r => setTimeout(r, 1200));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const imgBuffer = Buffer.from(screenshot.data, 'base64');
      const outPath = path.join(artifactDir, shot.filename);
      fs.writeFileSync(outPath, imgBuffer);
      console.log(`Saved screenshot: ${outPath} (${(imgBuffer.length / 1024).toFixed(1)} KB)`);
    }

    ws.close();
    browser.kill();
    server.close();
    console.log('All verification screenshots captured successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during capture:', err);
    try { browser.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
    process.exit(1);
  }
});
