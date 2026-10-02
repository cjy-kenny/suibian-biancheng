"use strict";
/* 随身编程 v0.1 —— 界面与运行调度 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const LANG_NAME = { py: 'Python', cpp: 'C++' };
const MODES = { py: 'text/x-python', cpp: 'text/x-c++src' };
const APP_VERSION = '0.3';

const DEFAULTS = {
  py: [
    '# 欢迎使用「随身编程」🚀',
    '# 写完代码，点下方「▶ 运行」立即看结果',
    '',
    'for i in range(1, 6):',
    '    print("*" * i)',
    '',
    'print("Hello, Python!")',
  ].join('\n'),
  cpp: [
    '#include <iostream>',
    'using namespace std;',
    '',
    'int main() {',
    '    cout << "Hello, C++!" << endl;',
    '    for (int i = 1; i <= 5; i++) {',
    '        for (int j = 0; j < i; j++) cout << "*";',
    '        cout << endl;',
    '    }',
    '    return 0;',
    '}',
  ].join('\n'),
};

const state = {
  lang: localStorage.getItem('bc_lang') || 'py',
  theme: localStorage.getItem('bc_theme') || 'dark',
  timeout: parseInt(localStorage.getItem('bc_timeout') || '10', 10),
  fontsize: localStorage.getItem('bc_fontsize') || '15',
  hintOn: localStorage.getItem('bc_hint') !== 'off',
  running: false,
};

/* ---------- 编辑器 ---------- */
const cm = CodeMirror($('#editor-holder'), {
  value: localStorage.getItem('bc_code_' + state.lang) || DEFAULTS[state.lang],
  mode: MODES[state.lang],
  theme: state.theme === 'light' ? 'default' : 'material-darker',
  lineNumbers: true,
  indentUnit: 4,
  tabSize: 4,
  autoCloseBrackets: true,
  matchBrackets: true,
  lineWrapping: true,
});

let saveTimer = null;
cm.on('change', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem('bc_code_' + state.lang, cm.getValue()), 400);
});
cm.addKeyMap({ 'Ctrl-Enter': () => runCode(), 'Cmd-Enter': () => runCode() });

/* ---------- 自动补全（输入 ≥3 个字母时弹出，符号栏插入不触发） ---------- */
let suppressHint = false;
const KEYWORDS = {
  py: ['abs', 'all', 'any', 'and', 'as', 'bool', 'break', 'chr', 'class', 'continue', 'def', 'del', 'dict', 'elif', 'else',
    'enumerate', 'except', 'False', 'filter', 'float', 'for', 'format', 'from', 'global', 'if', 'import', 'in', 'input',
    'int', 'is', 'isinstance', 'lambda', 'len', 'list', 'map', 'max', 'min', 'next', 'None', 'not', 'or', 'pass', 'pow',
    'print', 'range', 'reversed', 'round', 'sorted', 'str', 'sum', 'super', 'True', 'try', 'tuple', 'type', 'while', 'with', 'yield', 'zip'],
  cpp: ['auto', 'bool', 'break', 'case', 'catch', 'char', 'cin', 'class', 'const', 'continue', 'cout', 'default', 'delete',
    'do', 'double', 'else', 'endl', 'enum', 'false', 'float', 'for', 'if', 'include', 'int', 'long', 'namespace', 'new',
    'nullptr', 'private', 'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'std', 'string', 'struct', 'switch',
    'template', 'this', 'throw', 'true', 'try', 'typedef', 'unsigned', 'using', 'vector', 'virtual', 'void', 'while'],
};

function keywordHint(editor) {
  const cur = editor.getCursor();
  const line = editor.getLine(cur.line);
  let start = cur.ch;
  while (start && /[\w$]/.test(line.charAt(start - 1))) start--;
  const curWord = line.slice(start, cur.ch);
  if (!curWord) return null;
  const any = CodeMirror.hint.anyword(editor);
  const pool = (KEYWORDS[state.lang] || []).concat(any ? any.list : []);
  const lower = curWord.toLowerCase();
  const matches = [];
  const seen = {};
  for (const w of pool) {
    if (!seen[w] && w !== curWord && w.toLowerCase().indexOf(lower) === 0) { seen[w] = 1; matches.push(w); }
  }
  if (!matches.length) return null;
  return { list: matches, from: { line: cur.line, ch: start }, to: cur };
}

cm.on('inputRead', (cmEditor, change) => {
  if (!state.hintOn || suppressHint) return;
  if (!change.text || change.text.length !== 1) return;
  if (!/^[A-Za-z_]$/.test(change.text[0])) return;
  const cur = cmEditor.getCursor();
  const before = cmEditor.getLine(cur.line).slice(0, cur.ch);
  const word = (before.match(/[A-Za-z_][A-Za-z0-9_]*$/) || [''])[0];
  if (word.length < 3) return;
  cmEditor.showHint({ hint: keywordHint, completeSingle: false });
});

/* ---------- 符号工具栏 ---------- */
const SYMBOLS = {
  py: ['Tab', '(', ')', '[', ']', '{', '}', ':', '"', "'", '=', '==', '<', '>', '+', '-', '*', '/', '%', '#', ',', '.', '_',
    'print()', 'input()', 'range(0, 10)', 'for i in range(10):', 'if :', 'elif :', 'else:', 'def f():', 'return', 'while :',
    'True', 'False', 'and', 'or', 'not', 'in', 'len()', '.append()', 'int()', 'str()', 'sum()', 'max()', 'min()'],
  cpp: ['Tab', '(', ')', '[', ']', '{', '}', ';', '"', "'", '=', '==', '<', '>', '+', '-', '*', '/', '%', '//', '<<', '>>', '++', '--', '_',
    '#include', 'using namespace std;', 'int main()', 'cout <<', 'cin >>', 'endl', 'return 0;',
    'for (int i = 0; i < 10; i++)', 'if ()', 'else', 'while ()', 'int ', 'double ', 'bool ', 'void '],
};

function renderSymbols() {
  const bar = $('#symbar');
  bar.innerHTML = '';
  SYMBOLS[state.lang].forEach((chip) => {
    const b = document.createElement('button');
    b.textContent = chip === 'Tab' ? '⇥' : chip;
    b.addEventListener('click', () => {
      suppressHint = true;
      cm.replaceSelection(chip === 'Tab' ? '    ' : chip);
      if (chip.endsWith('()')) cm.execCommand('goCharLeft');
      suppressHint = false;
      cm.focus();
    });
    bar.appendChild(b);
  });
}

/* ---------- 底部标签 ---------- */
function switchTab(name) {
  $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + name));
  if (name === 'edit') setTimeout(() => cm.refresh(), 60);
}
$$('#tabbar button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ---------- 语言切换 ---------- */
function setLang(lang) {
  if (lang === state.lang) return;
  localStorage.setItem('bc_code_' + state.lang, cm.getValue());
  state.lang = lang;
  localStorage.setItem('bc_lang', lang);
  $$('.lang-btn').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  cm.setOption('mode', MODES[lang]);
  cm.setValue(localStorage.getItem('bc_code_' + lang) || DEFAULTS[lang]);
  cm.clearHistory();
  renderSymbols();
  renderExamples();
  renderSyntax();
  updateDot('idle');
}
$$('.lang-btn').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

/* ---------- 输出与运行 ---------- */
const outEl = $('#output');
function appendOut(text, cls) {
  const span = document.createElement('span');
  if (cls) span.className = 'out-' + cls;
  span.textContent = text;
  outEl.appendChild(span);
  outEl.scrollTop = outEl.scrollHeight;
}
function setStatus(text) { $('#run-status').textContent = text; }
function updateDot(cls) { $('#engine-dot').className = 'dot ' + cls; }

let worker = null;
let runSeq = 0;
let activeSeq = 0;
let timeoutTimer = null;

function spawnWorker() {
  worker = new Worker('js/runner.js');
  worker.onmessage = (ev) => handleMsg(ev.data);
  worker.onerror = (e) => {
    appendOut('引擎异常：' + (e.message || '未知错误') + '\n', 'err');
    finishRun();
  };
}
spawnWorker();

function handleMsg(m) {
  if (m.seq !== undefined && m.seq !== activeSeq) return;
  switch (m.type) {
    case 'status': setStatus(m.text); updateDot('loading'); break;
    case 'engine': if (m.state === 'ready') updateDot('ready'); break;
    case 'stdout': appendOut(m.text); break;
    case 'stderr': appendOut(m.text, 'err'); break;
    case 'done':
      appendOut('— 程序结束，退出码 ' + m.exit + ' —\n', 'sys');
      finishRun();
      break;
    case 'error':
      if (m.message) appendOut(m.message + '\n', 'err');
      appendOut('— 运行出错 —\n', 'sys');
      finishRun();
      break;
  }
}

function runCode() {
  if (state.running) return;
  const code = cm.getValue();
  if (!code.trim()) { toast('先写点代码再运行吧'); return; }
  state.running = true;
  activeSeq = ++runSeq;
  $('#btn-run').disabled = true;
  $('#btn-stop').disabled = false;
  outEl.textContent = '';
  setStatus('');
  appendOut('▶ ' + LANG_NAME[state.lang] + ' 运行中…\n', 'sys');
  worker.postMessage({ cmd: 'run', seq: activeSeq, lang: state.lang, code: code, stdin: $('#stdin').value });
  if (state.timeout > 0) {
    timeoutTimer = setTimeout(() => {
      killRun('⏱ 超过 ' + state.timeout + ' 秒未结束，已强制终止（可能是死循环）。可在「设置」里调整超时。\n');
    }, state.timeout * 1000);
  }
}

function killRun(msg) {
  clearTimeout(timeoutTimer);
  worker.terminate();
  spawnWorker();
  updateDot('idle');
  if (msg) appendOut(msg, 'err');
  appendOut('— 已终止 —\n', 'sys');
  finishRun();
}

function finishRun() {
  clearTimeout(timeoutTimer);
  state.running = false;
  $('#btn-run').disabled = false;
  $('#btn-stop').disabled = true;
  setStatus('');
}

$('#btn-run').addEventListener('click', runCode);
$('#btn-stop').addEventListener('click', () => killRun(null));
$('#btn-clear').addEventListener('click', () => { if (!state.running) outEl.textContent = ''; });

/* ---------- 示例 ---------- */
function renderExamples() {
  const box = $('#examples-list');
  box.innerHTML = '';
  EXAMPLES[state.lang].forEach((ex) => {
    const el = document.createElement('button');
    el.className = 'card use';
    const h = document.createElement('h3');
    h.textContent = ex.title;
    const p = document.createElement('p');
    p.className = 'desc';
    p.textContent = ex.desc;
    el.appendChild(h);
    el.appendChild(p);
    el.addEventListener('click', () => {
      cm.setValue(ex.code);
      $('#stdin').value = ex.stdin || '';
      switchTab('edit');
      toast('已载入：' + ex.title);
    });
    box.appendChild(el);
  });
}

/* ---------- 语法参考 ---------- */
function renderSyntax() {
  const box = $('#syntax-list');
  box.innerHTML = '';
  SYNTAX[state.lang].forEach((card) => {
    const d = document.createElement('details');
    d.className = 'card';
    const sum = document.createElement('summary');
    sum.textContent = card.t;
    d.appendChild(sum);
    const table = document.createElement('table');
    card.rows.forEach((r) => {
      const tr = document.createElement('tr');
      const c1 = document.createElement('td');
      c1.textContent = r[0];
      const c2 = document.createElement('td');
      c2.textContent = r[1];
      tr.appendChild(c1);
      tr.appendChild(c2);
      table.appendChild(tr);
    });
    d.appendChild(table);
    box.appendChild(d);
  });
}

/* ---------- 设置 ---------- */
function setTheme(t) {
  state.theme = t;
  localStorage.setItem('bc_theme', t);
  document.documentElement.dataset.theme = t;
  cm.setOption('theme', t === 'light' ? 'default' : 'material-darker');
  $$('#theme-seg button').forEach((x) => x.classList.toggle('active', x.dataset.theme === t));
}
$$('#theme-seg button').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)));

$('#timeout-sel').value = String(state.timeout);
$('#timeout-sel').addEventListener('change', (e) => {
  state.timeout = parseInt(e.target.value, 10);
  localStorage.setItem('bc_timeout', e.target.value);
  toast('已保存：超时 ' + (state.timeout || '不限'));
});

/* ---------- 编辑器字号 ---------- */
function applyFontSize(px) {
  document.querySelector('.CodeMirror').style.fontSize = px + 'px';
  cm.refresh();
}
$('#fontsize-sel').value = state.fontsize;$('#fontsize-sel').addEventListener('change', (e) => {
  state.fontsize = e.target.value;
  localStorage.setItem('bc_fontsize', e.target.value);
  applyFontSize(e.target.value);
});

/* ---------- 自动补全开关 ---------- */
function setHint(on) {
  state.hintOn = on;
  localStorage.setItem('bc_hint', on ? 'on' : 'off');
  $$('#hint-seg button').forEach((x) => x.classList.toggle('active', (x.dataset.hint === 'on') === on));
}
$$('#hint-seg button').forEach((b) => b.addEventListener('click', () => setHint(b.dataset.hint === 'on')));

$('#btn-reset-code').addEventListener('click', () => {
  if (!confirm('确定清空两种语言已保存的代码，恢复默认示例？')) return;
  localStorage.removeItem('bc_code_py');
  localStorage.removeItem('bc_code_cpp');
  cm.setValue(DEFAULTS[state.lang]);
  toast('已恢复默认代码');
});

/* ---------- 检查更新 ---------- */
function isNewer(remote, local) {
  const a = String(remote).split('.');
  const b = String(local).split('.');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = parseInt(a[i] || '0', 10);
    const y = parseInt(b[i] || '0', 10);
    if (x !== y) return x > y;
  }
  return false;
}

function onCheckUpdate() {
  const out = $('#update-status');
  const base = $('#update-url').value.trim();
  localStorage.setItem('bc_update_url', base);
  out.textContent = '正在检查…';
  if (window.AndroidUpdater && window.AndroidUpdater.check) {
    // APK：原生层下载解包热更新
    window.__updateResult = (r) => {
      if (r.progress) { out.textContent = r.message; return; }
      out.textContent = r.message;
      $('#btn-restart-app').style.display = r.updated ? '' : 'none';
      if (r.updated) toast('热更新完成，重启应用生效');
    };
    window.AndroidUpdater.check(base);
  } else {
    // 网页版：查同源（或自定源）version.json，刷新即更新
    fetch(base.replace(/\/$/, '') + '/version.json?_=' + Date.now())
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((v) => {
        if (isNewer(v.version, APP_VERSION)) {
          out.textContent = '发现新版本 v' + v.version + '，刷新页面即可更新';
          toast('发现新版本 v' + v.version);
        } else {
          out.textContent = '已是最新版本 v' + APP_VERSION;
        }
      })
      .catch((e) => { out.textContent = '检查失败：' + e.message; });
  }
}
$('#btn-check-update').addEventListener('click', onCheckUpdate);
$('#btn-restart-app').addEventListener('click', () => {
  if (window.AndroidUpdater && window.AndroidUpdater.restart) window.AndroidUpdater.restart();
});

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- 初始化 ---------- */
document.documentElement.dataset.theme = state.theme;
$$('#theme-seg button').forEach((x) => x.classList.toggle('active', x.dataset.theme === state.theme));
$$('#hint-seg button').forEach((x) => x.classList.toggle('active', (x.dataset.hint === 'on') === state.hintOn));
$('#update-url').value = localStorage.getItem('bc_update_url') || '';
applyFontSize(state.fontsize);
renderSymbols();
renderExamples();
renderSyntax();
setTimeout(() => cm.refresh(), 80);
