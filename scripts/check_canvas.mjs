import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=d3d11',
  '--remote-debugging-port=9252', '--user-data-dir=C:\\scroolproject\\.test-canvas-profile-2', 'about:blank'
]);
await new Promise(r => setTimeout(r, 1500));
const list = await (await fetch('http://127.0.0.1:9252/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 1;
const cbs = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.consoleAPICalled') {
    console.log('[BROWSER LOG]', m.params.type, m.params.args.map(a => a.value || a.description).join(' '));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    console.error('[BROWSER EXCEPTION]', m.params.exceptionDetails);
  }
  if (m.id && cbs.has(m.id)) { const cb = cbs.get(m.id); cbs.delete(m.id); cb(m.result); }
};
const send = (method, params = {}) => new Promise(r => { const mid = id++; cbs.set(mid, r); ws.send(JSON.stringify({ id: mid, method, params })); });
await new Promise(r => ws.onopen = r);
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
});
console.log('Navigating to http://localhost:5173/ ...');
await send('Page.navigate', { url: 'http://localhost:5173/' });
await new Promise(r => setTimeout(r, 4000));

const domCheck = await send('Runtime.evaluate', {
  expression: `
    (() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      return {
        title: document.title,
        canvases: canvases.map(c => ({ w: c.width, h: c.height, className: c.className })),
        bodyText: document.body.innerText.slice(0, 200)
      };
    })()
  `,
  returnByValue: true
});
console.log('DOM check:', domCheck.result.value);

ws.close(); browser.kill();
process.exit(0);
