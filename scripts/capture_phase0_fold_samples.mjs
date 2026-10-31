// scripts/capture_phase0_fold_samples.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1\\phase0';

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

const PORT = 4198;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Phase 0 Audit Server running at http://127.0.0.1:${PORT}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const userDataDir = path.resolve(__dirname, '../.test-phase0-profile');
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
    '--remote-debugging-port=9248',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let listRes;
  for (let retry = 0; retry < 15; retry++) {
    await new Promise(r => setTimeout(r, 600));
    try {
      listRes = await fetch('http://127.0.0.1:9248/json/list');
      if (listRes.ok) break;
    } catch (e) {}
  }
  if (!listRes || !listRes.ok) throw new Error('Could not connect to browser on port 9248');

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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to app with ?skipLoader=1&debug=1...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&debug=1` });
    await new Promise(r => setTimeout(r, 3500));

    const FOLD_SPAN = 0.20;
    const FOLD_START = 0.184;

    const samplePoints = [
      { f: 0.00, desc: 'fold_0.00' },
      { f: 0.15, desc: 'fold_0.15' },
      { f: 0.30, desc: 'fold_0.30' },
      { f: 0.45, desc: 'fold_0.45' },
      { f: 0.60, desc: 'fold_0.60' },
      { f: 0.75, desc: 'fold_0.75' },
      { f: 0.90, desc: 'fold_0.90' },
      { f: 1.00, desc: 'fold_1.00' },
    ];

    const auditResults = [];

    for (const pt of samplePoints) {
      const masterP = FOLD_START + pt.f * FOLD_SPAN;

      // Scroll to exact master progress
      await send('Runtime.evaluate', {
        expression: `
          (function() {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo(0, ${masterP} * max);
          })()
        `
      });

      // Let Three.js and GSAP settle
      await new Promise(r => setTimeout(r, 600));

      // Query active objects and visibility in Three.js scene
      const sceneAudit = await send('Runtime.evaluate', {
        expression: `
          (function() {
            const results = {
              masterProgress: ${masterP},
              foldProgress: ${pt.f},
              visibleMeshes: [],
              phoneOldVisible: false,
              foldableVisible: false,
              morphPlaneVisible: false,
              cloudSceneVisible: false,
              packetVisible: false,
              underlayVisible: false,
              drawCalls: window.__THREE_DRAW_CALLS__ || 0,
              triangles: window.__THREE_TRIANGLES__ || 0
            };

            // Inspect scene
            const scene = window.__THREE_SCENE__;
            // Traverse all root objects in canvas
            const canvas = document.querySelector('canvas');
            if (canvas && canvas.__r3f) {
              const r3fScene = canvas.__r3f.root.store.getState().scene;
              const camera = canvas.__r3f.root.store.getState().camera;
              results.cameraPos = [camera.position.x, camera.position.y, camera.position.z];
              results.cameraLayers = camera.layers.mask;

              r3fScene.traverse(obj => {
                if (obj.name === 'hero-fold-phone-rig' || obj.name === 'galaxy-z-fold-5') {
                  results.phoneOldVisible = obj.visible;
                }
                if (obj.name === 'Foldable-Z-Fold') {
                  results.foldableVisible = obj.visible;
                }
                if (obj.name === 'scene-5-cloud') {
                  results.cloudSceneVisible = obj.visible;
                }
                if (obj.isMesh && obj.visible) {
                  // Check if it's the morph plane
                  if (obj.geometry && obj.geometry.type === 'PlaneGeometry' && obj.renderOrder === 100) {
                    results.morphPlaneVisible = obj.visible;
                    results.morphPlanePos = [obj.position.x, obj.position.y, obj.position.z];
                    results.morphPlaneScale = [obj.scale.x, obj.scale.y, obj.scale.z];
                  }
                  // Check if underlay mesh
                  if (obj.material && obj.material.map && obj.material.transparent && obj.parent && obj.parent.name === 'scene-5-cloud') {
                    results.underlayVisible = obj.visible && (obj.material.opacity > 0.01);
                    results.underlayOpacity = obj.material.opacity;
                  }
                  // Check parcel
                  if (obj.parent && obj.parent.parent && obj.parent.parent.name === 'scene-5-cloud' && obj.material && obj.material.color && obj.material.color.getHexString() === 'ff6b4a') {
                    results.packetVisible = obj.visible;
                    results.packetPos = [obj.parent.position.x, obj.parent.position.y, obj.parent.position.z];
                  }
                }
              });
            }
            return results;
          })()
        `,
        returnByValue: true
      });

      const auditData = sceneAudit.result?.value || {};
      auditResults.push({ ...pt, masterP, ...auditData });

      // Capture screenshot
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const filename = `${pt.desc}.png`;
      const outPath = path.join(artifactDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Captured [${pt.desc}]: master=${masterP.toFixed(4)}, saved to ${outPath}`);
    }

    // Save full JSON audit log
    fs.writeFileSync(path.join(artifactDir, 'fold_audit.json'), JSON.stringify(auditResults, null, 2));
    console.log(`Fold Audit data written to fold_audit.json`);

    ws.close();
  } catch (err) {
    console.error('Audit capture failed:', err);
  } finally {
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(0);
  }
});

