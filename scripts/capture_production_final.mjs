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
  const server = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--host', '0.0.0.0'], {
    shell: true,
    stdio: 'pipe'
  });

  for (let i = 0; i < 30; i++) {
    const res = await checkUrl('http://localhost:4173');
    if (res.status === 200) break;
    await new Promise(r => setTimeout(r, 500));
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 }
  });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('Navigating to standard production URL: http://localhost:4173...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  
  console.log('Waiting for #app-preloader to complete and detach...');
  try {
    await page.waitForSelector('#app-preloader', { state: 'detached', timeout: 10000 });
    console.log('#app-preloader has detached!');
  } catch (e) {
    console.warn('Timed out waiting for preloader detachment, continuing...');
  }

  // Allow 3D scene to settle
  await page.waitForTimeout(2000);

  const canvasStats = await page.evaluate(() => {
    return {
      drawCalls: window.__THREE_DRAW_CALLS__,
      triangles: window.__THREE_TRIANGLES__,
      renderCalls: window.__RENDERER_INFO__?.render?.calls,
      renderTriangles: window.__RENDERER_INFO__?.render?.triangles,
      frame: window.__RENDERER_INFO__?.render?.frame
    };
  });

  console.log('Production runtime stats:', canvasStats);
  console.log('Console errors:', errors);

  await page.screenshot({ path: 'artifacts_phase1/production_render_verified.png' });
  console.log('Screenshot saved to artifacts_phase1/production_render_verified.png');

  await browser.close();
  spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t'], { shell: true });
}

run().catch(console.error);
