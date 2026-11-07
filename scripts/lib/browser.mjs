/**
 * Helper uji browser (Chrome DevTools Protocol) tanpa dependency tambahan.
 * Dipakai oleh scripts/check-sync.mjs.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findChrome() {
  return CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

/** Server statis kecil (fallback kalau Python tidak tersedia). */
export async function startStaticServer(distDir, port) {
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(distDir, clean === '/' ? 'index.html' : clean);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return { stop: () => server.close() };
}

/** Jalankan `python serve.py` (static + API JSON) dengan data sementara. */
export async function startPythonServer({ port, apiPort, dataDir }) {
  const child = spawn('python', ['serve.py'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), API_PORT: String(apiPort), DATA_DIR: dataDir },
    stdio: 'ignore',
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) {
        return {
          stop: () => {
            child.kill();
            fs.rmSync(dataDir, { recursive: true, force: true });
          },
        };
      }
    } catch {
      // belum siap
    }
    await sleep(250);
  }

  child.kill();
  throw new Error('serve.py tidak merespons /api/health.');
}


/** Buka Chrome headless dan kembalikan API CDP yang ringkas. */
export async function openBrowser({ baseUrl, profileSuffix = '', debugPort, windowSize = { width: 1280, height: 900 } }) {
  const chromePath = findChrome();
  if (!chromePath) throw new Error('Chrome tidak ditemukan.');

  const profile = path.join(os.tmpdir(), `siaga-${profileSuffix || 'test'}-${Date.now()}`);
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--window-size=${windowSize.width},${windowSize.height}`,
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let wsUrl = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {
      // belum siap
    }
    await sleep(250);
  }
  if (!wsUrl) {
    child.kill();
    throw new Error('DevTools Chrome tidak siap.');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let messageId = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (messageId += 1);
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout (${method})`));
      }, 20000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
    if (message.method === 'Page.javascriptDialogOpening') {
      send('Page.handleJavaScriptDialog', { accept: true }).catch(() => undefined);
      return;
    }
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
  });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Evaluasi gagal');
    return result.result.value;
  };

  const waitFor = async (expression, label, timeoutMs = 20000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (await evaluate(expression)) return true;
      await sleep(200);
    }
    throw new Error(`Timeout menunggu: ${label}`);
  };

  const navigate = async (url) => {
    await send('Page.navigate', { url });
    await waitFor('document.readyState === "complete"', `load ${url}`);
  };

  const close = async () => {
    try {
      ws.close();
    } catch {
      // ignore
    }
    // Chrome membuat banyak child process; kill() saja menyisakan zombie yang
    // membuat instance berikutnya lambat (CDP timeout).
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } catch {
        child.kill();
      }
    } else {
      child.kill('SIGKILL');
    }
    await sleep(600);
    fs.rmSync(profile, { recursive: true, force: true });
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await navigate(baseUrl);

  return { send, evaluate, waitFor, navigate, close, bodyText: () => evaluate('document.body.innerText') };
}
