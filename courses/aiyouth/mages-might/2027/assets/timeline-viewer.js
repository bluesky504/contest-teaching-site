'use strict';

const SNAPSHOT_LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, frames: 10000, entities: 500, errors: 20000 });
const SNAPSHOT_FIELDS = Object.freeze(['health', 'fire', 'water', 'earth', 'mana', 'pos', 'exists']);
const SNAPSHOT_WARMUP_FRAMES = 20;

function snapshotError(message) {
  const error = new Error(message);
  error.code = 'INVALID_SNAPSHOT';
  return error;
}

function snapshotRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function snapshotText(value, maximum = 250) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

function parseSnapshot(text, teachingExample) {
  if (typeof text !== 'string' || text.length > SNAPSHOT_LIMITS.bytes || new TextEncoder().encode(text).length > SNAPSHOT_LIMITS.bytes) {
    throw snapshotError('文件超过 8 MiB 或不是文本；未读取为快照。');
  }
  let snapshot;
  try { snapshot = JSON.parse(text); }
  catch { throw snapshotError('JSON 无法解析；不会显示原文件内容或执行其中的代码。'); }
  if (!snapshotRecord(snapshot) || snapshot.schemaVersion !== 1 || snapshot.captureType !== 'manual-snapshot'
    || snapshot.adjudicated !== false || !snapshotText(snapshot.capturedAt, 64) || !Number.isFinite(Date.parse(snapshot.capturedAt))) {
    throw snapshotError('仅支持 schemaVersion=1、manual-snapshot、adjudicated=false 的手动采集文件。');
  }
  const raw = snapshot.raw;
  if (!snapshotRecord(raw) || raw.ok !== true || raw.schemaVersion !== 1 || raw.source !== 'world.frames'
    || Object.hasOwn(raw, 'winner') || Object.hasOwn(raw, 'endedBy') || Object.hasOwn(snapshot, 'winner') || Object.hasOwn(snapshot, 'endedBy')) {
    throw snapshotError('不是未判定的 world.frames 手动快照；不导入对战结果报告。');
  }
  if (!Array.isArray(raw.frames) || !Number.isSafeInteger(raw.frameCount) || raw.frameCount !== raw.frames.length
    || raw.frameCount < 1 || raw.frameCount > SNAPSHOT_LIMITS.frames
    || !Array.isArray(raw.entities) || raw.entities.length < 1 || raw.entities.length > SNAPSHOT_LIMITS.entities
    || !Array.isArray(raw.errors) || raw.errors.length > SNAPSHOT_LIMITS.errors) {
    throw snapshotError('帧数、实体或诊断结构无效；最多展示 10000 帧、500 个实体和 20000 条诊断。');
  }
  const frameRate = raw.frameRate ?? null;
  if (frameRate !== null && (typeof frameRate !== 'number' || !Number.isFinite(frameRate) || frameRate <= 0)) {
    throw snapshotError('frameRate 必须是正数或 unknown。');
  }
  const entityIds = new Set();
  const entities = raw.entities.map((entity) => {
    if (!snapshotRecord(entity) || !snapshotText(entity.id) || entityIds.has(entity.id)) throw snapshotError('实体 ID 必须是唯一的非空短文本。');
    entityIds.add(entity.id);
    return { id: entity.id, team: snapshotText(entity.team) ? entity.team : 'unknown', type: snapshotText(entity.type) ? entity.type : 'unknown' };
  });
  const failures = new Set();
  const errors = raw.errors.map((error) => {
    if (!snapshotRecord(error) || !Number.isSafeInteger(error.frame) || error.frame < 0 || error.frame >= raw.frameCount
      || !snapshotText(error.entityId) || !SNAPSHOT_FIELDS.includes(error.propName) || !snapshotText(error.reason, 80)) {
      throw snapshotError('读取诊断格式无效。');
    }
    failures.add(JSON.stringify([error.frame, error.entityId, error.propName]));
    return { frame: error.frame, entityId: error.entityId, propName: error.propName, reason: error.reason };
  });
  const frames = raw.frames.map((frame, index) => {
    if (frame === null) return null;
    if (!snapshotRecord(frame)) throw snapshotError('帧必须是实体状态对象或缺失帧 null。');
    return Object.fromEntries(Object.entries(frame).filter(([entityId]) => entityIds.has(entityId)).map(([entityId, state]) => {
      if (!snapshotRecord(state)) throw snapshotError('实体状态结构无效。');
      const values = [];
      for (const property of SNAPSHOT_FIELDS) {
        const failed = failures.has(JSON.stringify([index, entityId, property]));
        if (!failed && !Object.hasOwn(state, property)) continue;
        let value = failed ? null : state[property];
        if (value !== null) {
          if (['health', 'fire', 'water', 'earth'].includes(property) && (typeof value !== 'number' || !Number.isFinite(value))) throw snapshotError('数值字段格式无效。');
          if (property === 'mana' && !((typeof value === 'string' && value.length <= 250) || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))) throw snapshotError('mana 必须是原始标量，不能当作法力数量对象。');
          if (property === 'exists' && typeof value !== 'boolean') throw snapshotError('exists 必须是布尔值或 unknown。');
          if (property === 'pos') {
            if (!snapshotRecord(value)) throw snapshotError('位置必须是坐标对象或 unknown。');
            value = Object.fromEntries(['x', 'y', 'z'].filter((axis) => Object.hasOwn(value, axis)).map((axis) => [axis, value[axis]]));
            if (!Object.keys(value).length || Object.values(value).some((coordinate) => typeof coordinate !== 'number' || !Number.isFinite(coordinate))) throw snapshotError('位置坐标无效。');
          }
        }
        values.push([property, value]);
      }
      return [entityId, Object.fromEntries(values)];
    }));
  });
  return { capturedAt: new Date(snapshot.capturedAt).toISOString(), teachingExample,
    frameRate, frameCount: raw.frameCount, entities, errors, frames };
}

function parseManualSnapshot(text) {
  return parseSnapshot(text, false);
}

function parseTeachingSnapshot(snapshot) {
  return parseSnapshot(JSON.stringify(snapshot), true);
}

function readSnapshotFrame(snapshot, index, entityId) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= snapshot.frameCount || !snapshot.entities.some((entity) => entity.id === entityId)) {
    throw snapshotError('请选择有效帧和实体。');
  }
  const frame = snapshot.frames[index];
  const state = frame && Object.hasOwn(frame, entityId) ? frame[entityId] : null;
  const gameSecond = snapshot.frameRate === null ? null : index / snapshot.frameRate;
  return { index, gameSecond: gameSecond === null || Number.isFinite(gameSecond) ? gameSecond : null,
    inWarmup: index < SNAPSHOT_WARMUP_FRAMES, framePresent: frame !== null, statePresent: state !== null,
    properties: Object.fromEntries(SNAPSHOT_FIELDS.map((property) => [property, state && Object.hasOwn(state, property) ? state[property] : null])),
    errors: snapshot.errors.filter((error) => error.frame === index && error.entityId === entityId) };
}

function createTeachingSnapshot() {
  const entities = [{ id: '示例英雄', team: 'humans', type: 'hero' }, { id: '示例果农', team: 'humans', type: 'collector' }];
  const frames = Array.from({ length: 40 }, (_, index) => ({
    '示例英雄': { health: index < 24 ? 80 : 65, fire: index < 22 ? 4 : 7, water: null, earth: 2, exists: true },
    '示例果农': { health: 12, mana: 'water', pos: { x: index, y: 10 }, exists: true },
  }));
  frames[21] = null;
  return { schemaVersion: 1, captureType: 'manual-snapshot', adjudicated: false, teachingExample: true,
    capturedAt: '2026-10-12T00:00:00.000Z', raw: { ok: true, schemaVersion: 1, source: 'world.frames', frameCount: frames.length,
      frameRate: 10, entities, frames, errors: [{ frame: 25, entityId: '示例英雄', propName: 'health', reason: 'PROPERTY_READ_FAILED' }] } };
}

function initializeTimelineViewer(document) {
  const fileInput = document.getElementById('snapshot-file');
  if (!fileInput) return;
  const controls = document.getElementById('import-controls');
  const panel = document.getElementById('viewer-panel');
  const status = document.getElementById('viewer-status');
  const frameInput = document.getElementById('frame-index');
  const slider = document.getElementById('frame-slider');
  const entitySelect = document.getElementById('entity-select');
  const values = document.getElementById('property-values');
  const diagnostics = document.getElementById('frame-diagnostics');
  let snapshot;
  let currentFrame = 0;
  let epoch = 0;
  controls.hidden = false;

  function render() {
    if (!snapshot) return;
    const view = readSnapshotFrame(snapshot, currentFrame, entitySelect.value);
    frameInput.value = String(currentFrame);
    slider.value = String(currentFrame);
    document.getElementById('frame-summary').textContent = `帧 ${view.index} · 游戏时间 ${view.gameSecond === null ? 'unknown' : view.gameSecond.toFixed(2) + ' 秒（按文件帧率）'}`;
    document.getElementById('frame-status').textContent = `${view.inWarmup ? '预热帧：只展示，不作推论。' : '非预热帧：仍不判定终局或胜负。'}${!view.framePresent ? ' 该帧缺失，全部显示 unknown。' : !view.statePresent ? ' 本帧没有该实体的状态，不能据此推断死亡或不存在。' : ''}`;
    values.replaceChildren(...SNAPSHOT_FIELDS.map((property) => {
      const row = document.createElement('tr');
      const label = document.createElement('th');
      label.scope = 'row';
      label.textContent = property === 'mana' ? 'mana（原始标签 / 值）' : property;
      const cell = document.createElement('td');
      const value = view.properties[property];
      cell.textContent = value === null ? 'unknown' : value === '' ? '""（空字符串）' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      const note = document.createElement('td');
      note.textContent = property === 'health' ? 'hp' : ['fire', 'water', 'earth'].includes(property) ? 'mana 数量' : property === 'mana' ? '元素字符串不代表法力数量' : '原始观测';
      row.append(label, cell, note);
      return row;
    }));
    const rows = view.errors.map((error) => {
      const item = document.createElement('li');
      item.textContent = `${error.propName}：${error.reason}；对应值保持 unknown。`;
      return item;
    });
    if (!rows.length) { const item = document.createElement('li'); item.textContent = '文件未报告该帧、该实体的读取错误；不代表观测已被验证。'; rows.push(item); }
    diagnostics.replaceChildren(...rows);
  }

  function show(model) {
    snapshot = model;
    currentFrame = 0;
    const options = snapshot.entities.map((entity) => {
      const option = document.createElement('option');
      option.value = entity.id;
      option.textContent = `${entity.team} / ${entity.id}`;
      return option;
    });
    entitySelect.replaceChildren(...options);
    entitySelect.value = snapshot.entities[0].id;
    frameInput.max = String(snapshot.frameCount - 1);
    slider.max = String(snapshot.frameCount - 1);
    document.getElementById('capture-time').textContent = snapshot.capturedAt;
    document.getElementById('snapshot-size').textContent = `${snapshot.frameCount} 帧 / ${snapshot.entities.length} 实体 / ${snapshot.errors.length} 条读取诊断`;
    document.getElementById('source-warning').textContent = snapshot.teachingExample ? '虚构教学示例，不是实测或对战结果。' : '手动导入文件，来源、版本、采集完整性均未核实；格式检查不是证据验收。';
    panel.hidden = false;
    render();
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const ticket = ++epoch;
    status.textContent = '正在本地读取……不上传、不执行文件内容。';
    try {
      if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > SNAPSHOT_LIMITS.bytes) throw snapshotError('请选择不超过 8 MiB 的非空 JSON 文件。');
      const text = await file.text();
      if (ticket !== epoch) return;
      show(parseManualSnapshot(text));
      status.textContent = `已导入 ${snapshot.frameCount} 帧。手动快照不判终局或胜负；来源仍需人工核对。`;
    } catch (error) {
      if (ticket !== epoch) return;
      status.textContent = `${error?.code === 'INVALID_SNAPSHOT' ? error.message : '文件读取失败。'}${snapshot ? ' 本次未载入，上一份展示仍保留。' : ' 当前没有展示数据。'}`;
    } finally { if (ticket === epoch) fileInput.value = ''; }
  });
  document.getElementById('load-demo').addEventListener('click', () => {
    epoch += 1;
    fileInput.value = '';
    show(parseTeachingSnapshot(createTeachingSnapshot()));
    status.textContent = '已加载虚构教学示例。它只演示查看方式，不是比赛观测。';
  });
  document.getElementById('clear-snapshot').addEventListener('click', () => {
    epoch += 1;
    snapshot = undefined;
    fileInput.value = '';
    entitySelect.replaceChildren();
    values.replaceChildren();
    diagnostics.replaceChildren();
    for (const id of ['capture-time', 'snapshot-size', 'source-warning', 'frame-summary', 'frame-status']) document.getElementById(id).textContent = '';
    panel.hidden = true;
    status.textContent = '已清空当前标签页的展示数据；未写入本地存储。';
  });
  for (const control of [frameInput, slider]) control.addEventListener('input', () => {
    if (!snapshot) return;
    const index = control.value.trim() === '' ? NaN : Number(control.value);
    if (!Number.isSafeInteger(index) || index < 0 || index >= snapshot.frameCount) {
      status.textContent = '帧序号必须是范围内的整数；保持上一帧。';
      render();
      return;
    }
    currentFrame = index;
    render();
  });
  entitySelect.addEventListener('change', render);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { SNAPSHOT_LIMITS, SNAPSHOT_FIELDS, parseManualSnapshot, readSnapshotFrame, createTeachingSnapshot, initializeTimelineViewer };
if (typeof document !== 'undefined') initializeTimelineViewer(document);
