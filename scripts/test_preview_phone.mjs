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

  await page.goto('http://localhost:4173?skipLoader=1&debug=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const stats = await page.evaluate(() => {
    return {
      drawCalls: window.__THREE_DRAW_CALLS__,
      triangles: window.__THREE_TRIANGLES__,
      pipeline: window.__ULTRA_PIPELINE__,
      renderer: window.__RENDERER_INFO__?.render
    };
  });

  console.log('Stats at p=0:', stats);
  await page.screenshot({ path: 'artifacts_phase1/preview_rendered_phone.png' });
  console.log('Screenshot saved to artifacts_phase1/preview_rendered_phone.png');

  await browser.close();
  server.kill();
}

run().catch(console.error);

