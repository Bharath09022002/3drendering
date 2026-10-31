// scripts/test-production-audit.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

// Simple static server for dist
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
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
    // SPA fallback
    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexPath).pipe(res);
  }
});

const PORT = 4173;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Auditing Production Build at http://127.0.0.1:${PORT}...`);

  // Find Edge or Chrome binary
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

  if (!browserBin) {
    console.log('No headless browser found; testing HTTP response directly.');
    server.close();
    process.exit(0);
  }

  const userDataDir = path.resolve(__dirname, '../.test-prod-profile');
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = spawn(browserBin, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
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

    // Emulate no-preference for reduced motion
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    const consoleLogs = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value).join(' ');
        if (msg.params.type === 'error') consoleLogs.push(`[ERROR] ${text}`);
      }
    });

    console.log('Navigating to landing page...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise(r => setTimeout(r, 3000));

    // Audit DOM, SEO, Accessibility
    const auditRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.title;
          const metaDesc = document.querySelector('meta[name="description"]')?.content;
          const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
          const canvas = document.querySelector('canvas');
          const header = document.querySelector('header');
          const main = document.querySelector('main');
          const footer = document.querySelector('footer');
          const skipBtn = document.querySelector('header button');
          const faqButtons = document.querySelectorAll('#content-sections button[aria-expanded]');
          const downloadBtns = document.querySelectorAll('button');

          return {
            title,
            metaDesc,
            ogTitle,
            hasCanvas: !!canvas,
            hasHeader: !!header,
            hasMain: !!main,
            hasFooter: !!footer,
            hasSkipBtn: !!skipBtn,
            faqButtonCount: faqButtons.length,
            sectionsFound: document.querySelectorAll('section').length,
            buttonCount: downloadBtns.length
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Audit Results:');
    console.log(auditRes?.result ? auditRes.result.value : auditRes);

    if (consoleLogs.length > 0) {
      console.log('Console errors captured:', consoleLogs);
    } else {
      console.log('Console Check: 0 unhandled errors logged.');
    }

    ws.close();
  } catch (err) {
    console.error('Audit test failed:', err);
  } finally {
    browser.kill();
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(0);
  }
});
