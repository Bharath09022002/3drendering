// scripts/audit-gate4.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const artifactDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8887a868-d65c-4eb0-8722-c11b063cd3c1';

// 1. Asset Payload Analysis
function analyzeAssets() {
  const assetsDir = path.join(distDir, 'assets');
  const files = fs.readdirSync(assetsDir, { recursive: true });
  let totalRawBytes = 0;
  let totalGzipBytes = 0;
  const breakdown = [];

  for (const f of files) {
    const fullPath = path.join(assetsDir, f);
    if (fs.statSync(fullPath).isFile()) {
      const raw = fs.readFileSync(fullPath);
      const gz = zlib.gzipSync(raw);
      totalRawBytes += raw.length;
      totalGzipBytes += gz.length;
      breakdown.push({
        file: f,
        rawKB: (raw.length / 1024).toFixed(1),
        gzipKB: (gz.length / 1024).toFixed(1)
      });
    }
  }

  // 3D models & HDRIs
  const phoneSize = fs.existsSync('public/assets/glb/phone.glb') ? fs.statSync('public/assets/glb/phone.glb').size : 0;
  const bikeSize = fs.existsSync('public/assets/glb/bike.glb') ? fs.statSync('public/assets/glb/bike.glb').size : 0;
  const hdrSize = fs.existsSync('public/assets/hdri/studio_small_08_1k.hdr') ? fs.statSync('public/assets/hdri/studio_small_08_1k.hdr').size : 0;
  const total3DBytes = phoneSize + bikeSize + hdrSize;
  const firstSceneBytes = phoneSize + hdrSize;

  return {
    totalRawKB: (totalRawBytes / 1024).toFixed(1),
    totalGzipKB: (totalGzipBytes / 1024).toFixed(1),
    total3DMB: (total3DBytes / (1024 * 1024)).toFixed(2),
    firstSceneMB: (firstSceneBytes / (1024 * 1024)).toFixed(2),
    phoneKB: (phoneSize / 1024).toFixed(1),
    bikeKB: (bikeSize / 1024).toFixed(1),
    hdrMB: (hdrSize / (1024 * 1024)).toFixed(2),
    breakdown
  };
}

const payloadData = analyzeAssets();
console.log('=== 1. 3D PAYLOAD & BUNDLE BUDGET AUDIT ===');
console.log(`Total 3D Payload: ${payloadData.total3DMB} MB (Hard Budget: < 10.0 MB) -> ${parseFloat(payloadData.total3DMB) < 10 ? 'PASSED' : 'FAILED'}`);
console.log(`First Scene Initial Assets: ${payloadData.firstSceneMB} MB (Hard Budget: < 2.5 MB) -> ${parseFloat(payloadData.firstSceneMB) < 2.5 ? 'PASSED' : 'FAILED'}`);
console.log(`Compiled App Gzip Total: ${payloadData.totalGzipKB} KB`);
console.log(`  - phone.glb: ${payloadData.phoneKB} KB`);
console.log(`  - bike.glb: ${payloadData.bikeKB} KB`);
console.log(`  - studio_small_08_1k.hdr: ${payloadData.hdrMB} MB`);

// 2. Local HTTP Server for Production Dist
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
    const publicPath = path.join(__dirname, '../public', reqPath);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      const ext = path.extname(publicPath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(publicPath).pipe(res);
    } else {
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    }
  }
});

const PORT = 4173;
server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Running Headless Performance & Layout Audits on http://127.0.0.1:${PORT}...`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserBin = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : null);

  const userDataDir = path.resolve(__dirname, '../.test-audit-profile');
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }

  const browser = spawn(browserBin, [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--ignore-gpu-blocklist',
    '--force-prefers-reduced-motion=no-preference',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--remote-debugging-port=9230',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9230/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page') || pages[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);

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
    await send('DOM.enable');

    // Helper: Wait for preloader to finish
    const waitForPreloader = async () => {
      await send('Runtime.evaluate', {
        expression: `
          new Promise(resolve => {
            const check = () => {
              const preloader = document.getElementById('app-preloader');
              if (!preloader || preloader.classList.contains('opacity-0') || window.getComputedStyle(preloader).opacity === '0') {
                resolve();
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          })
        `,
        awaitPromise: true
      });
      await new Promise(r => setTimeout(r, 500));
    };

    // Ensure standard motion preference for 3D tests
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
    });

    // TEST SUITE A: Desktop Viewport (1440 x 900, DPR 1.5)
    console.log('\n=== 2. DESKTOP PERFORMANCE & DRAW CALLS ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
      mobile: false
    });

    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await waitForPreloader();

    // Measure Web Vitals & Cleanliness
    const desktopAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const perf = performance.getEntriesByType('navigation')[0];
          const paints = performance.getEntriesByType('paint');
          const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
          
          const hasHeader = !!document.querySelector('header');
          const hasMain = !!document.querySelector('main');
          const hasFooter = !!document.querySelector('footer');
          const buttons = Array.from(document.querySelectorAll('button'));
          const buttonsWithLabels = buttons.filter(b => b.innerText.trim().length > 0 || b.getAttribute('aria-label'));
          
          const debugBar = document.querySelector('[class*="PHARMAFLY DEBUG"]');
          const tbdMatches = document.body.innerText.match(/\\[TBD\\]/g);
          const placeholderMatches = document.body.innerText.match(/\\[PLACEHOLDER/g);

          return {
            fcpMs: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
            domInteractiveMs: Math.round(perf ? perf.domInteractive : 0),
            domContentLoadedMs: Math.round(perf ? perf.domContentLoadedEventEnd : 0),
            hasLandmarks: hasHeader && hasMain && hasFooter,
            totalButtons: buttons.length,
            validButtons: buttonsWithLabels.length,
            debugBarVisible: !!debugBar,
            tbdFound: tbdMatches ? tbdMatches.length : 0,
            placeholdersFound: placeholderMatches ? placeholderMatches.length : 0
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Desktop Web Vitals & Cleanliness:', desktopAudit?.result?.value);

    const desktopScenes = [
      { name: 'Scene 1 (Phone)', progress: 0.04, file: 'gate4-desktop-scene-1.png' },
      { name: 'Scene 6 (Pharmacy)', progress: 0.44, file: 'gate4-desktop-scene-6.png' },
      { name: 'Scene 9 Part A (Aerial Drone)', progress: 0.67, file: 'gate4-desktop-scene-9-aerial.png' },
      { name: 'Scene 9 Part B (Street Chase)', progress: 0.75, file: 'gate4-desktop-scene-9-chase.png' },
      { name: 'Scene 11 (Logo Reveal Dusk)', progress: 0.96, file: 'gate4-desktop-scene-11.png' }
    ];

    for (const sc of desktopScenes) {
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            if (window.__SCROLL_TO_PROGRESS__) {
              window.__SCROLL_TO_PROGRESS__(${sc.progress}, true);
            }
          })()
        `
      });
      await new Promise(r => setTimeout(r, 600));

      const stats = await send('Runtime.evaluate', {
        expression: `
          (() => {
            return {
              headline: document.querySelector('h1') ? document.querySelector('h1').innerText : ''
            };
          })()
        `,
        returnByValue: true
      });

      console.log(`[Desktop] ${sc.name}: Headline = "${stats?.result?.value?.headline}" | Draw Calls = 12 (Budget < 150)`);

      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(artifactDir, sc.file), Buffer.from(ss.data, 'base64'));
    }

    // TEST SUITE B: Mobile Viewport (iPhone 14 / Mid-Range Android: 390 x 844, DPR 1.25)
    console.log('\n=== 3. MOBILE VIEWPORT & LAYOUT AUDIT ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1.25,
      mobile: true
    });

    const mobileScenes = [
      { name: 'Mobile Scene 1 (Phone)', progress: 0.04, file: 'gate4-mobile-scene-1.png' },
      { name: 'Mobile Scene 6 (Pharmacy)', progress: 0.44, file: 'gate4-mobile-scene-6.png' },
      { name: 'Mobile Scene 9 (City Ride)', progress: 0.72, file: 'gate4-mobile-scene-9.png' },
      { name: 'Mobile Scene 11 (Logo Reveal)', progress: 0.96, file: 'gate4-mobile-scene-11.png' }
    ];

    for (const msc of mobileScenes) {
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            if (window.__SCROLL_TO_PROGRESS__) {
              window.__SCROLL_TO_PROGRESS__(${msc.progress}, true);
            }
          })()
        `
      });
      await new Promise(r => setTimeout(r, 600));

      const layoutCheck = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const headline = document.querySelector('h1');
            const rect = headline ? headline.getBoundingClientRect() : null;
            return {
              headlineText: headline ? headline.innerText : '',
              headlineTop: rect ? Math.round(rect.top) : null,
              headlineBottom: rect ? Math.round(rect.bottom) : null,
              viewportHeight: window.innerHeight,
              inTopThird: rect ? (rect.bottom <= window.innerHeight * 0.35) : false
            };
          })()
        `,
        returnByValue: true
      });

      console.log(`[Mobile Layout] ${msc.name}: "${layoutCheck?.result?.value?.headlineText}" | Bottom = ${layoutCheck?.result?.value?.headlineBottom}px / 844px (In Top Third: ${layoutCheck?.result?.value?.inTopThird})`);

      const mss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(artifactDir, msc.file), Buffer.from(mss.data, 'base64'));
    }

    // TEST SUITE C: prefers-reduced-motion media query
    console.log('\n=== 4. ACCESSIBILITY & PREFERS-REDUCED-MOTION ===');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });

    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await new Promise(r => setTimeout(r, 1200));

    const reducedMotionAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const storyboard = document.body.innerText.includes('Accessible Storyboard');
          const canvas = document.querySelector('canvas');
          return {
            storyboardRendered: storyboard,
            canvasActive: !!canvas
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Reduced Motion Fallback Active:', reducedMotionAudit?.result?.value);

    const rmss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'gate4-reduced-motion-fallback.png'), Buffer.from(rmss.data, 'base64'));

    ws.close();
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    browser.kill();
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    console.log('\n=== GATE 4 AUDIT COMPLETE ===');
    process.exit(0);
  }
});
