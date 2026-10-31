import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

function getAvailablePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

server.listen(4299, '127.0.0.1', async () => {
  const browserBin = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPort = await getAvailablePort();
  const userDataDir = path.resolve(__dirname, `../.test-diag-profile-${Date.now()}`);

  const browser = spawn(browserBin, [
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
    await new Promise(r => setTimeout(r, 400));
    try {
      listRes = await fetch(`http://127.0.0.1:${browserPort}/json/list`);
      if (listRes.ok) break;
    } catch (e) { }
  }

  const pages = await listRes.json();
  const target = pages.find(p => p.type === 'page') || pages[0];
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

  await send('Page.navigate', { url: 'http://127.0.0.1:4299/?skipLoader=1&debug=1&tier=ultra' });
  await new Promise(r => setTimeout(r, 3500));

  // Inspect what happens when setting progress around 0.63
  const diagRes = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const results = [];
        // Test step by step
        const testPoints = [0.55, 0.60, 0.62, 0.63, 0.635, 0.64, 0.65];
        for (const pt of testPoints) {
          const t0 = performance.now();
          if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(pt, true);
          const t1 = performance.now();
          results.push({ pt, durationMs: t1 - t0 });
        }
        return {
          results,
          spikes: window.__SPIKES__ || []
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Synchronous scrollToProgress measurements:', diagRes.result?.value?.results);

  // Now measure the RAF durations while stepping
  const rafRes = await send('Runtime.evaluate', {
    expression: `
      (new Promise(resolve => {
        if (window.__SPIKES__) window.__SPIKES__.length = 0;
        const testPoints = [0.55, 0.60, 0.62, 0.63, 0.634, 0.64, 0.65, 0.70, 0.80, 0.87, 0.88, 0.90, 0.95];
        const stepResults = [];
        let idx = 0;

        function runStep() {
          if (idx >= testPoints.length) {
            resolve({
              stepResults,
              recordedSpikes: window.__SPIKES__ || []
            });
            return;
          }
          const pt = testPoints[idx++];
          const before = performance.now();
          if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(pt, true);
          requestAnimationFrame((t) => {
            const rafTime = performance.now() - before;
            stepResults.push({ pt, rafTime: parseFloat(rafTime.toFixed(1)) });
            // Allow one frame before next
            requestAnimationFrame(() => {
              runStep();
            });
          });
        }
        runStep();
      }))
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('\nRAF Step durations across key points:', rafRes.result?.value?.stepResults);

  // Test smooth continuous scroll via Lenis
  const lenisRes = await send('Runtime.evaluate', {
    expression: `
      (new Promise(resolve => {
        if (window.__SPIKES__) window.__SPIKES__.length = 0;
        const lenis = window.__GET_LENIS__ ? window.__GET_LENIS__() : null;
        if (!lenis) {
          resolve({ error: 'No Lenis instance' });
          return;
        }

        // Jump to Scene 8 start first (m = 0.54)
        if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(0.54, true);

        setTimeout(() => {
          if (window.__SPIKES__) window.__SPIKES__.length = 0;

          // Smooth scroll to Scene 10 end (m = 0.96) over 2.5 seconds
          const track = document.querySelector('[data-track]') || document.documentElement;
          const maxScroll = track.offsetHeight - window.innerHeight;
          const targetY = 0.96 * maxScroll;

          lenis.scrollTo(targetY, { duration: 2.5 });

          setTimeout(() => {
            const allSpikes = window.__SPIKES__ || [];
            const scenes8to10 = allSpikes.filter((s) => s.sceneId >= 8 && s.sceneId <= 10);
            const spikesOver33ms = scenes8to10.filter((s) => s.durationMs > 33.0);
            resolve({
              totalSpikes: allSpikes.length,
              spikesOver33ms: spikesOver33ms.length,
              details: spikesOver33ms
            });
          }, 3000);
        }, 800);
      }))
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('\nLenis Continuous Smooth Scroll Spike Result:', lenisRes.result?.value);

  ws.close();
  browser.kill();
  server.close();
  process.exit(0);
});
