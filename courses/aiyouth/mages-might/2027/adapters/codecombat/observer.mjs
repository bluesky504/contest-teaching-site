import { q } from '../../infra/quantity.mjs';
import { createTimeline } from '../../core/contest/timeline.mjs';

function installObserver() {
  const key = '__contestTimelineObserver';
  const mediator = window.Backbone?.Mediator;
  if (!mediator || typeof mediator.publish !== 'function') {
    return { ok: false, code: 'OBSERVER_NOT_READY' };
  }
  const previous = window[key];
  if (previous?.version === 1 && previous.mediator === mediator && mediator.publish === previous.wrapper) {
    previous.clear();
    return { ok: true, reused: true };
  }
  previous?.restore?.();
  const original = mediator.publish;
  let world;

  function read() {
    if (!world) return { ok: false, code: 'WORLD_NOT_CAPTURED' };
    if (!Array.isArray(world.frames) || !Array.isArray(world.thangs)) {
      return { ok: false, code: 'FRAME_DATA_UNAVAILABLE' };
    }
    const properties = ['health', 'fire', 'water', 'earth', 'mana', 'pos', 'exists'];
    const errors = [];
    const frames = Array.from({ length: world.frames.length }, (_, frameIndex) => {
      const frame = world.frames[frameIndex];
      if (!frame || !frame.thangStateMap) return null;
      const states = [];
      for (const entityId of Object.keys(frame.thangStateMap)) {
        const state = frame.thangStateMap[entityId];
        const values = [];
        for (const propName of properties) {
          try {
            if (typeof state?.getStateForProp !== 'function') {
              errors.push({ frame: frameIndex, entityId, propName, reason: 'STATE_READER_UNAVAILABLE' });
              continue;
            }
            const value = state.getStateForProp(propName);
            if (value === undefined) continue;
            if (value === null || typeof value === 'string' || typeof value === 'boolean'
              || (typeof value === 'number' && Number.isFinite(value))) {
              values.push([propName, value]);
            } else if (propName === 'pos' && value && typeof value === 'object') {
              const coordinates = {};
              for (const axis of ['x', 'y', 'z']) {
                if (typeof value[axis] === 'number' && Number.isFinite(value[axis])) coordinates[axis] = value[axis];
              }
              if (Object.keys(coordinates).length > 0) values.push([propName, coordinates]);
              else errors.push({ frame: frameIndex, entityId, propName, reason: 'NON_SCALAR_STATE' });
            } else {
              errors.push({ frame: frameIndex, entityId, propName, reason: 'NON_SCALAR_STATE' });
            }
          } catch {
            errors.push({ frame: frameIndex, entityId, propName, reason: 'PROPERTY_READ_FAILED' });
          }
        }
        states.push([entityId, Object.fromEntries(values)]);
      }
      return Object.fromEntries(states);
    });
    const entities = world.thangs.map((entity) => {
      const metadata = {};
      for (const name of ['id', 'team', 'type', 'spriteName']) {
        if (typeof entity?.[name] === 'string') metadata[name] = entity[name];
      }
      return metadata;
    });
    return {
      ok: true,
      schemaVersion: 1,
      source: 'world.frames',
      frameCount: frames.length,
      frameRate: typeof world.frameRate === 'number' && Number.isFinite(world.frameRate) && world.frameRate > 0 ? world.frameRate : null,
      entities,
      frames,
      errors,
    };
  }

  const wrapper = function (channel, ...args) {
    try {
      if (channel === 'surface:frame-changed' || channel === 'god:streaming-world-updated') {
        for (const payload of args) {
          if (payload?.world && Array.isArray(payload.world.thangs)) world = payload.world;
        }
      }
    } catch {}
    return original.apply(this, [channel, ...args]);
  };
  window[key] = Object.freeze({
    version: 1,
    mediator,
    wrapper,
    read,
    clear() { world = undefined; },
    restore() { if (mediator.publish === wrapper) mediator.publish = original; world = undefined; },
  });
  mediator.publish = wrapper;
  return { ok: true, reused: false };
}

function readCapturedTimeline() {
  const observer = window.__contestTimelineObserver;
  if (!observer || typeof observer.read !== 'function') return { ok: false, code: 'OBSERVER_NOT_READY' };
  return observer.read();
}

export const HOOK_SOURCE = `(${installObserver.toString()})()`;
export const READ_TIMELINE = `(${readCapturedTimeline.toString()})()`;

function assertRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

export function parseTimeline(raw, options) {
  assertRecord(raw, 'Raw timeline');
  if (raw.ok !== true || raw.schemaVersion !== 1 || raw.source !== 'world.frames'
    || !Array.isArray(raw.frames) || !Array.isArray(raw.entities) || !Array.isArray(raw.errors)
    || raw.frameCount !== raw.frames.length) {
    throw new TypeError('Raw timeline is unavailable or has an invalid schema');
  }
  assertRecord(options, 'Timeline mapping');
  const unknownKeys = Object.keys(options).filter((key) => !['sides', 'fields', 'warmupFrames', 'endedBy'].includes(key));
  if (unknownKeys.length > 0) throw new TypeError(`Unknown timeline mapping options: ${unknownKeys.join(', ')}`);
  const { sides, fields, warmupFrames, endedBy } = options;
  if (!Array.isArray(sides) || !Array.isArray(fields) || fields.length === 0) {
    throw new TypeError('Timeline mapping requires sides and a non-empty field array');
  }
  const sideIds = new Set(sides.map((side) => side.id));
  const identities = new Set(raw.entities.map((entity) => entity.id));
  const boundProperties = new Set();
  const mappings = Array.from({ length: fields.length }, (_, index) => {
    const field = fields[index];
    assertRecord(field, 'Timeline field');
    for (const name of ['sideId', 'entityId', 'propName']) {
      if (typeof field[name] !== 'string' || field[name].length === 0) throw new TypeError(`Timeline field requires ${name}`);
    }
    if (!sideIds.has(field.sideId) || !identities.has(field.entityId)) {
      throw new TypeError(`Timeline field ${field.sideId}.${field.propName} has an unknown side or entity`);
    }
    const key = JSON.stringify([field.sideId, field.propName]);
    if (boundProperties.has(key)) throw new TypeError(`Duplicate timeline field ${field.sideId}.${field.propName}`);
    boundProperties.add(key);
    q(null, field.unit, 'unknown', field.propName);
    return { sideId: field.sideId, entityId: field.entityId, propName: field.propName, unit: field.unit };
  });
  const failures = new Set(raw.errors.map((error) => {
    if (!Number.isSafeInteger(error?.frame) || error.frame < 0 || error.frame >= raw.frames.length
      || typeof error.entityId !== 'string' || typeof error.propName !== 'string' || typeof error.reason !== 'string') {
      throw new TypeError('Invalid timeline property-read error');
    }
    return JSON.stringify([error.frame, error.entityId, error.propName]);
  }));
  const frames = Array.from({ length: raw.frames.length }, (_, frameIndex) => {
    const frame = raw.frames[frameIndex];
    if (frame === null || frame === undefined) return undefined;
    assertRecord(frame, `Frame ${frameIndex}`);
    const states = new Map();
    for (const field of mappings) {
      if (!Object.hasOwn(frame, field.entityId)) continue;
      const state = frame[field.entityId];
      assertRecord(state, `Frame ${frameIndex}.${field.entityId}`);
      const failed = failures.has(JSON.stringify([frameIndex, field.entityId, field.propName]));
      if (!failed && !Object.hasOwn(state, field.propName)) continue;
      const value = failed ? null : state[field.propName];
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
        throw new TypeError(`Frame ${frameIndex}.${field.entityId}.${field.propName} must be a finite number or null`);
      }
      const quantity = q(value, field.unit, value === null ? 'unknown' : 'measured', field.propName);
      if (!states.has(field.sideId)) states.set(field.sideId, []);
      states.get(field.sideId).push([field.propName, quantity]);
    }
    return Object.fromEntries(Array.from(states, ([sideId, properties]) => [sideId, Object.fromEntries(properties)]));
  });
  return createTimeline({ frames, sides, warmupFrames, endedBy });
}
