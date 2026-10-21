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

test('touch reaches the requested pose on the next frame, then eases on release', () => {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const { advanceBadgeMotion } = context.window;
  const pose = { x: 6, y: 9, mx: 80, my: 20 };
  const touch = { x: 0, y: 0, mx: 50, my: 50 };
  assert.equal(advanceBadgeMotion(touch, pose, true), false);
  assert.deepEqual(touch, pose);
  advanceBadgeMotion(touch, { x: 0, y: 0, mx: 62, my: 33 });
  assert.ok(touch.x > 0 && touch.x < pose.x);
  const hover = { x: 0, y: 0, mx: 50, my: 50 };
  assert.equal(advanceBadgeMotion(hover, pose), true);
  assert.ok(hover.y > 0 && hover.y < pose.y);
});

test('short touch drags produce stronger bounded tilt without changing the light position', () => {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const bounds = { left: 10, top: 20, width: 300, height: 450 };
  const point = { clientX: 190, clientY: 200 };
  const touch = context.window.badgePointerPose({ ...point, pointerType: 'touch' }, bounds);
  const mouse = context.window.badgePointerPose({ ...point, pointerType: 'mouse' }, bounds);
  assert.equal(touch.y, mouse.y * 1.5);
  assert.equal(Math.abs(touch.x), Math.abs(mouse.x) * 1.5);
  assert.equal(touch.mx, mouse.mx);
  assert.equal(touch.my, mouse.my);
  const edge = context.window.badgePointerPose({ clientX: 1000, clientY: -1000, pointerType: 'touch' }, bounds);
  assert.ok(Math.abs(edge.x) <= 12.75 && Math.abs(edge.y) <= 15);
});

test('touching either edge moves it down on screen without reversing horizontal movement', () => {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const bounds = { left: 0, top: 0, width: 300, height: 450 };
  const pose = (clientX, clientY, pointerType = 'touch') => context.window.badgePointerPose({ clientX, clientY, pointerType }, bounds);
  const bottom = pose(150, 375);
  const top = pose(150, 75);
  assert.ok(bottom.x > 0);
  assert.ok(top.x > 0);
  assert.equal(pose(150, 225).x, 0);
  assert.ok(pose(250, 225).y > 0);
  assert.ok(pose(50, 225).y < 0);
  assert.ok(pose(150, 375, 'mouse').x < 0);
  // Under the card's perspective, the bottom edge projects lower on screen.
  const halfHeight = bounds.height / 2;
  const radians = bottom.x * Math.PI / 180;
  const projectedBottom = halfHeight * Math.cos(radians) / (1 - halfHeight * Math.sin(radians) / 1400);
  assert.ok(projectedBottom > halfHeight);
  const topRadians = top.x * Math.PI / 180;
  const projectedTop = -halfHeight * Math.cos(topRadians) / (1 + halfHeight * Math.sin(topRadians) / 1400);
  assert.ok(projectedTop > -halfHeight);
});

test('badge decoration uses vector icons in the page and PNG exporter', () => {
  for (const file of ['index.html', 'app.js']) {
    const contents = fs.readFileSync(new URL(`../dist/${file}`, `file://${__filename.replaceAll('\\', '/')}`), 'utf8');
    assert.doesNotMatch(contents, /[\u2733\u2197\u226a]/u);
    assert.match(contents, /i-asterisk/);
    assert.match(contents, /i-arrow/);
  }
});
