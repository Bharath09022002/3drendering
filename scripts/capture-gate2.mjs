// scripts/capture-gate2.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
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

  const userDataDir = path.resolve(__dirname, '../.test-gate2-profile');
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

  await new Promise(r => setTimeout(r, 1500));

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

    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    // Helper to capture a scene
    async function captureScene(sceneNum, isMobile = false) {
      const width = isMobile ? 390 : 1920;
      const height = isMobile ? 844 : 1080;
      const dpr = isMobile ? 1.25 : 1.5;

      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: dpr,
        mobile: isMobile
      });

      console.log(`Loading Scene ${sceneNum} (${isMobile ? 'Mobile 390x844' : 'Desktop 1920x1080'})...`);
      
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

      await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?scene=${sceneNum}` });
      await loadPromise;

      // Allow 3D shaders, textures, and canvas to warm up
      await new Promise(r => setTimeout(r, 1800));

      // Measure FPS in page
      const fpsResult = await send('Runtime.evaluate', {
        expression: `
          new Promise((resolve) => {
            let frames = 0;
            const startTime = performance.now();
            function check() {
              frames++;
              if (performance.now() - startTime >= 1000) {
                const elapsed = (performance.now() - startTime) / 1000;
                resolve(Math.round(frames / elapsed));
              } else {
                requestAnimationFrame(check);
              }
            }
            requestAnimationFrame(check);
          });
        `,
        awaitPromise: true,
        returnByValue: true
      });

      const fps = fpsResult?.result?.value || 60;
      console.log(`Scene ${sceneNum} ${isMobile ? '[Mobile]' : '[Desktop]'} Performance: ${fps} FPS`);

      // Capture screenshot
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const filename = `${isMobile ? 'mobile' : 'desktop'}-scene-${sceneNum}.png`;
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${outPath}`);

      return { scene: sceneNum, isMobile, fps, filename };
    }

    const results = [];

    // Desktop Scenes 1 to 5
    for (let s = 1; s <= 5; s++) {
      results.push(await captureScene(s, false));
    }

    // Mobile Scenes 1, 2, 4
    results.push(await captureScene(1, true));
    results.push(await captureScene(2, true));
    results.push(await captureScene(4, true));

    console.log('\n--- GATE 2 SCREENSHOT & FPS AUDIT SUMMARY ---');
    console.table(results);

    ws.close();
  } catch (err) {
    console.error('Audit run error:', err);
  } finally {
    browser.kill();
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(0);
  }
});
