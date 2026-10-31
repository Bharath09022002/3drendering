import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ status: res.statusCode });
    }).on('error', () => {
      resolve({ status: 0 });
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

  // Wait for server to respond
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

  console.log('Server is UP. Launching Playwright browser...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 }
  });

  const consoleErrors = [];
  const consoleWarnings = [];
  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      consoleErrors.push(text);
      console.error(`[BROWSER ERROR]: ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push(text);
      console.warn(`[BROWSER WARN]: ${text}`);
    } else {
      consoleLogs.push(text);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message || String(err));
    console.error(`[PAGE CRASH]: ${err.message}`);
  });

  console.log('Navigating to http://localhost:4173...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Check 3D status
  const canvasStats = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      canvasExists: !!canvas,
      width: canvas?.clientWidth,
      height: canvas?.clientHeight,
      drawCalls: window.__THREE_DRAW_CALLS__,
      triangles: window.__THREE_TRIANGLES__,
    };
  });

  console.log('\n--- 3D CANVAS RUNTIME DIAGNOSTICS ---');
  console.log(JSON.stringify(canvasStats, null, 2));

  console.log('\n--- CONSOLE ERRORS COUNT ---');
  console.log(`Errors: ${consoleErrors.length}`);
  console.log(`PageErrors: ${pageErrors.length}`);

  await browser.close();
  server.kill();

  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('\nGATE 4 PASSED: ZERO CONSOLE ERRORS ON PREVIEW.');
    process.exit(0);
  } else {
    console.error('\nGATE 4 FAILED: CONSOLE ERRORS DETECTED.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

