import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCardGroups } from '../dist/layout.js';

test('keeps coarse X groups horizontal in a narrow phone viewport', () => {
  const input = { counts: [15, 6], width: 370, height: 436, headers: [40, 40], cardGap: 8, sectionGap: 20, portrait: false };
  const fit = fitCardGroups(input);
  assert(fit);
  const widths = fit.columns.map((columns, i) => columns * fit.sizes[i] + (columns - 1) * input.cardGap);
  assert(widths[0] + widths[1] + input.sectionGap <= input.width);
  assert.equal(fit.rows[0], fit.rows[1]);
  assert.equal(fit.sizes[0], fit.sizes[1]);
  assert(Math.max(...fit.rows.map(rows => 40 + rows * fit.sizes[0] + (rows - 1) * input.cardGap)) <= input.height);
});

test('uses fewer columns and more shared rows to enlarge cards on tall phones', () => {
  for (const height of [436, 510, 680]) {
    const input = { counts: [15, 6], width: 370, height, headers: [40, 40], cardGap: 8, sectionGap: 20, portrait: false };
    const fit = fitCardGroups(input);
    assert(fit.sizes[0] >= 60, `Cards should use the tall viewport at height ${height}`);
    assert(fit.columns[0] + fit.columns[1] <= 5);
    assert(fit.rows[0] >= 5);
    assert.equal(fit.rows[0], fit.rows[1]);
    assert(input.counts.every((count, i) => count <= fit.columns[i] * fit.rows[i]));
    const used = 40 + fit.rows[0] * fit.sizes[0] + (fit.rows[0] - 1) * input.cardGap;
    assert(used <= height);
    assert(used >= height * .75, 'Use most of the phone height while maximizing square card size');
  }
});

test('keeps both groups at one shared card size in a wide window', () => {
  const result = fitCardGroups({ counts: [17, 8], width: 1238, height: 614, headers: [52, 52], cardGap: 14, sectionGap: 50, portrait: false });
  assert.equal(result.sizes[0], result.sizes[1]);
  assert(result.sizes[0] >= 130);
});

test('adapts both column counts across wide, narrow, and portrait spaces without clipping', () => {
  const choices = new Set();
  for (const [width, height, portrait] of [[1238, 614, false], [1860, 720, false], [950, 420, false], [800, 205, false], [1860, 130, false], [358, 485, true], [288, 305, true], [700, 690, true]]) {
    const input = { counts: [17, 8], width, height, headers: [35, 35], cardGap: 9, sectionGap: 28, portrait, minWidths: [120, 174] };
    const result = fitCardGroups(input);
    assert(result, `No fit for ${width}×${height}`);
    const widths = result.columns.map((columns, i) => columns * result.sizes[i] + (columns - 1) * input.cardGap);
    const heights = result.rows.map((rows, i) => input.headers[i] + rows * result.sizes[i] + (rows - 1) * input.cardGap);
    if (portrait) {
      assert(Math.max(...widths) <= width);
      assert(heights[0] + heights[1] + input.sectionGap <= height);
    } else {
      assert(widths[0] + widths[1] + input.sectionGap <= width);
      assert(Math.max(...heights) <= height);
    }
    if (!portrait) assert(widths.every((width, i) => width >= input.minWidths[i]));
    assert.equal(result.sizes[0], result.sizes[1]);
    assert.equal(result.rows[0], result.rows[1], 'One-axis groups must share row tracks');
    choices.add(result.columns.join(','));
  }
  assert(choices.size >= 4, 'Expected rearrangement across viewport shapes');
});
