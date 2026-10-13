import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { HOOK_SOURCE, READ_TIMELINE } from '../adapters/codecombat/observer.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
const MATCHES = ['https://koudashijie.com/play/level/mages-might*', 'https://codecombat.com/play/level/mages-might*'];
const GRANTS = ['unsafeWindow', 'GM_setValue', 'GM_getValue', 'GM_registerMenuCommand', 'GM_unregisterMenuCommand'];

function assertMetadata(metadata) {
  if (typeof metadata !== 'string' || !metadata.startsWith('// ==UserScript==\n')
    || !metadata.trimEnd().endsWith('// ==/UserScript==')) throw new TypeError('Invalid userscript metadata block');
  const entries = new Map();
  for (const line of metadata.trimEnd().split('\n').slice(1, -1)) {
    if (!line.trim()) continue;
    const match = /^\/\/\s+@(\S+)(?:\s+(.*))?$/.exec(line);
    if (!match) throw new TypeError('Metadata must contain only header directives');
    if (!['name', 'namespace', 'version', 'description', 'match', 'run-at', 'noframes', 'grant'].includes(match[1])) {
      throw new TypeError(`Unsupported metadata directive ${match[1]}`);
    }
    if (!entries.has(match[1])) entries.set(match[1], []);
    entries.get(match[1]).push(match[2] ?? '');
  }
  for (const [key, expected] of [['match', MATCHES], ['grant', GRANTS], ['run-at', ['document-start']], ['noframes', ['']]]) {
    if (JSON.stringify(entries.get(key)) !== JSON.stringify(expected)) throw new TypeError(`Unsafe or incomplete userscript ${key}`);
  }
  for (const key of ['name', 'namespace', 'version', 'description']) {
    if (entries.get(key)?.length !== 1 || !entries.get(key)[0].trim()) throw new TypeError(`Invalid userscript ${key}`);
  }
}

function startCollector(hookSource, readSource) {
  'use strict';
  const pageUrl = new URL(location.href);
  if (window.top !== window.self || pageUrl.protocol !== 'https:'
    || !['koudashijie.com', 'codecombat.com'].includes(pageUrl.hostname)
    || !/^\/play\/level\/mages-might\/?$/.test(pageUrl.pathname)) return;
  const storageKey = 'contest-teaching.mages-might.timeline.v1';
  const panelId = 'contest-teaching-timeline-collector';
  const menus = [];
  const instanceKey = '__contestTeachingCollectorInstance';
  if (window[instanceKey]) return;
  const downloads = new Set();
  const downloadTimers = new Set();
  let transport;
  let panel;
  let statusNode;
  let message = '正在等待页面观测接口；请自行点击开始和运行。';
  let timer;
  let attempts = 0;
  let installing = false;
  let installed = false;
  let busy = false;
  let stopped = false;

  function status(text) {
    message = text;
    if (statusNode) statusNode.textContent = text;
  }

  function mount() {
    if (panel || !document.body || stopped) return;
    if (document.getElementById(panelId)) { stop(); return; }
    panel = document.createElement('aside');
    panel.id = panelId;
    panel.style.cssText = 'position:fixed;left:12px;top:12px;max-width:300px;z-index:2147483646;';
    const shadow = panel.attachShadow({ mode: 'closed' });
    const container = document.createElement('section');
    container.style.cssText = 'background:#142335;color:#fff;padding:12px;border:1px solid #7da4d0;border-radius:8px;font:13px/1.5 sans-serif;';
    const title = document.createElement('strong');
    title.textContent = '教学采集｜只读';
    const note = document.createElement('p');
    note.textContent = '手动快照，不判胜负、不操作比赛；仅本地保存与JSON下载。';
    statusNode = document.createElement('p');
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    statusNode.textContent = message;
    container.append(title, note, statusNode);
    for (const [label, action] of [['采集到本地', collect], ['下载上次采集', download], ['重试挂载', retry]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = 'margin:3px;padding:5px;cursor:pointer;';
      button.addEventListener('click', () => { void action(); });
      container.append(button);
    }
    shadow.append(container);
    document.body.append(panel);
  }

  function validRaw(raw) {
    return raw?.ok === true && raw.schemaVersion === 1 && raw.source === 'world.frames'
      && Array.isArray(raw.frames) && raw.frames.length > 0 && raw.frameCount === raw.frames.length
      && Array.isArray(raw.entities) && Array.isArray(raw.errors)
      && !Object.hasOwn(raw, 'endedBy') && !Object.hasOwn(raw, 'winner');
  }

  async function action(work) {
    if (stopped) return;
    if (busy) { status('上一项操作尚未结束，请稍候。'); return; }
    if (!transport) { status('缺少油猴API；请确认使用支持所需权限的扩展。'); return; }
    busy = true;
    try { await work(); }
    catch (error) { if (!stopped) status(`操作失败：${typeof error?.code === 'string' ? error.code : 'COLLECTOR_ERROR'}；上一份存档保留。`); }
    finally { busy = false; }
  }

  async function collect() {
    return action(async () => {
      if (!installed) { status('观测器尚未就绪；页面开始后请重试挂载。'); return; }
      status('读取当前逐帧快照……');
      const raw = JSON.parse(JSON.stringify(await transport.evaluate(readSource)));
      if (!validRaw(raw)) { status('当前没有可保存的帧数据；请自行运行比赛。上一份存档保留。'); return; }
      if (stopped) return;
      const snapshot = { schemaVersion: 1, captureType: 'manual-snapshot', adjudicated: false, capturedAt: new Date().toISOString(), raw };
      await transport.write(snapshot);
      if (!stopped) status(`已保存 ${raw.frameCount} 帧、${raw.errors.length} 条读取诊断；手动快照未判定胜负。`);
    });
  }

  async function download() {
    return action(async () => {
      const snapshot = await transport.readStored();
      if (stopped) return;
      if (snapshot?.schemaVersion !== 1 || snapshot.captureType !== 'manual-snapshot' || snapshot.adjudicated !== false
        || typeof snapshot.capturedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.capturedAt)) || !validRaw(snapshot.raw)) {
        status('没有可下载的有效采集存档。'); return;
      }
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      downloads.add(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mages-might-timeline-${new Date(snapshot.capturedAt).toISOString().replace(/[:.]/g, '-')}.json`;
      try { document.body.append(anchor); anchor.click(); }
      finally {
        anchor.remove();
        const pending = setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); downloadTimers.delete(pending); }, 1000);
        downloadTimers.add(pending);
      }
      status('JSON已交给浏览器下载；教学站跨域接收尚未接入。');
    });
  }

  async function install() {
    if (stopped || installed || installing || !transport) return;
    installing = true;
    timer = undefined;
    mount();
    if (stopped) { installing = false; return; }
    attempts += 1;
    try {
      const response = await transport.evaluate(hookSource);
      if (stopped) return;
      if (response?.ok === true) {
        installed = true;
        status('只读观测器已就绪；请自行开始/运行，再手动采集。');
        return;
      }
      status(`等待观测接口 ${attempts}/120；不会替您点击比赛按钮。`);
      if (attempts < 120) timer = setTimeout(() => { void install(); }, 250);
      else status('等待30秒仍未就绪；进入对战并点击开始后，手动重试挂载。');
    } catch {
      if (!stopped) status('无法在页面执行观测表达式；请检查扩展权限或页面安全限制。');
    } finally { installing = false; }
  }

  async function retry() {
    if (stopped) return;
    if (installed) { status('观测器已挂载，无需重复清空当前数据。'); return; }
    clearTimeout(timer);
    attempts = 0;
    await install();
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener('DOMContentLoaded', mount);
    window.removeEventListener('pagehide', stop);
    for (const menu of menus) { try { GM_unregisterMenuCommand(menu); } catch {} }
    for (const pending of downloadTimers) clearTimeout(pending);
    downloadTimers.clear();
    for (const url of downloads) URL.revokeObjectURL(url);
    downloads.clear();
    panel?.remove();
    if (window[instanceKey] === stop) delete window[instanceKey];
    if (transport) void transport.close();
  }

  window[instanceKey] = stop;
  mount();
  if (stopped) return;
  document.addEventListener('DOMContentLoaded', mount, { once: true });
  window.addEventListener('pagehide', stop, { once: true });
  try {
    if (typeof unsafeWindow === 'undefined' || typeof GM_setValue !== 'function' || typeof GM_getValue !== 'function'
      || typeof GM_registerMenuCommand !== 'function' || typeof GM_unregisterMenuCommand !== 'function') throw new TypeError('Required userscript APIs missing');
    transport = createUserscriptTransport({ key: storageKey, pageWindow: unsafeWindow, setValue: GM_setValue, getValue: GM_getValue });
    for (const [label, callback] of [['教学：采集到本地', collect], ['教学：下载上次采集', download], ['教学：重试挂载', retry]]) {
      menus.push(GM_registerMenuCommand(label, callback));
    }
    void install();
  } catch {
    status('初始化失败：缺少所需油猴API或页面访问能力；不会修改比赛。');
  }
}

export function validateUserscript(source) {
  if (typeof source !== 'string' || /\b(?:import|export)\b/.test(source)) throw new TypeError('Userscript must contain no module keywords');
  const end = source.indexOf('// ==/UserScript==');
  if (end < 0) throw new TypeError('Userscript metadata block is required');
  assertMetadata(source.slice(0, end + '// ==/UserScript=='.length).replace(/\r\n/g, '\n'));
  if (/manual-cast|ace\.edit|\.setValue\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket|GM_xmlhttpRequest|createCodeCombatAdapter|createEditor/.test(source)) {
    throw new TypeError('Userscript contains a forbidden execution or network capability');
  }
  new Script(source, { filename: 'collector.user.js' });
  return true;
}

export async function renderUserscript() {
  const metadata = (await readFile(path.join(PROJECT_ROOT, 'adapters/codecombat/userscript.meta.js'), 'utf8')).replace(/\r\n/g, '\n').trimEnd();
  assertMetadata(metadata);
  const transport = (await readFile(path.join(PROJECT_ROOT, 'infra/transport/userscript.mjs'), 'utf8')).replace(/\r\n/g, '\n')
    .replace(/^export (?=(?:class |function |async function ))/gm, '');
  const source = `${metadata}\n\n(() => {\n'use strict';\n${transport}\n(${startCollector.toString()})(${JSON.stringify(HOOK_SOURCE)}, ${JSON.stringify(READ_TIMELINE)});\n})();\n`;
  validateUserscript(source);
  return source;
}

export async function buildUserscript({ outputDirectory = path.join(PROJECT_ROOT, 'dist') } = {}) {
  const directory = path.resolve(outputDirectory);
  const relative = path.relative(PROJECT_ROOT, directory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new TypeError('Userscript output must remain in the project');
  const source = await renderUserscript();
  await mkdir(directory, { recursive: true });
  const outputPath = path.join(directory, 'collector.user.js');
  const temporaryPath = path.join(directory, `.collector-${randomUUID()}.tmp`);
  await writeFile(temporaryPath, source, 'utf8');
  await rename(temporaryPath, outputPath);
  return { outputPath, bytes: Buffer.byteLength(source), sha256: createHash('sha256').update(source).digest('hex') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new TypeError('Usage: node build/userscript.mjs');
  console.log(JSON.stringify(await buildUserscript()));
}
