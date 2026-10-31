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
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

server.listen(4198, '127.0.0.1', async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--remote-debugging-port=9248',
    '--user-data-dir=C:\\scroolproject\\.test-debug-profile-2',
    'about:blank'
  ]);
  await new Promise(r => setTimeout(r, 1500));
  const list = await (await fetch('http://127.0.0.1:9248/json/list')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  let id = 1;
  const cbs = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled') {
      console.log('[CONSOLE]', m.params.type, m.params.args.map(a => a.value || a.description).join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      console.error('[EXCEPTION]', m.params.exceptionDetails);
    }
    if (m.id && cbs.has(m.id)) {
      const cb = cbs.get(m.id);
      cbs.delete(m.id);
      cb(m.result);
    }
  };
  const send = (method, params = {}) => new Promise(r => {
    const mid = id++;
    cbs.set(mid, r);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:4198/' });
  await new Promise(r => setTimeout(r, 4000));

  // Inspect Phone meshes and materials
  const inspectRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Let's inspect window.__THREE_TRIANGLES__
        const tri = window.__THREE_TRIANGLES__;
        const calls = window.__THREE_DRAW_CALLS__;
        return { tri, calls };
      })()
    `,
    returnByValue: true
  });
  console.log('Three render info:', inspectRes.result.value);

  ws.close();
  browser.kill();
  server.close();
  process.exit(0);
});

