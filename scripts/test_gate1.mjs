// scripts/test_gate1.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1\\gate1';

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

const PORT = 4210;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Gate 1 Test Server running at http://127.0.0.1:${PORT}...`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browserBin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const userDataDir = path.resolve(__dirname, `../.test-gate1-suite-profile-${Date.now()}`);
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browserPort = 9275;
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
    '--remote-allow-origins=*',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let wsBrowserUrl = null;
  browser.stderr?.on('data', d => {
    const str = d.toString();
    console.error('Browser stderr:', str);
    const m = str.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) {
      wsBrowserUrl = m[1];
      console.log('Detected DevTools WebSocket URL:', wsBrowserUrl);
    }
  });
  browser.on('exit', (code, signal) => console.log(`Browser process exited with code ${code}, signal ${signal}`));

  let listRes;
  for (let retry = 0; retry < 40; retry++) {
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
      } else if (listRes) {
        console.log('Fetch returned status:', listRes.status);
      }
    } catch (e) {
      // connecting
    }
  }
  if (!listRes || !listRes.ok) throw new Error(`Could not connect to browser on port ${browserPort}`);

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

    console.log('Navigating to landing page...');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&debug=1` });
    await new Promise(r => setTimeout(r, 4000));

    const FOLD_SPAN = 0.20;
    const FOLD_START = 0.184;

    const sampleFolds = [0.00, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
    const gate1Results = {
      drawCallChecks: [],
      texelPixelRatio: null,
      magentaChecks: null,
      pixelDiff: null,
      screenshots: []
    };

    console.log('\n--- 1. Testing Screen Texture Draw Calls (Gate 1c) ---');
    for (const f of sampleFolds) {
      const masterP = FOLD_START + f * FOLD_SPAN;

      // Scroll reliably using __SCROLL_TO_PROGRESS__
      await send('Runtime.evaluate', {
        expression: `
          (function() {
            if (window.__SCROLL_TO_PROGRESS__) {
              window.__SCROLL_TO_PROGRESS__(${masterP}, true);
            }
          })()
        `
      });
      await new Promise(r => setTimeout(r, 700));

      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (function() {
            let screenTextureDraws = 0;
            const canvas = document.querySelector('canvas');
            if (canvas && canvas.__r3f) {
              const scene = canvas.__r3f.root.store.getState().scene;
              const fbo = window.__STORY_FBO__;
              const fboTex = fbo ? fbo.texture : null;

              scene.traverse(obj => {
                if (obj.isMesh && obj.visible) {
                  const mat = obj.material;
                  if (mat && mat.map && (mat.map === fboTex || mat.map.isCanvasTexture)) {
                    // Check full parent chain visibility
                    let cur = obj.parent;
                    let parentVisible = true;
                    while (cur) {
                      if (!cur.visible) { parentVisible = false; break; }
                      cur = cur.parent;
                    }
                    if (parentVisible) screenTextureDraws++;
                  }
                }
              });
            }
            return {
              foldProgress: ${f},
              masterProgress: ${masterP},
              screenTextureDrawCalls: screenTextureDraws,
              totalCalls: window.__THREE_DRAW_CALLS__ || 0,
              totalTriangles: window.__THREE_TRIANGLES__ || 0
            };
          })()
        `,
        returnByValue: true
      });

      const data = evalRes.result?.value;
      gate1Results.drawCallChecks.push(data);
      console.log(`[f=${f.toFixed(2)}]: Screen texture meshes = ${data?.screenTextureDrawCalls} (Total: ${data?.totalCalls} calls, ${data?.totalTriangles} tris)`);

      // Capture screenshot for 8-step walkthrough
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const filename = `gate1_f_${f.toFixed(2)}.png`;
      const outPath = path.join(artifactDir, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      gate1Results.screenshots.push({ f, filename, path: outPath });
    }

    console.log('\n--- 2. Testing Texel:Pixel Ratio at foldProgress 0.90 (Gate 1b) ---');
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          const masterP = ${FOLD_START + 0.90 * FOLD_SPAN};
          if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(masterP, true);
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const texelRes = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const fbo = window.__STORY_FBO__;
          const dpr = window.devicePixelRatio || 1;
          const vpWidth = window.innerWidth * dpr;
          const fboWidth = fbo ? fbo.width : 0;
          const ratio = fboWidth / vpWidth;
          return { fboWidth, vpWidth, dpr, ratio: parseFloat(ratio.toFixed(4)) };
        })()
      `,
      returnByValue: true
    });
    gate1Results.texelPixelRatio = texelRes.result?.value;
    console.log('Texel:Pixel Ratio Result:', gate1Results.texelPixelRatio);

    console.log('\n--- 3. Testing Handover Continuity & Pixel Diff at f=0.90 (Gate 1d) ---');
    // Pre-handover frame (f = 0.895, FBO plane)
    const masterPre = FOLD_START + 0.895 * FOLD_SPAN;
    await send('Runtime.evaluate', {
      expression: `if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(${masterPre}, true);`
    });
    await new Promise(r => setTimeout(r, 800));
    const shotPre = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'handover_pre_f0895.png'), Buffer.from(shotPre.data, 'base64'));

    // Post-handover frame (f = 0.905, Direct Layer 1)
    const masterPost = FOLD_START + 0.905 * FOLD_SPAN;
    await send('Runtime.evaluate', {
      expression: `if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(${masterPost}, true);`
    });
    await new Promise(r => setTimeout(r, 800));
    const shotPost = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'handover_post_f0905.png'), Buffer.from(shotPost.data, 'base64'));

    // Compute pixel difference between bufPre and bufPost via browser Canvas
    const diffRes = await send('Runtime.evaluate', {
      expression: `
        (async function() {
          function loadImage(src) {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.src = src;
            });
          }
          const img1 = await loadImage("data:image/png;base64,${shotPre.data}");
          const img2 = await loadImage("data:image/png;base64,${shotPost.data}");

          const canvas = document.createElement('canvas');
          canvas.width = img1.width;
          canvas.height = img1.height;
          const ctx = canvas.getContext('2d');

          ctx.drawImage(img1, 0, 0);
          const d1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img2, 0, 0);
          const d2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

          let diffSum = 0;
          let count = 0;
          for (let i = 0; i < d1.length; i += 4) {
            // Check right 55% of canvas (3D story world view)
            const pixelX = (i / 4) % canvas.width;
            if (pixelX > canvas.width * 0.45) {
              const rDiff = Math.abs(d1[i] - d2[i]);
              const gDiff = Math.abs(d1[i + 1] - d2[i + 1]);
              const bDiff = Math.abs(d1[i + 2] - d2[i + 2]);
              diffSum += (rDiff + gDiff + bDiff) / 3;
              count++;
            }
          }
          const macd = (diffSum / (count * 255)) * 100;
          return { macd: parseFloat(macd.toFixed(4)), sampledPixels: count };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    gate1Results.pixelDiff = diffRes.result?.value;
    console.log('Handover Pixel Diff (MACD):', gate1Results.pixelDiff);

    console.log('\n--- 4. Testing Magenta Edge/Corner Coverage (Gate 1a) ---');
    // Navigate with ?magenta=1
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?skipLoader=1&magenta=1` });
    await new Promise(r => setTimeout(r, 3000));

    // Test at f = 0.90
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          const masterP = ${FOLD_START + 0.90 * FOLD_SPAN};
          if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(masterP, true);
        })()
      `
    });
    await new Promise(r => setTimeout(r, 700));

    const magentaCheckAt090 = await send('Runtime.evaluate', {
      expression: `
        (async function() {
          const canvas = document.querySelector('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          const w = canvas.width;
          const h = canvas.height;
          const points = [
            { name: 'topLeft', x: 2, y: 2 },
            { name: 'topRight', x: w - 3, y: 2 },
            { name: 'bottomLeft', x: 2, y: h - 3 },
            { name: 'bottomRight', x: w - 3, y: h - 3 },
            { name: 'topMid', x: Math.floor(w / 2), y: 2 },
            { name: 'bottomMid', x: Math.floor(w / 2), y: h - 3 },
            { name: 'leftMid', x: 2, y: Math.floor(h / 2) },
            { name: 'rightMid', x: w - 3, y: Math.floor(h / 2) }
          ];

          const pixels = new Uint8Array(4);
          let magentaCount = 0;
          const details = [];

          points.forEach(pt => {
            gl.readPixels(pt.x, pt.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            const isMagenta = pixels[0] > 200 && pixels[1] < 50 && pixels[2] > 200;
            if (isMagenta) magentaCount++;
            details.push({ ...pt, rgba: Array.from(pixels), isMagenta });
          });

          return { magentaCount, details, foldProgress: 0.90 };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    const shotMagenta090 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'magenta_check_f090.png'), Buffer.from(shotMagenta090.data, 'base64'));

    // Test at f = 1.00
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          const masterP = ${FOLD_START + 1.00 * FOLD_SPAN};
          if (window.__SCROLL_TO_PROGRESS__) window.__SCROLL_TO_PROGRESS__(masterP, true);
        })()
      `
    });
    await new Promise(r => setTimeout(r, 700));

    const magentaCheckAt100 = await send('Runtime.evaluate', {
      expression: `
        (async function() {
          const canvas = document.querySelector('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          const w = canvas.width;
          const h = canvas.height;
          const points = [
            { name: 'topLeft', x: 2, y: 2 },
            { name: 'topRight', x: w - 3, y: 2 },
            { name: 'bottomLeft', x: 2, y: h - 3 },
            { name: 'bottomRight', x: w - 3, y: h - 3 },
            { name: 'topMid', x: Math.floor(w / 2), y: 2 },
            { name: 'bottomMid', x: Math.floor(w / 2), y: h - 3 },
            { name: 'leftMid', x: 2, y: Math.floor(h / 2) },
            { name: 'rightMid', x: w - 3, y: Math.floor(h / 2) }
          ];

          const pixels = new Uint8Array(4);
          let magentaCount = 0;
          const details = [];

          points.forEach(pt => {
            gl.readPixels(pt.x, pt.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            const isMagenta = pixels[0] > 200 && pixels[1] < 50 && pixels[2] > 200;
            if (isMagenta) magentaCount++;
            details.push({ ...pt, rgba: Array.from(pixels), isMagenta });
          });

          return { magentaCount, details, foldProgress: 1.00 };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    const shotMagenta100 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'magenta_check_f100.png'), Buffer.from(shotMagenta100.data, 'base64'));

    gate1Results.magentaChecks = {
      at090: magentaCheckAt090.result?.value,
      at100: magentaCheckAt100.result?.value
    };
    console.log('Magenta Checks Result:', gate1Results.magentaChecks);

    console.log('\n--- 5. Testing Reverse Scroll Symmetry (Gate 1e) ---');
    // Reverse scroll from f=1.0 down to f=0.45
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          if (window.__SCROLL_TO_PROGRESS__) {
            window.__SCROLL_TO_PROGRESS__(${FOLD_START + 0.45 * FOLD_SPAN}, true);
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotRev = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'reverse_scroll_f045.png'), Buffer.from(shotRev.data, 'base64'));
    console.log('Reverse scroll at f=0.45 captured.');

    // Save full Gate 1 summary JSON
    fs.writeFileSync(path.join(artifactDir, 'gate1_summary.json'), JSON.stringify(gate1Results, null, 2));
    console.log('\nAll Gate 1 tests complete! Summary written to gate1_summary.json');

    ws.close();
  } catch (err) {
    console.error('Gate 1 Test Error:', err);
  } finally {
    try { browser.kill(); } catch (e) {}
    server.close();
    process.exit(0);
  }
});
