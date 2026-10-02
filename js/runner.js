"use strict";
/* 运行内核：在 Worker 中加载 Pyodide(Python) / JSCPP(C++) 并执行代码。
   放在 Worker 里，死循环可由主线程 terminate() 强杀，不卡界面。 */

let pyPromise = null;   // Pyodide 实例的懒加载 Promise
let jscppReady = false;
let curSeq = 0;         // 当前运行序号，主线程用来丢弃过期消息

function post(m) { self.postMessage(m); }
function vendor(rel) { return new URL('../vendor/' + rel, self.location.href).href; }

function ensurePy() {
  if (!pyPromise) {
    post({ type: 'status', seq: curSeq, text: '正在加载 Python 引擎（首次约需几秒）…' });
    pyPromise = (async () => {
      importScripts(vendor('pyodide/pyodide.js'));
      const py = await self.loadPyodide({ indexURL: vendor('pyodide/') });
      py.setStdout({ batched: (t) => post({ type: 'stdout', seq: curSeq, text: t + '\n' }) });
      py.setStderr({ batched: (t) => post({ type: 'stderr', seq: curSeq, text: t + '\n' }) });
      await py.runPythonAsync(
        "import warnings\nwarnings.filterwarnings('ignore', message='(?s).*Pyarrow will become.*')"
      );
      post({ type: 'engine', seq: curSeq, lang: 'py', state: 'ready' });
      return py;
    })();
  }
  return pyPromise;
}

function ensureCpp() {
  if (!jscppReady) {
    post({ type: 'status', seq: curSeq, text: '正在加载 C++ 引擎…' });
    importScripts(vendor('jscpp/JSCPP.es5.min.js'));
    jscppReady = true;
    post({ type: 'engine', seq: curSeq, lang: 'cpp', state: 'ready' });
  }
}

/* 过滤报错栈里 Pyodide 内部帧，只留用户代码的行号和最终错误 */
function tidyPyTraceback(tb) {
  const out = [];
  let skip = 0;
  for (const ln of tb.split('\n')) {
    if (skip > 0 && ln.indexOf('/_pyodide/') === -1) { skip--; continue; }
    if (skip > 0) skip = 0;
    if (ln.indexOf('/_pyodide/') !== -1) { skip = 2; continue; }
    out.push(ln);
  }
  return out.join('\n');
}

async function runPy(msg) {
  const py = await ensurePy();
  // 按 import 自动加载本地化依赖（numpy/pandas 等，首次约数秒）
  try {
    await py.loadPackagesFromImports(msg.code, {
      messageCallback: (t) => post({ type: 'status', seq: curSeq, text: t }),
    });
  } catch (e) {
    post({ type: 'stderr', seq: curSeq, text: '提示：自动加载依赖库失败：' + ((e && e.message) || e) + '\n' });
  }
  const lines = (msg.stdin || '').split('\n');
  let i = 0;
  py.setStdin({ stdin: () => (i < lines.length ? lines[i++] + '\n' : '') });
  try {
    await py.runPythonAsync(msg.code);
    post({ type: 'done', seq: curSeq, exit: 0 });
  } catch (e) {
    const tb = (e && e.message) ? e.message : String(e);
    post({ type: 'stderr', seq: curSeq, text: tidyPyTraceback(tb) });
    if (tb.indexOf('EOFError') !== -1) {
      post({ type: 'stderr', seq: curSeq, text: '\n提示：程序调用了 input() 但没有输入——点开「输入(stdin)」填好内容再运行。\n' });
    }
    post({ type: 'done', seq: curSeq, exit: 1 });
  }
}

function runCpp(msg) {
  ensureCpp();
  let exit = 0;
  try {
    exit = self.JSCPP.run(msg.code, msg.stdin || '', {
      stdio: { write: (s) => post({ type: 'stdout', seq: curSeq, text: s }) },
      unsigned_overflow: 'warn',
    });
  } catch (e) {
    post({ type: 'stderr', seq: curSeq, text: ((e && e.message) ? e.message : String(e)) + '\n' });
    exit = 1;
  }
  post({ type: 'done', seq: curSeq, exit: typeof exit === 'number' ? exit : 0 });
}

self.onmessage = async (ev) => {
  const msg = ev.data;
  if (!msg || msg.cmd !== 'run') return;
  curSeq = msg.seq;
  try {
    if (msg.lang === 'py') {
      await runPy(msg);
    } else {
      runCpp(msg);
    }
  } catch (e) {
    post({ type: 'error', seq: curSeq, message: (e && e.message) ? e.message : String(e) });
  }
};
