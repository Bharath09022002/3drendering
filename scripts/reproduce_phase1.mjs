// scripts/reproduce_phase1.mjs
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.resolve(__dirname, '../artifacts_phase1');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

async function run() {
  console.log('--- Step 1: Starting vite preview on port 4173 ---');
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--host', '0.0.0.0'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
    shell: true
  });

  previewProcess.stdout.on('data', d => console.log('[preview stdout]:', d.toString().trim()));
  previewProcess.stderr.on('data', d => console.log('[preview stderr]:', d.toString().trim()));

  // Wait for preview server to be ready
  await new Promise(r => setTimeout(r, 2000));

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`--- Step 2: Launching Playwright with browser: ${executablePath} ---`);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--ignore-gpu-blocklist',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 }
  });

  const consoleLogs = [];
  const pageErrors = [];
  const failedRequests = [];
  const responses4xx5xx = [];

  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    consoleLogs.push(entry);
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
    console.error('[BROWSER PAGE ERROR]:', err);
  });

  page.on('requestfailed', req => {
    const entry = { url: req.url(), failure: req.failure()?.errorText };
    failedRequests.push(entry);
    console.error('[REQUEST FAILED]:', req.url(), req.failure()?.errorText);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      const entry = { url: res.url(), status: res.status() };
      responses4xx5xx.push(entry);
      console.error(`[HTTP ${res.status()}]:`, res.url());
    }
  });

  console.log('--- Step 3: Navigating to http://localhost:4173/ ---');
  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.log('Navigation networkidle timeout/error:', e.message);
  }

  // Wait for 3D animation / initial frames to render
  await page.waitForTimeout(3000);

  // Check Canvas element presence and WebGL state
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { hasCanvas: false };
    const rect = canvas.getBoundingClientRect();
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return {
      hasCanvas: true,
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      glVendor: gl ? gl.getParameter(gl.VENDOR) : null,
      glRenderer: gl ? gl.getParameter(gl.RENDERER) : null,
      drawCalls: window.__THREE_DRAW_CALLS__,
      triangles: window.__THREE_TRIANGLES__
    };
  });

  console.log('--- Canvas & WebGL Info ---', canvasInfo);

  // Take screenshot of preview
  const screenshotPath = path.join(screenshotDir, 'preview_reproduce_phase1.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  // Write summary report
  const summary = {
    canvasInfo,
    consoleLogs,
    pageErrors,
    failedRequests,
    responses4xx5xx,
    renders3D: Boolean(canvasInfo.hasCanvas && canvasInfo.width > 0 && canvasInfo.height > 0 && canvasInfo.drawCalls > 0)
  };

  fs.writeFileSync(path.join(screenshotDir, 'phase1_report.json'), JSON.stringify(summary, null, 2));

  await browser.close();
  previewProcess.kill();
  console.log('--- Phase 1 check finished ---');
}

run().catch(err => {
  console.error('Fatal in reproduce_phase1:', err);
  process.exit(1);
});
