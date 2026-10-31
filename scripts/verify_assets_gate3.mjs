import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  console.log('Starting preview server on port 4173...');
  const server = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--host', '0.0.0.0'], {
    shell: true,
    stdio: 'pipe'
  });

  server.stdout.on('data', d => console.log('[Server stdout]:', d.toString().trim()));
  server.stderr.on('data', d => console.error('[Server stderr]:', d.toString().trim()));

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const res = await checkUrl('http://localhost:4173');
    if (res.status === 200) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (!ready) {
    console.error('Server failed to start on localhost:4173');
    server.kill();
    process.exit(1);
  }

  console.log('Server is UP. Testing all static assets directly via HTTP GET...');

  const staticAssets = [
    '/assets/glb/character.glb',
    '/assets/hdri/studio_small_08_1k.hdr',
    '/assets/glb/bike.glb',
    '/assets/glb/phone.glb',
    '/favicon.svg'
  ];

  const results = [];
  for (const asset of staticAssets) {
    const res = await checkUrl(`http://localhost:4173${asset}`);
    console.log(`Asset ${asset}: HTTP ${res.status}`);
    results.push({ asset, status: res.status });
  }

  console.log('\nLaunching Playwright browser to monitor real runtime network requests...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage();
  const pageRequests = [];
  page.on('response', (res) => {
    pageRequests.push({
      url: res.url(),
      status: res.status(),
      ok: res.ok()
    });
  });

  console.log('Navigating to http://localhost:4173...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n--- BROWSER NETWORK REQUESTS ---');
  let hasFailure = false;
  for (const req of pageRequests) {
    console.log(`[${req.status}] ${req.url}`);
    if (req.status >= 400) {
      hasFailure = true;
    }
  }

  await browser.close();
  server.kill();

  const allStatic200 = results.every(r => r.status === 200);
  console.log('\n--- GATE 3 SUMMARY ---');
  console.log('Direct asset HTTP 200 check:', allStatic200 ? 'PASS' : 'FAIL');
  console.log('Page runtime requests (no 4xx/5xx):', !hasFailure ? 'PASS' : 'FAIL');

  if (allStatic200 && !hasFailure) {
    console.log('ALL ASSET URLS RETURNED 200. GATE 3 PASSED.');
    process.exit(0);
  } else {
    console.error('GATE 3 FAILED.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

