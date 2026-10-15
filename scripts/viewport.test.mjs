import test from 'node:test';
import assert from 'node:assert/strict';
import { updateViewport } from '../dist/viewport.js';

test('pinch zoom preserves layout dimensions through zooming and zooming back out', () => {
  let state = updateViewport(null, { width: 402, height: 670 });
  for (const scale of [1.2, 1.8, 2.5, 2, 1.4, 1]) {
    state = updateViewport(state, { width: 402, height: 670 / scale, scale });
    assert.equal(state.width, 402);
    assert.equal(state.height, 670);
    assert.equal(state.changed, false);
  }
});

test('browser toolbar height changes still update layout at normal scale', () => {
  const initial = updateViewport(null, { width: 402, height: 670 });
  const expanded = updateViewport(initial, { width: 402, height: 750, scale: 1 });
  assert.equal(expanded.height, 750);
  assert.equal(expanded.changed, true);
});

test('a real width change still updates layout while zoomed', () => {
  const initial = updateViewport(null, { width: 402, height: 670 });
  const rotated = updateViewport(initial, { width: 874, height: 180, scale: 2 });
  assert.equal(rotated.width, 874);
  assert.equal(rotated.height, 360);
  assert.equal(rotated.changed, true);
});

test('an initially zoomed page uses its unscaled height for the first layout', () => {
  const initial = updateViewport(null, { width: 402, height: 335, scale: 2 });
  assert.equal(initial.height, 670);
  assert.equal(initial.changed, true);
});
