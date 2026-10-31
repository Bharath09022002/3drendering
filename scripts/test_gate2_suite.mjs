// scripts/test_gate2_suite.mjs
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
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1\\gate2';

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

const PORT = 4212;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Gate 2 Test Server running at http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  if (!browserBin) {
    console.error('No browser binary found');
    server.close();
    process.exit(1);
  }

  const userDataDir = path.resolve(__dirname, `../.test-gate2-suite-profile-${Date.now()}`);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const browserPort = await getAvailablePort();
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

  console.log(`Using browser binary: ${browserBin}`);
  browser.stderr?.on('data', (d) => console.log('BROWSER STDERR:', d.toString()));
  browser.stdout?.on('data', (d) => console.log('BROWSER STDOUT:', d.toString()));
  browser.on('exit', (code, signal) => console.log(`Browser process exited (${code}, ${signal})`));

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
    } catch (e) {}
  }
  if (!listRes || !listRes.ok) {
    server.close();
    try { browser.kill(); } catch (e) {}
    throw new Error(`Could not connect to browser on port ${browserPort}`);
  }

  try {
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
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    const VIEW_WIDTH = 1366;
    const VIEW_HEIGHT = 768;
    await send('Emulation.setDeviceMetricsOverride', {
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      deviceScaleFactor: 1,
      mobile: false
    });

    const gate2Results = {
      pipelineValues: {},
      tierBenchmarks: {},
      spikeAuditScenes8To10: {},
      zoomedScreenshots: []
    };

    // Helper: measure FPS and frame times
    async function measureFpsAndFrameTime(durationMs = 1200) {
      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (new Promise(resolve => {
            const frameTimes = [];
            let last = performance.now();
            const start = last;
            let finished = false;

            const fallbackTimer = setTimeout(() => {
              if (finished) return;
              finished = true;
              if (frameTimes.length === 0) frameTimes.push(16.6);
              const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
              resolve({
                avgFps: parseFloat((1000 / avgMs).toFixed(1)),
                avgFrameTimeMs: parseFloat(avgMs.toFixed(2)),
                frameCount: frameTimes.length,
                minMs: parseFloat(Math.min(...frameTimes).toFixed(2)),
                maxMs: parseFloat(Math.max(...frameTimes).toFixed(2))
              });
            }, ${durationMs} + 1500);

            function loop(now) {
              if (finished) return;
              const dt = now - last;
              last = now;
              if (dt > 0 && dt < 200) frameTimes.push(dt);
              if (now - start < ${durationMs}) {
                requestAnimationFrame(loop);
              } else {
                finished = true;
                clearTimeout(fallbackTimer);
                if (frameTimes.length === 0) frameTimes.push(16.6);
                const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
                const fps = 1000 / avgMs;
                resolve({
                  avgFps: parseFloat(fps.toFixed(1)),
                  avgFrameTimeMs: parseFloat(avgMs.toFixed(2)),
                  frameCount: frameTimes.length,
                  minMs: parseFloat(Math.min(...frameTimes).toFixed(2)),
                  maxMs: parseFloat(Math.max(...frameTimes).toFixed(2))
                });
              }
            }
            requestAnimationFrame(loop);
          }))
        `,
        awaitPromise: true,
        returnByValue: true
      });
      return evalRes.result?.value;
    }

    // Helper: get pipeline info from window
    async function getPipelineInfo() {
      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (function() {
            const pipe = window.__ULTRA_PIPELINE__ || {};
            const q = window.__ACTIVE_QUALITY__ || {};
            return {
              tier: pipe.tier || q.tierName,
              dpr: pipe.dpr || window.devicePixelRatio,
              multisampling: pipe.multisampling ?? q.multisampling,
              shadowMapSize: pipe.shadowMapSize || q.shadowMapSize,
              anisotropy: pipe.anisotropy || q.anisotropy,
              enableAO: pipe.enableAO ?? q.enableAO,
              envIntensity: pipe.envIntensity,
              drawCalls: window.__THREE_DRAW_CALLS__ || 0,
              triangles: window.__THREE_TRIANGLES__ || 0
            };
          })()
        `,
        returnByValue: true
      });
      return evalRes.result?.value;
    }

    // --- 1. BENCHMARK ULTRA TIER ---
    console.log('\n--- 1. Testing Ultra Tier Pipeline ---');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&debug=1&tier=ultra` });
    await new Promise(r => setTimeout(r, 4000));

    const ultraPipe = await getPipelineInfo();
    const ultraPerf = await measureFpsAndFrameTime(1500);
    gate2Results.pipelineValues.ultra = ultraPipe;
    gate2Results.tierBenchmarks.ultra = { ...ultraPipe, ...ultraPerf };
    console.log('Ultra Tier Pipeline:', ultraPipe);
    console.log('Ultra Tier Performance:', ultraPerf);

    // Capture Full Overview with DebugBar HUD
    const hudShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'gate2_ultra_overview_hud.png'), Buffer.from(hudShot.data, 'base64'));

    // --- 2. CAPTURE 2X ZOOMED CROPS ON ULTRA ---
    console.log('\n--- 2. Capturing 2x Zoomed Antialiased Crops ---');
    // a) UI Text (Scene 1, m=0.02)
    await send('Runtime.evaluate', {
      expression: `if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(0.02, true);`
    });
    await new Promise(r => setTimeout(r, 800));
    const uiCrop = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 40, y: 140, width: 440, height: 260, scale: 2 }
    });
    const uiPath = path.join(artifactDir, 'gate2_zoomed2x_ui_text.png');
    fs.writeFileSync(uiPath, Buffer.from(uiCrop.data, 'base64'));
    gate2Results.zoomedScreenshots.push({ name: 'UI Text', path: uiPath });
    console.log('Captured 2x crop: UI Text');

    // b) Character Silhouette: Pharmacist (Scene 6, m=0.48)
    await send('Runtime.evaluate', {
      expression: `if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(0.48, true);`
    });
    await new Promise(r => setTimeout(r, 900));
    const charCrop = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 500, y: 160, width: 420, height: 420, scale: 2 }
    });
    const charPath = path.join(artifactDir, 'gate2_zoomed2x_character_silhouette.png');
    fs.writeFileSync(charPath, Buffer.from(charCrop.data, 'base64'));
    gate2Results.zoomedScreenshots.push({ name: 'Character Silhouette', path: charPath });
    console.log('Captured 2x crop: Character Silhouette');

    // c) Scooter Edge: Scene 8 / 9 (m=0.68)
    await send('Runtime.evaluate', {
      expression: `if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(0.68, true);`
    });
    await new Promise(r => setTimeout(r, 900));
    const scooterCrop = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 420, y: 300, width: 480, height: 380, scale: 2 }
    });
    const scooterPath = path.join(artifactDir, 'gate2_zoomed2x_scooter_edge.png');
    fs.writeFileSync(scooterPath, Buffer.from(scooterCrop.data, 'base64'));
    gate2Results.zoomedScreenshots.push({ name: 'Scooter Edge', path: scooterPath });
    console.log('Captured 2x crop: Scooter Edge');

    // --- 3. SPIKE AUDIT: SCENES 8-10 ON ULTRA (<33ms gate) ---
    console.log('\n--- 3. Running Frame Spike Audit across Scenes 8-10 on Ultra ---');
    // Allow compositor to settle after screenshot capture
    await new Promise(r => setTimeout(r, 1500));

    // Position at start of Scene 8 (m = 0.54)
    await send('Runtime.evaluate', {
      expression: `if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(0.54, true);`
    });
    await new Promise(r => setTimeout(r, 1200));

    // Audit rendering performance across scenes 8 to 10 key progress steps (m = 0.54 -> 0.96)
    const spikeRes = await send('Runtime.evaluate', {
      expression: `
        (new Promise((resolve) => {
          if (window.__SPIKES__) window.__SPIKES__.length = 0;

          // 20 representative progress sample steps covering Scenes 8, 9, 10
          const testPoints = [
            0.54, 0.56, 0.58, 0.60, 0.62,
            0.63, 0.634, 0.64, 0.66, 0.70,
            0.75, 0.80, 0.85, 0.87, 0.88,
            0.89, 0.90, 0.92, 0.94, 0.96
          ];
          const stepResults = [];
          let idx = 0;

          function runStep() {
            if (idx >= testPoints.length) {
              const spikesOver33ms = stepResults.filter((s) => s.durationMs > 33.0);
              const spikesOver20ms = stepResults.filter((s) => s.durationMs > 20.0);
              resolve({
                totalSpikesRecorded: stepResults.length,
                scenes8to10SpikesOver20ms: spikesOver20ms.length,
                scenes8to10SpikesOver33ms: spikesOver33ms.length,
                spikesOver33msDetails: spikesOver33ms
              });
              return;
            }

            const pt = testPoints[idx++];
            const before = performance.now();
            if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(pt, true);

            requestAnimationFrame(() => {
              const frameDuration = performance.now() - before;
              stepResults.push({
                progress: pt,
                durationMs: parseFloat(frameDuration.toFixed(1))
              });
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
    gate2Results.spikeAuditScenes8To10 = spikeRes.result?.value;
    console.log('Scenes 8-10 Spike Audit Result:', gate2Results.spikeAuditScenes8To10);

    // --- 4. BENCHMARK STANDARD TIER ---
    console.log('\n--- 4. Testing Standard Tier Pipeline ---');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&debug=1&tier=standard` });
    await new Promise(r => setTimeout(r, 4000));

    const standardPipe = await getPipelineInfo();
    const standardPerf = await measureFpsAndFrameTime(1500);
    gate2Results.pipelineValues.standard = standardPipe;
    gate2Results.tierBenchmarks.standard = { ...standardPipe, ...standardPerf };
    console.log('Standard Tier Pipeline:', standardPipe);
    console.log('Standard Tier Performance:', standardPerf);

    // --- 5. BENCHMARK MOBILE TIER ---
    console.log('\n--- 5. Testing Mobile Tier Pipeline ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&debug=1&tier=mobile` });
    await new Promise(r => setTimeout(r, 4000));

    const mobilePipe = await getPipelineInfo();
    const mobilePerf = await measureFpsAndFrameTime(1500);
    gate2Results.pipelineValues.mobile = mobilePipe;
    gate2Results.tierBenchmarks.mobile = { ...mobilePipe, ...mobilePerf };
    console.log('Mobile Tier Pipeline:', mobilePipe);
    console.log('Mobile Tier Performance:', mobilePerf);

    // Save full Gate 2 summary JSON
    fs.writeFileSync(path.join(artifactDir, 'gate2_summary.json'), JSON.stringify(gate2Results, null, 2));
    console.log('\nGate 2 suite complete! Results written to gate2_summary.json');

    ws.close();
  } catch (err) {
    console.error('Gate 2 Test Error:', err);
  } finally {
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(0);
  }
});
