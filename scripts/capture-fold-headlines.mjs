// scripts/capture-fold-headlines.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactsDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';
const outDir = path.resolve(artifactsDir, 'gate1');

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

server.listen(4176, '127.0.0.1', async () => {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.resolve(__dirname, '../.test-fold-captures-profile');
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = spawn(edgePath, [
    '--headless=new',
    '--no-sandbox',
    '--remote-debugging-port=9229',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));
  const listRes = await fetch('http://127.0.0.1:9229/json/list');
  const pages = await listRes.json();
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);

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
    width: 1280,
    height: 720,
    deviceScaleFactor: 1.0,
    mobile: false
  });

  await send('Page.navigate', { url: 'http://127.0.0.1:4176/?skipLoader=1' });
  await new Promise(r => setTimeout(r, 3000));

  // 1. At foldProgress 0.25 (master = 0.256 + 0.25 * 0.20 = 0.306) -> headlines hidden
  await send('Runtime.evaluate', {
    expression: `window.__SCROLL_TO_PROGRESS__(0.306, true)`
  });
  await new Promise(r => setTimeout(r, 600));
  let screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'fold-p025-hidden-headlines.png'), Buffer.from(screenshot.data, 'base64'));
  console.log('Saved fold-p025-hidden-headlines.png');

  // 2. At foldProgress 0.65 (master = 0.256 + 0.65 * 0.20 = 0.386) -> "Meet Pharmafly" caption visible
  await send('Runtime.evaluate', {
    expression: `window.__SCROLL_TO_PROGRESS__(0.386, true)`
  });
  await new Promise(r => setTimeout(r, 600));
  screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, 'fold-p065-meet-pharmafly.png'), Buffer.from(screenshot.data, 'base64'));
  console.log('Saved fold-p065-meet-pharmafly.png');

  ws.close();
  browser.kill();
  server.close();
  process.exit(0);
});

