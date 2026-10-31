// scripts/capture-three-upgrades.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';

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
    const publicPath = path.join(__dirname, '../public', reqPath);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      const ext = path.extname(publicPath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(publicPath).pipe(res);
    } else {
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    }
  }
});

const PORT = 4174;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Capture Server running on http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

  const userDataDir = path.resolve(__dirname, '../.test-upgrades-profile');
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = spawn(browserBin, [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--force-prefers-reduced-motion=no-preference',
    '--disable-background-timer-throttling',
    '--remote-debugging-port=9231',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9231/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page') || pages[0];
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
      mobile: false
    });

    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1` });
    await new Promise(r => setTimeout(r, 1500));

    const upgradeCaptures = [
      { name: 'gate4-upgrade-pharmacy.png', progress: 0.44, label: 'Pharmacy Counter + Pharmacist in Lab Coat' },
      { name: 'gate4-upgrade-scooter.png', progress: 0.60, label: 'Electric Scooter + Rider in Helmet' },
      { name: 'gate4-upgrade-handover.png', progress: 0.88, label: 'Apartment Door + Customer Handover' }
    ];

    for (const item of upgradeCaptures) {
      console.log(`Navigating to ${item.label} (progress: ${item.progress})...`);
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            if (window.__SCROLL_TO_PROGRESS__) {
              window.__SCROLL_TO_PROGRESS__(${item.progress}, true);
            }
          })()
        `
      });
      await new Promise(r => setTimeout(r, 1200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(artifactDir, item.name), Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${item.name}`);
    }

    ws.close();
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    browser.kill();
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    console.log('Capture complete!');
    process.exit(0);
  }
});

