import test from 'node:test';
import assert from 'node:assert/strict';
import { cardTransform, createCardMotion } from '../dist/motion.js';

const rect = (left, top, size = 100) => ({ left, top, width: size, height: size });
function card(position) {
  return {
    isConnected: true,
    position,
    animations: [],
    getBoundingClientRect() { return this.position; },
    animate(keyframes, options) {
      const animation = { keyframes, options, cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
      this.animations.push(animation);
      return animation;
    },
  };
}

test('card motion maps the old square exactly onto the new square without rotation', () => {
  assert.equal(cardTransform(rect(20, 50, 120), rect(100, 10, 80)), 'translate(-80px, 40px) scale(1.5, 1.5)');
  assert.equal(cardTransform(rect(20, 50), rect(20.2, 50.1)), null);
  assert.equal(cardTransform(null, rect(20, 50)), null);
  assert.equal(cardTransform(rect(20, 50), rect(20, 50, 0)), null);
});

test('only moved cards animate, on a shared short timeline with no stagger', () => {
  const moved = card(rect(20, 50)), stationary = card(rect(200, 50));
  const motion = createCardMotion({ reducedMotion: () => false });
  const before = motion.capture([moved, stationary]);
  moved.position = rect(400, 150, 80);
  motion.play([moved, stationary], before);
  assert.equal(moved.animations.length, 1);
  assert.equal(stationary.animations.length, 0);
  assert.deepEqual(moved.animations[0].keyframes, [{ transform: 'translate(-380px, -100px) scale(1.25, 1.25)' }, { transform: 'none' }]);
  assert.equal(moved.animations[0].options.duration, 260);
  assert.equal(moved.animations[0].options.delay, undefined);
});

test('a rapid axis change starts at the currently visible position and cancels old motion', () => {
  const node = card(rect(20, 50));
  const motion = createCardMotion({ reducedMotion: () => false });
  const first = motion.capture([node]);
  node.position = rect(400, 150);
  motion.play([node], first);
  const interrupted = node.animations[0];
  node.position = rect(180, 90); // The interpolated on-screen rectangle.
  const second = motion.capture([node]);
  assert(interrupted.cancelled);
  node.position = rect(600, 50);
  motion.play([node], second);
  assert.equal(node.animations[1].keyframes[0].transform, 'translate(-420px, 40px) scale(1, 1)');
});

test('reduced motion skips movement and can cancel an in-progress transition', () => {
  let reduced = false;
  const node = card(rect(20, 50));
  const motion = createCardMotion({ reducedMotion: () => reduced });
  const before = motion.capture([node]);
  node.position = rect(200, 50);
  motion.play([node], before);
  reduced = true;
  const after = motion.capture([node]);
  assert(node.animations[0].cancelled);
  assert.equal(after.size, 0);
  motion.play([node], before);
  assert.equal(node.animations.length, 1);
});
