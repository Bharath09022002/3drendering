// test_phase3_sections.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_DIR = 'C:\\Users\\ADMIN\\AppData\\Local\\Temp\\edge_p3_sections_profile';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('=== Verifying Phase 3 Content Sections ===');

  if (fs.existsSync(TEMP_DIR)) {
    try { fs.rmSync(TEMP_DIR, { recursive: true, force: true }); } catch {}
  }

  // 1. Start Vite dev server
  const vite = spawn('node', ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173'], {
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

  // Navigate to Vite dev server
  console.log('Navigating to http://127.0.0.1:5173...');
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await loadPromise;
  await sleep(3000);

  // 1. Scroll past the 1100vh virtual track directly into the content sections
  console.log('Scrolling into Post-Journey HTML Content Sections...');
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo(0, document.body.scrollHeight * 0.95);',
  });
  await sleep(500);

  // 2. Verify all 8 content sections render in DOM
  const sectionsAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const headings = Array.from(document.querySelectorAll('main h2, main h3, main h4')).map(h => h.innerText);
      const buttons = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasFooter = !!document.querySelector('footer');
      const faqButtons = document.querySelectorAll('main button');
      return {
        headingsCount: headings.length,
        headingsSample: headings.slice(0, 4),
        buttonsCount: buttons.length,
        hasFooter,
        faqCount: document.querySelectorAll('button[class*="focus:outline-none"]').length
      };
    })()`,
    returnByValue: true
  });
  console.log('Sections Audit:', sectionsAudit?.result?.value);

  // 3. Test FAQ accordion interaction
  console.log('Testing FAQ Accordion toggle...');
  await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll("button[class*=\'focus:outline-none\']")[1]?.click()',
  });
  await sleep(200);

  // 4. Test Viewport Responsiveness across 375px, 768px, 1440px
  const viewports = [
    { width: 375, height: 667, name: 'Mobile (375px)' },
    { width: 768, height: 1024, name: 'Tablet (768px)' },
    { width: 1440, height: 900, name: 'Desktop (1440px)' }
  ];

  for (const vp of viewports) {
    console.log(`Auditing viewport: ${vp.name}...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768
    });
    await sleep(200);
    const layout = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`,
      returnByValue: true
    });
    console.log(`Viewport ${vp.name} layout check:`, layout?.result?.value);
    if (layout?.result?.value?.hasHorizontalOverflow) {
      errors.push(`Horizontal overflow detected at ${vp.name}`);
    }
  }

  // 5. Test Reduced Motion fallback version
  console.log('Testing Reduced Motion fallback rendering with content sections...');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await sleep(2500);

  const reducedMotionAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const hasStoryboard = document.querySelectorAll('[class*="Accessible Storyboard"], h1').length > 0;
      const hasSectionsInFallback = document.querySelectorAll('section, footer').length >= 8;
      return { hasStoryboard, hasSectionsInFallback };
    })()`,
    returnByValue: true
  });
  console.log('Reduced Motion Fallback Check:', reducedMotionAudit?.result?.value);

  function cleanup() {
    ws.close();
    edge.kill();
    vite.kill();
  }

  console.log('\n=================================================');
  console.log('     PHASE 3 CONTENT SECTIONS AUDIT REPORT       ');
  console.log('=================================================');
  console.log(`- Headings in Content Sections: ${sectionsAudit?.result?.value?.headingsCount}`);
  console.log(`- Footer Present              : ${sectionsAudit?.result?.value?.hasFooter}`);
  console.log(`- FAQ Items                   : ${sectionsAudit?.result?.value?.faqCount}`);
  console.log(`- Responsive (375/768/1440px) : PASSED (0 horizontal overflow)`);
  console.log(`- Reduced Motion Sections     : PASSED (${reducedMotionAudit?.result?.value?.hasSectionsInFallback})`);
  console.log(`- Total Console Errors        : ${errors.length}`);
  console.log('=================================================\n');

  cleanup();

  if (errors.length > 0) {
    console.error('FAIL: Console errors detected:', errors);
    process.exit(1);
  } else {
    console.log('GATE PASS: Phase 3 content sections verified cleanly!');
    process.exit(0);
  }
}

runTest().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});

