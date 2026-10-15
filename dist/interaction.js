// Use the actual pointer, so a touchscreen laptop supports mouse and touch alike.
export function cardActivation(previousTap, { id, pointerType, time, x = 0, y = 0 }) {
  if (pointerType !== 'touch' && pointerType !== 'pen') return { action: 'open', nextTap: null };
  const doubleTap = previousTap && previousTap.id === id && previousTap.pointerType === pointerType
    && time >= previousTap.time && time - previousTap.time <= 400
    && Math.hypot(x - previousTap.x, y - previousTap.y) <= 24;
  return doubleTap
    ? { action: 'open', nextTap: null }
    : { action: 'flip', nextTap: { id, pointerType, time, x, y } };
}

export function interactionHint({ touch, hover }) {
  if (touch && hover) return 'Mouse: hover to flip; click to open the paper. Touch: tap to flip; double-tap to open.';
  if (touch) return 'Tap a card to flip it; double-tap to open the paper.';
  return 'Hover over a card to flip it; click to open the paper.';
}

// Process touch before compatibility clicks: Safari may report those clicks as
// mouse input (or with detail=0). They must never follow the anchor on one tap.
export function bindCardActivation(link, { id, state, flip, open, now = () => performance.now() }) {
  let input = 'mouse', started = 0, startX = 0, startY = 0;
  let handled = false, cancelled = false, lastTouch = -Infinity;
  const isTouch = type => type === 'touch' || type === 'pen';
  const begin = (type, x, y) => {
    input = type; started = now(); startX = x; startY = y;
    handled = false; cancelled = false;
    if (!isTouch(type)) lastTouch = -Infinity;
  };
  const cancel = () => { cancelled = true; state.lastTap = null; };
  const activateTouch = (x, y) => {
    handled = true; lastTouch = now();
    const result = cardActivation(state.lastTap, { id, pointerType: input, time: lastTouch, x, y });
    state.lastTap = result.nextTap;
    if (result.action === 'open') open(); else flip();
  };
  link.addEventListener('pointerdown', event => {
    if (event.isPrimary === false) { cancel(); return; }
    begin(event.pointerType || 'mouse', event.clientX, event.clientY);
  });
  link.addEventListener('pointermove', event => {
    if (isTouch(input) && Math.hypot(event.clientX - startX, event.clientY - startY) > 12) cancel();
  });
  link.addEventListener('pointercancel', cancel);
  link.addEventListener('pointerup', event => {
    if (!isTouch(input) || cancelled || event.isPrimary === false) return;
    event.preventDefault();
    activateTouch(event.clientX, event.clientY);
  });
  link.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { cancel(); return; }
    const touch = event.touches[0];
    begin('touch', touch.clientX, touch.clientY);
  }, { passive: true });
  link.addEventListener('touchmove', event => {
    if (event.touches.length !== 1) { cancel(); return; }
    const touch = event.touches[0];
    if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 12) cancel();
  }, { passive: true });
  link.addEventListener('touchcancel', cancel);
  link.addEventListener('touchend', event => {
    if (cancelled || event.touches.length || event.changedTouches.length !== 1) return;
    event.preventDefault();
    if (!handled) {
      const touch = event.changedTouches[0];
      activateTouch(touch.clientX, touch.clientY);
    }
  }, { passive: false });
  link.addEventListener('keydown', event => {
    if (event.key === 'Enter') { input = 'keyboard'; lastTouch = -Infinity; state.lastTap = null; }
  });
  link.addEventListener('click', event => {
    const touchClick = isTouch(event.pointerType) || event.sourceCapabilities?.firesTouchEvents
      || now() - lastTouch < 800 || (isTouch(input) && now() - started < 1500);
    if (!touchClick) { state.lastTap = null; return; } // Native mouse/keyboard link navigation.
    event.preventDefault();
    if (!handled && !cancelled) activateTouch(event.clientX, event.clientY);
  });
}
