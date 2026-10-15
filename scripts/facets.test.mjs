import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DIMENSIONS, buildFacetGrid, cardVenueLabel, facetValue, venueGroupFor } from '../dist/facets.js';
import { fitFacetGrid } from '../dist/layout.js';

const papers = JSON.parse(fs.readFileSync(new URL('../dist/papers.json', import.meta.url)));

test('front venue labels distinguish conference papers, journal presentations, and review status', () => {
  const label = id => cardVenueLabel(papers.find(paper => paper.id === id));
  assert.equal(label('vl2nl'), 'CHI 2024');
  assert.equal(label('clams'), 'VIS 2023 / TVCG');
  assert.equal(label('dabrush'), 'VIS 2026 / TVCG');
  assert.equal(label('clm'), 'TPAMI 2025');
  assert.equal(label('zadu'), 'VIS 2023');
  assert.equal(label('ggaction'), 'CHI 2027 · under review');
});

test('fine categories retain their coarse parent and classify every selected paper', () => {
  const fine = new Map(DIMENSIONS.categoryFine.values.map(([key, label, parent]) => [key, { label, parent }]));
  for (const paper of papers) {
    assert(fine.has(paper.fineCategory), `Missing fine category: ${paper.id}`);
    assert.equal(fine.get(paper.fineCategory).parent, paper.category, paper.id);
  }
  const grid = buildFacetGrid(papers, 'categoryFine');
  assert.deepEqual(grid.cells[0].map(cell => cell.papers.length), [4, 6, 3, 2, 4, 2]);
  assert(grid.columns.every(column => column.parentLabel));
});

test('keeps all six fine X groups in horizontal columns on a phone', () => {
  const grid = buildFacetGrid(papers, 'categoryFine');
  const input = { counts: grid.cells.map(row => row.map(cell => cell.papers.length)), width: 370, height: 400, cardGap: 5, cellGap: 6, cellPadding: 3 };
  const fit = fitFacetGrid(input);
  assert(fit);
  assert.equal(fit.widths.length, 6);
  assert.equal(fit.rows.length, 1);
  assert(fit.widths.reduce((a, b) => a + b, 0) + 5 * input.cellGap <= input.width);
  assert(fit.heights[0] <= input.height);
});

test('fine row labels reserve enough height while keeping all cards within cells', () => {
  const grid = buildFacetGrid(papers, 'year', 'categoryFine');
  const minHeights = [108, 30, 30, 30, 115, 50];
  const fit = fitFacetGrid({ counts: grid.cells.map(row => row.map(cell => cell.papers.length)), width: 1000, height: 490, cardGap: 5, cellGap: 6, cellPadding: 3.5, minHeights });
  assert(fit);
  fit.heights.forEach((height, r) => assert(height >= minHeights[r]));
  assert(fit.heights.reduce((a, b) => a + b, 0) + 5 * 6 <= 490);
});

test('each distinct axis combination routes every paper to exactly one intersection', () => {
  for (const x of Object.keys(DIMENSIONS)) {
    for (const y of ['none', ...Object.keys(DIMENSIONS).filter(key => key !== x)]) {
      const grid = buildFacetGrid(papers, x, y);
      const routed = grid.cells.flat().flatMap(cell => cell.papers);
      assert.equal(routed.length, papers.length);
      assert.equal(new Set(routed.map(paper => paper.id)).size, papers.length);
      for (const cell of grid.cells.flat()) {
        assert(cell.papers.every(paper => facetValue(paper, x) === cell.x && facetValue(paper, y) === cell.y));
      }
    }
  }
});

test('venue and authorship groups preserve publication semantics', () => {
  const byId = id => papers.find(paper => paper.id === id);
  assert.equal(venueGroupFor(byId('ggaction')), 'others');
  assert.equal(venueGroupFor(byId('backstage')), 'sigchi');
  assert.equal(venueGroupFor(byId('dabrush')), 'vis');
  assert.equal(venueGroupFor(byId('drbias')), 'others');
  assert.equal(venueGroupFor(byId('misannot')), 'others');
  for (const paper of papers.filter(paper => /EuroVis|PacificVis|Information Visualization/i.test(paper.venue))) {
    assert.equal(venueGroupFor(paper), 'others', paper.id);
  }
  assert.deepEqual(DIMENSIONS.venue.values.map(([, label]) => label), ['ACM CHI', 'IEEE VIS', 'Others']);
  assert.equal(venueGroupFor(byId('clm')), 'others');
  assert.equal(facetValue(byId('clams'), 'authorship'), 'first');
  assert.equal(facetValue(byId('tailvis'), 'authorship'), 'coauthor');
  assert.throws(() => buildFacetGrid(papers, 'year', 'year'));
});

test('all two-axis matrices fit wide, portrait, and short landscape spaces', () => {
  for (const x of Object.keys(DIMENSIONS)) {
    for (const y of Object.keys(DIMENSIONS).filter(key => key !== x)) {
      const grid = buildFacetGrid(papers, x, y);
      for (const [width, height] of [[1000, 520], [260, 360], [620, 150]]) {
        const input = { counts: grid.cells.map(row => row.map(cell => cell.papers.length)), width, height, cardGap: 5, cellGap: 6, cellPadding: 3.5 };
        const fit = fitFacetGrid(input);
        assert(fit, `No fit: ${x}/${y} ${width}×${height}`);
        assert(fit.widths.reduce((a, b) => a + b, 0) + (grid.columns.length - 1) * input.cellGap <= width);
        assert(fit.heights.reduce((a, b) => a + b, 0) + (grid.rows.length - 1) * input.cellGap <= height);
        grid.cells.forEach((row, r) => row.forEach((cell, c) => {
          assert(Math.ceil(cell.papers.length / fit.columns[c]) <= fit.rows[r]);
        }));
      }
    }
  }
});
