const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(new URL('../dist/badge-pointer.js', `file://${__filename.replaceAll('\\', '/')}`), 'utf8');

function setup(enabled = true) {
  const moves = [];
  let releases = 0;
  class Surface {
    constructor(button = false) {
      this.button = button;
      this.listeners = new Map();
      this.captured = new Set();
      this.classes = new Set();
      this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
    }
    addEventListener(type, handler) { this.listeners.set(type, handler); }
    closest() { return this.button ? this : null; }
    setPointerCapture(id) { this.captured.add(id); }
    hasPointerCapture(id) { return this.captured.has(id); }
    releasePointerCapture(id) { this.captured.delete(id); }
    getBoundingClientRect() { return { left: 10, top: 20, right: 310, bottom: 470 }; }
    fire(type, values = {}) {
      const event = {
        target: this, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: 100, clientY: 150, cancelable: true, detail: 1,
        prevented: false, stopped: false,
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; },
        ...values
      };
      this.listeners.get(type)?.(event);
      return event;
    }
  }
  const stage = new Surface();
  const qr = new Surface(true);
  const context = { window: {}, performance: { now: () => 1000 } };
  vm.runInNewContext(source, context);
  const reset = context.window.bindBadgePointer({
    stage, canInteract: () => enabled,
    onMove: event => moves.push([event.clientX, event.clientY]),
    onRelease: () => releases++
  });
  return { stage, qr, moves, reset, get releases() { return releases; } };
}

test('touch drag stays captured outside the badge and settles on release', () => {
  const h = setup();
  h.stage.fire('pointerdown');
  assert.ok(h.stage.hasPointerCapture(1));
  h.stage.fire('pointerleave');
  assert.equal(h.releases, 0);
  const move = h.stage.fire('pointermove', { clientX: 400, clientY: 500 });
  assert.equal(move.prevented, true);
  assert.deepEqual(h.moves.at(-1), [400, 500]);
  h.stage.fire('pointerup', { clientX: 400, clientY: 500 });
  assert.equal(h.releases, 1);
  assert.equal(h.stage.hasPointerCapture(1), false);
  assert.equal(h.stage.classes.has('is-interacting'), false);
});

test('QR taps work, while dragging across the QR suppresses the resulting click', () => {
  const h = setup();
  h.stage.fire('pointerdown', { target: h.qr });
  assert.equal(h.qr.hasPointerCapture(1), false);
  assert.equal(h.stage.hasPointerCapture(1), false);
  h.stage.fire('pointerup');
  assert.equal(h.stage.fire('click', { target: h.qr }).prevented, false);
  h.stage.fire('pointerdown', { target: h.qr });
  h.stage.fire('pointermove', { clientX: 190 });
  assert.ok(h.stage.hasPointerCapture(1));
  h.stage.fire('lostpointercapture', { target: h.qr });
  assert.ok(h.stage.hasPointerCapture(1));
  h.stage.fire('pointerup', { clientX: 190 });
  const click = h.stage.fire('click', { target: h.qr });
  assert.equal(click.prevented, true);
  assert.equal(click.stopped, true);
  assert.equal(h.stage.fire('click', { detail: 0 }).prevented, false);
  h.stage.fire('pointerdown', { target: h.qr });
  h.stage.fire('pointerup');
  assert.equal(h.stage.fire('click', { target: h.qr }).prevented, false);
});

test('cancel, lost capture, and reset all release touch interaction', () => {
  for (const end of ['pointercancel', 'lostpointercapture', 'reset']) {
    const h = setup();
    h.stage.fire('pointerdown');
    if (end === 'reset') h.reset();
    else h.stage.fire(end);
    assert.equal(h.stage.hasPointerCapture(1), false, end);
    assert.equal(h.stage.classes.has('is-interacting'), false, end);
    assert.ok(h.releases > 0, end);
    const before = h.moves.length;
    h.stage.fire('pointermove');
    assert.equal(h.moves.length, before, end);
  }
});

test('secondary fingers cannot take over the drag', () => {
  const h = setup();
  h.stage.fire('pointerdown');
  h.stage.fire('pointerdown', { pointerId: 2, isPrimary: false });
  h.stage.fire('pointermove', { pointerId: 2, isPrimary: false, clientX: 300 });
  h.stage.fire('pointerup', { pointerId: 2 });
  assert.equal(h.moves.length, 1);
  assert.ok(h.stage.hasPointerCapture(1));
});

test('mouse hover remains active after a click and stops on leave', () => {
  const h = setup();
  h.stage.fire('pointermove', { pointerType: 'mouse' });
  assert.equal(h.moves.length, 1);
  h.stage.fire('pointerdown', { pointerType: 'mouse' });
  h.stage.fire('pointerup', { pointerType: 'mouse' });
  assert.equal(h.releases, 0);
  h.stage.fire('pointerleave', { pointerType: 'mouse' });
  assert.equal(h.releases, 1);
});

test('disabled motion does not start a gesture', () => {
  const h = setup(false);
  h.stage.fire('pointerdown');
  h.stage.fire('pointermove');
  assert.equal(h.moves.length, 0);
  assert.equal(h.stage.hasPointerCapture(1), false);
});

test('badge decoration uses vector icons in the page and PNG exporter', () => {
  for (const file of ['index.html', 'app.js']) {
    const contents = fs.readFileSync(new URL(`../dist/${file}`, `file://${__filename.replaceAll('\\', '/')}`), 'utf8');
    assert.doesNotMatch(contents, /[\u2733\u2197\u226a]/u);
    assert.match(contents, /i-asterisk/);
    assert.match(contents, /i-arrow/);
  }
});
