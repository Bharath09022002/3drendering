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

  // 1. Capture Human Debug Stage (Turnaround of all 3 characters)
  console.log('Navigating to turnaround stage...');
  await page.goto('http://localhost:4173?skipLoader=1&human=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'artifacts_phase1/characters_turnaround_stage.png' });
  console.log('Saved characters_turnaround_stage.png');

  // 2. Capture Scene 10 Handover at 93% scroll (localP ~ 0.50: active face-to-face handover)
  console.log('Navigating to Scene 10...');
  await page.goto('http://localhost:4173?skipLoader=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, totalHeight * 0.935);
  });
  await page.waitForTimeout(3000);

  const stats = await page.evaluate(() => {
    return {
      drawCalls: window.__THREE_DRAW_CALLS__,
      triangles: window.__THREE_TRIANGLES__,
      scrollP: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)).toFixed(3)
    };
  });
  console.log('Scene 10 stats:', stats);

  await page.screenshot({ path: 'artifacts_phase1/scene10_handover_upgraded.png' });
  console.log('Saved scene10_handover_upgraded.png');

  await browser.close();
  spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t'], { shell: true });
}

run().catch(console.error);
