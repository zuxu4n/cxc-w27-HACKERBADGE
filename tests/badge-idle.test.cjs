const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(reduce = false) {
  class Surface {
    listeners = new Map();
    values = new Map();
    captured = new Set();
    classes = new Set();
    open = false;
    hidden = false;
    classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
    style = { setProperty: (name, value) => this.values.set(name, value) };
    addEventListener(type, handler) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(handler);
    }
    fire(type, values = {}) {
      const event = { target: this, pointerType: 'mouse', pointerId: 1, button: 0, isPrimary: true,
        clientX: 270, clientY: 120, cancelable: true, preventDefault() {}, ...values };
      for (const handler of this.listeners.get(type) || []) handler(event);
    }
    closest() { return null; }
    setAttribute() {}
    showModal() { this.open = true; }
    contains() { return false; }
    setPointerCapture(id) { this.captured.add(id); }
    hasPointerCapture(id) { return this.captured.has(id); }
    releasePointerCapture(id) { this.captured.delete(id); }
    getBoundingClientRect() { return { left: 0, top: 0, right: 392, bottom: 592, width: 392, height: 592 }; }
  }
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, new Surface());
    return nodes.get(selector);
  };
  node('#badge-form').elements = new Proxy({}, { get: (_, key) => node(`field:${key}`) });
  node('#badge-form').elements.qrUrl.value = 'https://example.com/profile';
  const document = new Surface();
  document.querySelector = node;
  const reducedMotion = new Surface();
  reducedMotion.matches = reduce;
  const window = new Surface();
  window.matchMedia = () => reducedMotion;
  const frames = new Map();
  let frameId = 0, time = 1000;
  const context = vm.createContext({ window, document, URL, clearTimeout() {}, createBadgeQR: () => '<svg/>', performance: { now: () => time },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id) });
  const read = file => fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8');
  vm.runInContext(read('badge-pointer.js'), context);
  // These are globals in a browser's classic script environment.
  Object.assign(context, window);
  vm.runInContext(read('app.js').replace(/\nfitBadgePreview\(\);[\s\S]*$/, ''), context);
  vm.runInContext('setHolo(state.holo)', context);
  const step = (count = 1, deltaMs = 1000 / 60) => {
    for (let index = 0; index < count; index++) {
      time += deltaMs;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(time);
    }
  };
  const pose = () => Object.fromEntries(['--rx', '--ry', '--mx', '--my'].map(key => [key, parseFloat(node('#badge').values.get(key))]));
  return { node, document, reducedMotion, frames, step, pose,
    run: source => vm.runInContext(source, context) };
}

test('idle motion does not depend on a running JavaScript animation-frame loop', () => {
  const h = setup();
  h.step(1800);
  assert.equal(h.frames.size, 0);
  assert.equal(h.pose()['--rx'], 0);
  assert.equal(h.node('#badge-stage').classes.has('idle-paused'), false);
  assert.equal(h.node('#badge-stage').classes.has('motion-disabled'), false);
});

test('touch release settles the interactive tilt without leaving idle motion paused', () => {
  const h = setup();
  const stage = h.node('#badge-stage');
  h.step(180);
  stage.fire('pointerdown', { pointerType: 'touch' });
  h.step(120);
  const held = h.pose();
  h.step(180);
  assert.deepEqual(h.pose(), held);
  assert.equal(h.frames.size, 0);
  stage.fire('pointerup', { pointerType: 'touch' });
  h.step(180);
  assert.equal(h.frames.size, 0);
  assert.equal(h.pose()['--rx'], 0);
  assert.equal(stage.classes.has('idle-paused'), false);
  assert.notDeepEqual(h.pose(), held);
});

test('scan mode and the holo toggle control the native animation without a stale pause', () => {
  const h = setup();
  h.step(180);
  h.run('openScan()');
  assert.equal(h.node('#scan-dialog').open, true);
  assert.equal(h.node('#badge-stage').classes.has('idle-paused'), true);
  h.step(180);
  assert.equal(h.frames.size, 0);
  h.node('#scan-dialog').open = false;
  h.node('#scan-dialog').fire('close');
  h.step(60);
  assert.equal(h.node('#badge-stage').classes.has('idle-paused'), false);
  h.run('setHolo(false)');
  h.step(180);
  assert.equal(h.frames.size, 0);
  assert.equal(h.pose()['--rx'], 0);
  assert.equal(h.node('#badge-stage').classes.has('motion-disabled'), true);
  h.run('setHolo(true)');
  h.step(60);
  assert.equal(h.node('#badge-stage').classes.has('motion-disabled'), false);
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.document.fire('visibilitychange');
  h.step(60);
  assert.equal(h.node('#badge-stage').classes.has('idle-paused'), false);
  assert.equal(h.node('#badge-stage').classes.has('motion-disabled'), false);
});

test('keyboard release removes its native animation pause', () => {
  const h = setup();
  h.node('#badge').fire('keydown', { key: 'ArrowRight' });
  h.step(120);
  assert.equal(h.node('#badge-stage').classes.has('keyboard-active'), true);
  assert.equal(h.pose()['--ry'], 3);
  h.node('#badge').fire('keyup', { key: 'ArrowRight' });
  h.step(180);
  assert.equal(h.node('#badge-stage').classes.has('keyboard-active'), false);
  assert.equal(h.pose()['--ry'], 0);
});

test('reduced motion disables idle animation at startup and when the preference changes', () => {
  const quiet = setup(true);
  quiet.step(180);
  assert.equal(quiet.frames.size, 0);
  assert.equal(quiet.node('#badge-stage').classes.has('motion-disabled'), true);
  const h = setup();
  h.step(180);
  h.reducedMotion.matches = true;
  h.reducedMotion.fire('change', { matches: true });
  h.step(180);
  assert.equal(h.frames.size, 0);
  assert.equal(h.pose()['--rx'], 0);
});
