import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

function getAvailablePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

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

const PORT = 4213;
server.listen(PORT, '127.0.0.1', async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPort = await getAvailablePort();
  const userDataDir = path.resolve(__dirname, `../.test-diag-profile-${Date.now()}`);
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${browserPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let listRes;
  for (let retry = 0; retry < 30; retry++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      listRes = await fetch(`http://127.0.0.1:${browserPort}/json/list`);
      if (listRes && listRes.ok) {
        const text = await listRes.text();
        const json = JSON.parse(text);
        if (Array.isArray(json) && json.length > 0) {
          listRes = { ok: true, json: async () => json };
          break;
        }
      }
    } catch {}
  }

  const list = await listRes.json();
  const target = list.find(p => p.type === 'page') || list[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Console.messageAdded' || msg.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER CONSOLE:', msg.params?.message?.text || msg.params?.args);
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise(res => { ws.onopen = res; });

  function send(method, params = {}) {
    return new Promise(res => {
      const id = msgId++;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&debug=1&tier=ultra` });

  // Wait 4 seconds for warmup
  await new Promise(r => setTimeout(r, 4000));

  console.log('Warming up complete. Running test steps...');
  const testPoints = [
    0.54, 0.56, 0.58, 0.60, 0.62,
    0.63, 0.634, 0.64, 0.66, 0.70,
    0.75, 0.80, 0.85, 0.87, 0.88,
    0.89, 0.90, 0.92, 0.94, 0.96
  ];

  for (const pt of testPoints) {
    const res = await send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          const t0 = performance.now();
          window.__SCROLL_TO_PROGRESS__(${pt}, true);
          requestAnimationFrame(() => {
            const t1 = performance.now();
            requestAnimationFrame(() => {
              const t2 = performance.now();
              resolve({
                frame1: t1 - t0,
                frame2: t2 - t1,
                master: window.__GET_LENIS__ ? window.__GET_LENIS__().progress : 0
              });
            });
          });
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log(`Step pt=${pt}:`, res.result?.value);
  }

  ws.close();
  browser.kill();
  server.close();
  process.exit(0);
});
