// scripts/test-probe.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.glb': 'model/gltf-binary',
  '.hdr': 'application/octet-stream',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  console.log('HTTP REQ:', req.method, req.url);
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    console.log('404 for:', req.url, '-> tried:', filePath);
    res.writeHead(404);
    res.end();
  }
});

server.listen(4194, '127.0.0.1', async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;
  const userDataDir = path.resolve(__dirname, '../.test-probe-profile');
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
    '--remote-debugging-port=9234',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9234/json/list');
    const pages = await listRes.json();
    console.log('Pages list:', JSON.stringify(pages));
    const target = pages.find(p => p.type === 'page');
    console.log('Selected target:', target?.title, target?.type, target?.url);
    const wsUrl = target?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error('No page target found');
    const ws = new WebSocket(wsUrl);
    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const cid = id++;
      const h = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === cid) {
          ws.removeEventListener('message', h);
          res(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: cid, method, params }));
    });

    await new Promise(r => ws.addEventListener('open', r, { once: true }));
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', m.params.type, m.params.args.map(a => a.value ?? a.description).join(' '));
      }
      if (m.method === 'Runtime.exceptionThrown') {
        console.log('EXCEPTION:', JSON.stringify(m.params.exceptionDetails));
      }
    });

    console.log('Sending Page.navigate...');
    const navResult = await send('Page.navigate', { url: 'http://127.0.0.1:4194/?debug=1&skipLoader=1' });
    console.log('Nav result:', JSON.stringify(navResult));
    await new Promise(r => setTimeout(r, 4000));

    const htmlCheck = await send('Runtime.evaluate', {
      expression: 'document.body.innerHTML'
    });
    console.log('Body HTML length:', htmlCheck.result?.value?.length, 'content:', htmlCheck.result?.value?.slice(0, 300));

    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const lenis = window.__GET_LENIS__ ? window.__GET_LENIS__() : null;
        const canvas = document.querySelector('canvas');
        return {
          hasLenis: !!lenis,
          lenisProgress: lenis ? lenis.progress : null,
          hasScrollFunc: typeof window.__SCROLL_TO_PROGRESS__,
          canvasFound: !!canvas,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0
        };
      })()`,
      returnByValue: true
    });
    console.log('Page Probe Status:', res.result?.value);

    // Now test scrolling to 0.44 (PackingScene)
    await send('Runtime.evaluate', {
      expression: 'window.__SCROLL_TO_PROGRESS__(0.44, true)'
    });
    await new Promise(r => setTimeout(r, 1500));

    const resScroll = await send('Runtime.evaluate', {
      expression: `(() => {
        const lenis = window.__GET_LENIS__ ? window.__GET_LENIS__() : null;
        return {
          lenisProgress: lenis ? lenis.progress : null,
          scrollY: window.scrollY
        };
      })()`,
      returnByValue: true
    });
    console.log('After Scroll to 0.44:', resScroll.result?.value);

    ws.close();
    browser.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    browser.kill();
    server.close();
    process.exit(1);
  }
});
