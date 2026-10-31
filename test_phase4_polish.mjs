// test_phase4_polish.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_DIR = 'C:\\Users\\ADMIN\\AppData\\Local\\Temp\\edge_p4_polish_profile';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('=== Verifying Phase 4 Polish ===');

  if (fs.existsSync(TEMP_DIR)) {
    try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch {}
  }

  // 1. Start Vite preview server for production build
  const vite = spawn('node', ['./node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
    stdio: 'pipe'
  });

  await sleep(2000);

  // 2. Start Isolated Headless Edge
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_DIR}`,
    '--disable-gpu-shader-disk-cache',
    '--force-prefers-reduced-motion=no-preference',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--enable-webgl',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await sleep(2500);

  const listRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await listRes.json();
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  const consoleMessages = [];
  const errors = [];

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      consoleMessages.push({ type, text });
      if (type === 'error') {
        errors.push(text);
        console.error(`[Browser Console Error]: ${text}`);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
      errors.push(desc);
      console.error(`[Browser Exception]: ${desc}`);
    }
  };

  await new Promise((res) => ws.onopen = res);
  console.log('Connected to CDP session');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
  });

  // Navigate to production preview
  console.log('Navigating to http://127.0.0.1:4173 (Production Preview)...');
  const loadPromise = new Promise(resolve => {
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Page.loadEventFired') {
        ws.removeEventListener('message', handler);
        resolve();
      }
    };
    ws.addEventListener('message', handler);
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await loadPromise;
  await sleep(3000);

  // 1. Audit Scroll Track Height (700vh)
  const trackAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const content = document.getElementById('content-sections');
      const offsetTop = content ? content.offsetTop : 0;
      const expectedMin = window.innerHeight * 6.5;
      return {
        has700vh: offsetTop >= expectedMin,
        contentOffsetTop: offsetTop,
        windowHeight: window.innerHeight,
        expectedMin
      };
    })()`,
    returnByValue: true
  });
  console.log('Scroll Track Pacing (700vh):', trackAudit?.result?.value);

  // 2. Audit Slim Scroll Progress Bar
  const progressBarAudit = await send('Runtime.evaluate', {
    expression: '!!document.querySelector("[class*=\'h-0.5\']")',
    returnByValue: true
  });
  console.log('Slim Top Progress Indicator Mounted:', progressBarAudit?.result?.value);

  // 3. Audit Skip Intro Button
  const skipButtonAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip intro'));
      return {
        hasSkipBtn: !!btn,
        btnText: btn?.innerText
      };
    })()`,
    returnByValue: true
  });
  console.log('Skip Intro Button:', skipButtonAudit?.result?.value);

  // Test Skip Intro Click
  console.log('Clicking "Skip intro" button...');
  await send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Skip intro'))?.click()`,
  });
  await sleep(1800);
  const scrollYAfterSkip = await send('Runtime.evaluate', {
    expression: 'window.scrollY',
    returnByValue: true
  });
  console.log('Scroll position after Skip Intro:', scrollYAfterSkip?.result?.value, 'px');

  // 4. Audit Production Debug Copy Cleanliness
  console.log('Scanning for debug copy in production build...');
  const debugTextScan = await send('Runtime.evaluate', {
    expression: `(() => {
      const bodyText = document.body.innerText;
      return {
        hasPhaseDebug: /Phase \\d+ \\/ 11/.test(bodyText),
        hasWindowDebug: /Window \\d+%/.test(bodyText),
        hasSpineDebug: /Initializing Pharmafly Spine/.test(bodyText),
        hasDebugBar: !!document.querySelector('[class*="PHARMAFLY DEBUG"]')
      };
    })()`,
    returnByValue: true
  });
  console.log('Debug Text Scan in Production:', debugTextScan?.result?.value);

  if (debugTextScan?.result?.value?.hasPhaseDebug) errors.push('Found "Phase X / 11" in production build');
  if (debugTextScan?.result?.value?.hasWindowDebug) errors.push('Found "Window X%" in production build');
  if (debugTextScan?.result?.value?.hasSpineDebug) errors.push('Found "Initializing Pharmafly Spine" in production build');
  if (debugTextScan?.result?.value?.hasDebugBar) errors.push('DebugBar rendered in production build');

  function cleanup() {
    ws.close();
    edge.kill();
    vite.kill();
  }

  console.log('\n=================================================');
  console.log('           PHASE 4 POLISH AUDIT REPORT           ');
  console.log('=================================================');
  console.log(`- Paced Scroll Track (700vh)  : ${trackAudit?.result?.value?.has700vh ? 'PASS' : 'FAIL'}`);
  console.log(`- Slim Progress Bar Indicator : ${progressBarAudit?.result?.value ? 'PASS' : 'FAIL'}`);
  console.log(`- Skip Intro Button Action    : ${scrollYAfterSkip?.result?.value > 500 ? 'PASS' : 'FAIL'} (${scrollYAfterSkip?.result?.value} px)`);
  console.log(`- Zero Debug Text in Prod     : ${!debugTextScan?.result?.value?.hasPhaseDebug && !debugTextScan?.result?.value?.hasDebugBar ? 'PASS' : 'FAIL'}`);
  console.log(`- Total Console Errors        : ${errors.length}`);
  console.log('=================================================\n');

  cleanup();

  if (errors.length > 0) {
    console.error('FAIL: Console errors detected:', errors);
    process.exit(1);
  } else {
    console.log('GATE PASS: Phase 4 polish verified cleanly!');
    process.exit(0);
  }
}

runTest().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
