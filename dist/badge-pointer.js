'use strict';

// Keep touch gestures on the card while preserving mouse hover and QR taps.
window.bindBadgePointer = ({ stage, canInteract, onMove, onRelease }) => {
  let gesture = null;
  let suppressClickUntil = 0;

  function move(event) {
    stage.classList.add('is-interacting');
    onMove(event);
  }

  function finish(event, cancelled = false) {
    if (!gesture || (event && event.pointerId !== gesture.id)) return;
    const ended = gesture;
    gesture = null;
    if (ended.moved) suppressClickUntil = performance.now() + 500;
    if (ended.capture.hasPointerCapture(ended.id)) ended.capture.releasePointerCapture(ended.id);
    const bounds = stage.getBoundingClientRect();
    const inside = event && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (cancelled || ended.type !== 'mouse' || !inside) {
      stage.classList.remove('is-interacting');
      onRelease();
    }
  }

  stage.addEventListener('pointerdown', (event) => {
    if (!canInteract() || event.isPrimary === false || event.button !== 0 || gesture) return;
    suppressClickUntil = 0;
    // Leave a QR tap native; capture it only after it becomes a drag.
    const deferCapture = !!event.target.closest('button');
    gesture = { id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY, moved: false, capture: stage };
    if (!deferCapture) stage.setPointerCapture(event.pointerId);
    move(event);
  });

  stage.addEventListener('pointermove', (event) => {
    if (!canInteract() || event.isPrimary === false) return;
    if (gesture) {
      if (event.pointerId !== gesture.id) return;
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) {
        gesture.moved = true;
        if (!stage.hasPointerCapture(event.pointerId)) stage.setPointerCapture(event.pointerId);
      }
      if (gesture.moved && event.cancelable) event.preventDefault();
    } else if (event.pointerType !== 'mouse') return;
    move(event);
  });

  stage.addEventListener('pointerup', (event) => finish(event));
  stage.addEventListener('pointercancel', (event) => finish(event, true));
  stage.addEventListener('lostpointercapture', (event) => {
    // Ignore the child's implicit touch capture when the stage takes over.
    if (event.target === stage) finish(event, true);
  });
  stage.addEventListener('pointerleave', () => {
    if (gesture) return;
    stage.classList.remove('is-interacting');
    onRelease();
  });
  stage.addEventListener('click', (event) => {
    if (event.detail !== 0 && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  return () => {
    finish(null, true);
    stage.classList.remove('is-interacting');
    onRelease();
  };
};
