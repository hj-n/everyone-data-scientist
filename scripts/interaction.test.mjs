import test from 'node:test';
import assert from 'node:assert/strict';
import { cardActivation, interactionHint, bindCardActivation } from '../dist/interaction.js';

const tap = (previous, time, overrides = {}) => cardActivation(previous, { id: 'dadr', pointerType: 'touch', time, x: 50, y: 80, ...overrides });

test('a touch first flips and a nearby second tap opens the same paper', () => {
  const first = tap(null, 1000);
  assert.equal(first.action, 'flip');
  const second = tap(first.nextTap, 1250, { x: 57, y: 83 });
  assert.equal(second.action, 'open');
  assert.equal(second.nextTap, null);
  assert.equal(tap(second.nextTap, 1400).action, 'flip');
});

test('slow, distant, or different-card taps do not open a link', () => {
  const first = tap(null, 1000);
  for (const [time, overrides] of [[1500, {}], [1200, { x: 90 }], [1200, { id: 'clams' }], [900, {}]]) {
    assert.equal(tap(first.nextTap, time, overrides).action, 'flip');
  }
});

test('mouse and keyboard open immediately even after touch input on the same device', () => {
  const first = tap(null, 1000);
  for (const pointerType of ['mouse', 'keyboard']) {
    const result = tap(first.nextTap, 1100, { pointerType });
    assert.equal(result.action, 'open');
    assert.equal(result.nextTap, null);
  }
  const pen = tap(null, 2000, { pointerType: 'pen' });
  assert.equal(pen.action, 'flip');
  assert.equal(tap(pen.nextTap, 2200, { pointerType: 'pen' }).action, 'open');
});

test('footer instructions cover mouse, touch, and hybrid devices', () => {
  assert.match(interactionHint({ touch: false, hover: true }), /Hover.*click to open/);
  assert.match(interactionHint({ touch: true, hover: false }), /Tap.*double-tap to open/);
  const hybrid = interactionHint({ touch: true, hover: true });
  assert.match(hybrid, /Mouse:.*Touch:/);
});

function touchHarness() {
  const link = new EventTarget();
  let clock = 1000, flips = 0, opens = 0;
  bindCardActivation(link, { id: 'dadr', state: { lastTap: null }, flip: () => flips++, open: () => opens++, now: () => clock });
  const fire = (type, properties = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, properties);
    link.dispatchEvent(event);
    return event;
  };
  const point = { clientX: 50, clientY: 80 };
  return { fire, point, advance: ms => { clock += ms; }, counts: () => ({ flips, opens }) };
}

test('native touch plus a mouse-labelled compatibility click flips only once and never opens', () => {
  const h = touchHarness();
  const touchTap = () => {
    h.fire('pointerdown', { ...h.point, pointerType: 'touch', isPrimary: true });
    h.fire('touchstart', { touches: [h.point] });
    h.fire('pointerup', { ...h.point, pointerType: 'touch', isPrimary: true });
    h.fire('touchend', { touches: [], changedTouches: [h.point] });
    // Safari/embedded webviews can omit the pointer type or label it mouse.
    assert(h.fire('click', { ...h.point, pointerType: 'mouse', detail: 0 }).defaultPrevented);
  };
  touchTap();
  assert.deepEqual(h.counts(), { flips: 1, opens: 0 });
  h.advance(250);
  touchTap();
  assert.deepEqual(h.counts(), { flips: 1, opens: 1 });
});

test('touch-event-only devices suppress the first link activation and open on double-tap', () => {
  const h = touchHarness();
  for (let i = 0; i < 2; i++) {
    h.fire('touchstart', { touches: [h.point] });
    assert(h.fire('touchend', { touches: [], changedTouches: [h.point] }).defaultPrevented);
    assert(h.fire('click', { ...h.point, detail: 0 }).defaultPrevented);
    assert.deepEqual(h.counts(), { flips: 1, opens: i });
    h.advance(250);
  }
});

test('scrolls and pinches do not activate a paper', () => {
  const h = touchHarness();
  h.fire('pointerdown', { ...h.point, pointerType: 'touch', isPrimary: true });
  h.fire('pointermove', { clientX: 50, clientY: 140, pointerType: 'touch' });
  h.fire('pointercancel');
  h.fire('pointerup', { ...h.point, pointerType: 'touch', isPrimary: true });
  assert(h.fire('click', { ...h.point, detail: 0 }).defaultPrevented);
  h.fire('touchstart', { touches: [h.point, h.point] });
  h.fire('touchend', { touches: [], changedTouches: [h.point] });
  assert.deepEqual(h.counts(), { flips: 0, opens: 0 });
});

test('a real mouse or keyboard immediately after touch still follows the link', () => {
  const h = touchHarness();
  h.fire('pointerdown', { ...h.point, pointerType: 'touch', isPrimary: true });
  h.fire('pointerup', { ...h.point, pointerType: 'touch', isPrimary: true });
  h.fire('pointerdown', { ...h.point, pointerType: 'mouse', isPrimary: true });
  assert.equal(h.fire('click', { ...h.point, pointerType: 'mouse', detail: 1 }).defaultPrevented, false);
  h.fire('keydown', { key: 'Enter' });
  assert.equal(h.fire('click', { detail: 0 }).defaultPrevented, false);
  assert.deepEqual(h.counts(), { flips: 1, opens: 0 });
});
