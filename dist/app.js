import { fitCardGroups, fitFacetGrid } from './layout.js';
import { DIMENSIONS, buildFacetGrid, cardVenueLabel } from './facets.js';
import { updateViewport } from './viewport.js';
import { bindCardActivation, interactionHint } from './interaction.js';
import { createCardMotion } from './motion.js';

const info = document.querySelector('#paper-info');
const details = info.querySelector('.info-details');
const hint = info.querySelector('.info-hint');
const main = document.querySelector('main');
const research = document.querySelector('.research');
const xSelect = document.querySelector('#x-axis');
const ySelect = document.querySelector('#y-axis');
const venueToggle = document.querySelector('#venue-toggle');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const axes = { x: 'category', y: 'none' };
const paperNodes = new Map();
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const cardMotion = createCardMotion({ reducedMotion: () => motionPreference.matches });
motionPreference.addEventListener('change', () => { if (motionPreference.matches) cardMotion.cancel(); });
let active = null;
const interactionState = { lastTap: null };
let papers = [];
let grid = null;
let viewportState = updateViewport(null, readViewport());
let hasLayout = false;
const axisPickers = [];

function closeAxisMenus() {
  axisPickers.forEach(({ trigger, menu }) => {
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  });
}
function createAxisPicker(axis, trigger) {
  const menu = document.querySelector(`#${axis}-axis-options`);
  const values = [...(axis === 'y' ? [['none', 'None']] : []), ...Object.entries(DIMENSIONS).map(([key, dimension]) => [key, dimension.label])];
  const options = values.map(([value, label]) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.setAttribute('role', 'option');
    option.tabIndex = -1;
    option.dataset.value = value;
    option.textContent = label;
    option.addEventListener('click', () => {
      const changed = axes[axis] !== value;
      axes[axis] = value;
      closeAxisMenus();
      if (changed) render(true);
      trigger.focus();
    });
    menu.append(option);
    return option;
  });
  function openMenu(focusOption = false) {
    closeAxisMenus();
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (focusOption) options.find(option => option.dataset.value === axes[axis] && !option.disabled)?.focus();
  }
  trigger.addEventListener('click', () => { if (menu.hidden) openMenu(); else closeAxisMenus(); });
  trigger.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeAxisMenus(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(true);
    }
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeAxisMenus(); trigger.focus(); return; }
    const enabled = options.filter(option => !option.disabled);
    const index = enabled.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % enabled.length;
    if (event.key === 'ArrowUp') next = (index - 1 + enabled.length) % enabled.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = enabled.length - 1;
    if (next !== undefined) { event.preventDefault(); enabled[next].focus(); }
  });
  axisPickers.push({ axis, trigger, menu, options, values });
}
createAxisPicker('x', xSelect);
createAxisPicker('y', ySelect);

function clearInfo() {
  active?.element.classList.remove('active');
  active = null;
  details.replaceChildren();
  hint.textContent = interactionHint({ touch: navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches, hover: matchMedia('(any-hover: hover)').matches });
}
function showInfo(element, paper) {
  if (active?.element === element) return;
  clearInfo();
  active = { element, paper };
  element.classList.add('active');
  details.innerHTML = `<p class="info-title">${escape(paper.title)}</p><p class="info-authors">${escape(paper.authors)}</p><p class="info-venue">${escape(paper.venueFull)}</p>`;
}
function createPaper(paper) {
  const element = document.createElement('article');
  element.className = `paper ${paper.category}${paper.firstAuthor ? '' : ' co-author'}`;
  element.dataset.id = paper.id;
  const logoCaption = paper.backCaption || (!paper.backText ? paper.backStatus : '');
  const backLogos = paper.backText
    ? `<span class="venue-type"><span class="venue-text">${escape(paper.backText)}</span>${paper.backStatus ? `<span class="venue-status">${escape(paper.backStatus)}</span>` : ''}</span>`
    : paper.presentationLogo
      ? `<img class="conference-logo" src="${escape(paper.presentationLogo)}" alt="" draggable="false"><img class="journal-logo" src="${escape(paper.logo)}" alt="" draggable="false">`
      : `<img src="${escape(paper.logo)}" alt="" draggable="false">${logoCaption ? `<span class="venue-caption${paper.backStatus && !paper.backCaption ? ' review-status' : ''}">${escape(logoCaption)}</span>` : ''}`;
  element.innerHTML = `<a class="card" href="${escape(paper.pdf)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(paper.title)}" aria-describedby="paper-info"><span class="card-inner" aria-hidden="true"><span class="face front"><img src="${escape(paper.image)}" alt="" draggable="false"><span class="card-name">${escape(paper.name)}</span><span class="card-venue${paper.backStatus ? ' under-review' : ''}">${escape(cardVenueLabel(paper))}</span></span><span class="face back${paper.presentationLogo ? ' dual-logo' : ''}${logoCaption ? ' captioned-logo' : ''}${paper.logoKey === 'chi2025' ? ' chi2025-logo' : ''}${paper.logoKey === 'chi2024' ? ' chi2024-logo' : ''}">${backLogos}</span></span></a>`;
  element.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') showInfo(element, paper); });
  element.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && active?.element === element) clearInfo(); });
  const link = element.querySelector('.card');
  link.addEventListener('focus', () => { if (link.matches(':focus-visible')) showInfo(element, paper); });
  link.addEventListener('blur', () => { if (active?.element === element) clearInfo(); });
  bindCardActivation(link, {
    id: paper.id,
    state: interactionState,
    flip: () => { if (active?.element === element) clearInfo(); else showInfo(element, paper); },
    open: () => window.open(paper.pdf, '_blank', 'noopener,noreferrer'),
  });
  return element;
}
function cardContainer(items) {
  const container = document.createElement('div');
  container.className = 'cards';
  items.forEach(paper => container.append(paperNodes.get(paper.id)));
  return container;
}
function updateControls() {
  axisPickers.forEach(({ axis, trigger, options, values }) => {
    trigger.textContent = values.find(([value]) => value === axes[axis])[1];
    options.forEach(option => {
      option.disabled = option.dataset.value === axes[axis === 'x' ? 'y' : 'x'];
      option.setAttribute('aria-selected', String(option.dataset.value === axes[axis]));
    });
  });
}
function readViewport() {
  return { width: document.documentElement.clientWidth, height: window.visualViewport?.height || innerHeight, scale: window.visualViewport?.scale || 1 };
}
function isPinchZoomed() { return Math.abs((window.visualViewport?.scale || 1) - 1) > .01; }
function viewportHeight() { return viewportState.height; }
function viewportWidth() { return viewportState.width; }
function setCategoryLabel(label, twoLines = false) {
  const text = label.dataset.fullLabel;
  label.innerHTML = escape(text).replace(' for Everyone', `${twoLines ? '\n' : ' '}<span class="label-suffix">for Everyone</span>`);
}
function fitCategoryTypography() {
  research.style.removeProperty('--fine-label-size');
  const labels = [...research.querySelectorAll('.coarse-label')];
  const axisFor = label => label.closest('.facet-row-label') ? 'y' : 'x';
  const measure = label => {
    const style = getComputedStyle(label);
    const range = document.createRange();
    range.selectNodeContents(label);
    return {
      available: label.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      width: range.getBoundingClientRect().width,
      size: parseFloat(style.fontSize),
    };
  };
  labels.forEach(label => {
    label.dataset.fullLabel ||= label.textContent;
    setCategoryLabel(label);
    label.classList.remove('two-lines');
    label.style.fontSize = '';
  });
  for (const axis of ['x', 'y']) {
    const group = labels.filter(label => axisFor(label) === axis);
    // Use the same deliberate break for both research areas on this axis.
    const twoLines = group.some(label => {
      const { available, width } = measure(label);
      return available > 0 && width > available;
    });
    if (twoLines) group.forEach(label => {
      setCategoryLabel(label, true);
      label.classList.add('two-lines');
    });
    const size = Math.min(...group.map(label => {
      const measured = measure(label);
      const fit = measured.available > 0 && measured.width > measured.available
        ? measured.size * measured.available / measured.width * .98 : measured.size;
      return Math.max(1, Math.floor(fit * 100) / 100);
    }));
    group.forEach(label => { label.style.fontSize = size + 'px'; });
  }
  const fine = research.querySelector('.fine-label');
  if (fine && labels.length) {
    const smallestCoarse = Math.min(...labels.map(label => parseFloat(getComputedStyle(label).fontSize)));
    const fineSize = Math.min(parseFloat(getComputedStyle(fine).fontSize), smallestCoarse * .8);
    research.style.setProperty('--fine-label-size', fineSize + 'px');
  }
}
function render(animate = false) {
  const previousPositions = animate ? cardMotion.capture(paperNodes.values()) : null;
  interactionState.lastTap = null;
  clearInfo();
  updateControls();
  grid = buildFacetGrid(papers, axes.x, axes.y);
  research.replaceChildren();
  research.removeAttribute('style');
  research.setAttribute('aria-label', `Papers grouped by ${DIMENSIONS[axes.x].label}${axes.y === 'none' ? '' : ' and ' + DIMENSIONS[axes.y].label}`);
  if (axes.y === 'none' && grid.columns.length === 2) {
    research.className = 'research single-axis';
    grid.columns.forEach((column, c) => {
      const section = document.createElement('section');
      section.className = 'facet-group';
      section.dataset.x = column.key;
      section.innerHTML = `<h2${axes.x === 'category' ? ' class="coarse-label"' : ''}>${escape(column.label)}</h2>`;
      section.append(cardContainer(grid.cells[0][c].papers));
      research.append(section);
    });
  } else {
    research.className = `research facet-matrix${axes.y === 'none' ? '' : ' with-y'}`;
    const headerRows = axes.x === 'categoryFine' ? 2 : 1;
    if (headerRows === 2) {
      grid.columns.forEach((column, c) => {
        if (c && column.parent === grid.columns[c - 1].parent) return;
        const span = grid.columns.filter(item => item.parent === column.parent).length;
        const label = document.createElement('h2');
        label.className = 'facet-parent-column-label coarse-label';
        label.textContent = column.parentLabel;
        label.style.gridColumn = `${c + 1} / span ${span}`;
        label.style.gridRow = 1;
        research.append(label);
      });
    }
    grid.columns.forEach((column, c) => {
      const label = document.createElement('h2');
      label.className = `facet-column-label${axes.x === 'categoryFine' ? ' fine-label' : axes.x === 'category' ? ' coarse-label' : ''}`;
      label.textContent = column.label;
      label.style.gridColumn = c + 1;
      label.style.gridRow = headerRows;
      research.append(label);
    });
    grid.cells.forEach((row, r) => {
      row.forEach((cell, c) => {
        const section = document.createElement('section');
        section.className = 'facet-cell';
        section.dataset.x = cell.x;
        section.dataset.y = cell.y;
        section.setAttribute('aria-label', [grid.columns[c].parentLabel, grid.columns[c].label, grid.rows[r].parentLabel, grid.rows[r].label].filter(Boolean).join(' · '));
        section.style.gridColumn = c + 1;
        section.style.gridRow = r + headerRows + 1;
        section.append(cardContainer(cell.papers));
        research.append(section);
      });
      if (axes.y !== 'none') {
        const label = document.createElement('div');
        label.className = `facet-row-label${axes.y === 'categoryFine' ? ' fine-label' : axes.y === 'category' ? ' coarse-label' : ''}`;
        const row = grid.rows[r];
        const parentStarts = row.parent && (r === 0 || row.parent !== grid.rows[r - 1].parent);
        label.innerHTML = `${parentStarts ? `<span class="facet-parent-row-label coarse-label">${escape(row.parentLabel)}</span>` : ''}<span>${escape(row.label)}</span>`;
        label.style.gridColumn = grid.columns.length + 1;
        label.style.gridRow = r + headerRows + 1;
        research.append(label);
      }
    });
  }
  layout(true);
  if (previousPositions) cardMotion.play(paperNodes.values(), previousPositions);
}
function layout(force = false) {
  if (!grid) return;
  viewportState = updateViewport(viewportState, readViewport());
  if (hasLayout && viewportState.zoomed && !viewportState.changed && !force) return;
  if (research.classList.contains('single-axis')) layoutPair();
  else layoutMatrix();
  fitCardLabels();
  // Details can expand below the gallery without shrinking cards under the pointer.
  main.style.minHeight = Math.max(viewportHeight(), usedPageHeight()) + 'px';
  hasLayout = true;
  if (!active) clearInfo();
}
function fitCardLabels() {
  research.querySelectorAll('.paper').forEach(paper => {
    const name = paper.querySelector('.card-name');
    const venue = paper.querySelector('.card-venue');
    paper.style.setProperty('--label-scale', 1);
    const available = paper.querySelector('.front').clientHeight - parseFloat(getComputedStyle(name).top) - parseFloat(getComputedStyle(venue).bottom) - 1;
    let scale = 1;
    for (let pass = 0; pass < 24 && name.offsetHeight + venue.offsetHeight > available; pass++) {
      scale *= .96;
      paper.style.setProperty('--label-scale', scale);
    }
  });
}
function idleInfoHeight() { return hint.getBoundingClientRect().height; }
function occupiedPageHeight(expandedDetails) {
  const style = getComputedStyle(main);
  const occupied = [...main.children].filter(element => element !== research).reduce((sum, element) => {
    const childStyle = getComputedStyle(element);
    const height = element === info && !expandedDetails ? idleInfoHeight() : element.getBoundingClientRect().height;
    return sum + height + parseFloat(childStyle.marginTop) + parseFloat(childStyle.marginBottom);
  }, 0);
  return parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + occupied;
}
function usedPageHeight() { return occupiedPageHeight(true) + research.getBoundingClientRect().height; }
// Reserve one hint line, rather than a tall empty detail panel, on initial load.
function boardHeightBudget() { return Math.max(1, viewportHeight() - occupiedPageHeight(false)); }
function layoutPair() {
  const areas = [...research.querySelectorAll('.facet-group')];
  const counts = areas.map(area => area.querySelectorAll('.paper').length);
  const cardGap = Math.max(8, Math.min(18, viewportWidth() * .011));
  const sectionGap = Math.max(20, Math.min(68, viewportWidth() * .044));
  research.style.setProperty('--section-gap', sectionGap + 'px');
  research.style.setProperty('--card-gap', cardGap + 'px');
  const minWidths = areas.map(area => {
    if (area.querySelector('h2').classList.contains('coarse-label')) return 0;
    const text = area.querySelector('h2').firstChild;
    return Math.ceil(Math.max(...[...text.textContent.matchAll(/\S+/g)].map(match => {
      const range = document.createRange();
      range.setStart(text, match.index);
      range.setEnd(text, match.index + match[0].length);
      return range.getBoundingClientRect().width;
    })));
  });
  areas.forEach((area, i) => area.style.setProperty('--area-width', ((research.clientWidth - sectionGap) * counts[i] / counts.reduce((a, b) => a + b, 0)) + 'px'));
  fitCategoryTypography();
  const measureHeaders = () => areas.map(area => { const heading = area.querySelector('h2'); return heading.getBoundingClientRect().height + parseFloat(getComputedStyle(heading).marginBottom); });
  let headers = measureHeaders();
  let best;
  for (let pass = 0; pass < 5; pass++) {
    best = fitCardGroups({ counts, width: research.clientWidth, height: boardHeightBudget(), headers, cardGap, sectionGap, portrait: false, minWidths });
    if (!best) return;
    areas.forEach((area, i) => area.style.setProperty('--area-width', (Math.max(minWidths[i], best.columns[i] * best.sizes[i] + (best.columns[i] - 1) * cardGap)) + 'px'));
    fitCategoryTypography();
    const measured = measureHeaders();
    if (measured.every((height, i) => height <= headers[i] + .5)) break;
    headers = headers.map((height, i) => Math.max(height, measured[i]));
  }
  if (!best) return;
  areas.forEach((area, i) => {
    const size = best.sizes[i];
    area.style.setProperty('--columns', best.columns[i]);
    area.style.setProperty('--rows', best.rows[i]);
    area.style.setProperty('--card-size', size + 'px');
    area.style.setProperty('--name-size', Math.max(8, Math.min(14, size * .078)) + 'px');
    area.style.setProperty('--area-width', (Math.max(minWidths[i], best.columns[i] * size + (best.columns[i] - 1) * cardGap)) + 'px');
  });
  const finalHeaders = measureHeaders();
  const heights = best.rows.map((rows, i) => finalHeaders[i] + rows * best.sizes[i] + (rows - 1) * cardGap);
  research.style.height = Math.max(...heights) + 'px';
}
function layoutMatrix(pass = 0) {
  const smallViewport = viewportWidth() <= 600 || viewportHeight() <= 520;
  const compact = smallViewport || grid.rows.length >= 5 || grid.columns.length >= 5;
  const width = research.clientWidth;
  const height = boardHeightBudget();
  const cardGap = compact ? 5 : 10;
  const cellGap = compact ? 6 : 18;
  const cellPadding = compact ? 3 : 7;
  const rowLabelWidth = axes.y === 'none' ? 0 : Math.min(smallViewport ? 90 : 154, width * .26);
  research.style.gap = `0 ${cellGap}px`;
  if (!pass) research.style.gridTemplateColumns = `repeat(${grid.columns.length}, minmax(0, 1fr))${rowLabelWidth ? ' ' + rowLabelWidth + 'px' : ''}`;
  fitCategoryTypography();
  const labels = [...research.querySelectorAll('.facet-column-label')];
  const headerHeight = Math.max(compact ? 36 : 42, ...labels.map(label => label.scrollHeight + 10));
  const parentLabels = [...research.querySelectorAll('.facet-parent-column-label')];
  const parentHeight = parentLabels.length ? Math.max(...parentLabels.map(label => label.scrollHeight)) + cellGap : 0;
  const availableWidth = width - (rowLabelWidth ? rowLabelWidth + cellGap : 0);
  const availableHeight = height - parentHeight - headerHeight - cellGap;
  const fitPadding = cellPadding + (axes.y === 'none' ? 0 : .5);
  const counts = grid.cells.map(row => row.map(cell => cell.papers.length));
  const minHeights = [...research.querySelectorAll('.facet-row-label')].map(label => label.scrollHeight + 8);
  const fitInput = { counts, width: availableWidth, height: availableHeight, cardGap, cellGap, cellPadding: fitPadding, minHeights };
  let best = fitFacetGrid(fitInput);
  if (!best) {
    // Dense axes in a very short window scroll vertically rather than hiding cards.
    const minSize = Math.max(1, Math.min(24, Math.floor((availableWidth - (grid.columns.length - 1) * cellGap - grid.columns.length * fitPadding * 2) / grid.columns.length)));
    const maximumHeight = counts.reduce((sum, row, r) => {
      const rows = Math.max(1, ...row);
      return sum + Math.max(rows * minSize + (rows - 1) * cardGap + 2 * fitPadding, minHeights[r] || 0);
    }, 0) + (grid.rows.length - 1) * cellGap;
    let low = Math.max(1, Math.floor(availableHeight)), high = Math.ceil(maximumHeight);
    while (low <= high) {
      const candidateHeight = Math.floor((low + high) / 2);
      const candidate = fitFacetGrid({ ...fitInput, height: candidateHeight, minSize });
      if (candidate) { best = candidate; high = candidateHeight - 1; }
      else low = candidateHeight + 1;
    }
  }
  if (!best) return;
  const unusedWidth = Math.max(0, availableWidth - best.widths.reduce((a, b) => a + b, 0) - (grid.columns.length - 1) * cellGap);
  const totalWidth = best.widths.reduce((a, b) => a + b, 0);
  const widths = best.widths.map(w => w + unusedWidth * w / totalWidth);
  research.style.gridTemplateColumns = widths.map(w => w + 'px').join(' ') + (rowLabelWidth ? ' ' + rowLabelWidth + 'px' : '');
  fitCategoryTypography();
  if (pass < 3 && (
    Math.max(compact ? 36 : 42, ...labels.map(label => label.scrollHeight + 10)) > headerHeight + .5 ||
    (parentLabels.length && Math.max(...parentLabels.map(label => label.scrollHeight)) + cellGap > parentHeight + .5) ||
    [...research.querySelectorAll('.facet-row-label')].some((label, r) => label.scrollHeight + 8 > minHeights[r] + .5)
  )) { layoutMatrix(pass + 1); return; }
  research.style.gridTemplateRows = [...(parentHeight ? [parentHeight - cellGap] : []), headerHeight, ...best.heights].map(h => h + 'px').join(' ');
  research.style.height = (parentHeight + headerHeight + best.heights.reduce((a, b) => a + b, 0) + grid.rows.length * cellGap) + 'px';
  research.style.rowGap = cellGap + 'px';
  research.style.setProperty('--card-gap', cardGap + 'px');
  research.style.setProperty('--cell-padding', cellPadding + 'px');
  research.style.setProperty('--card-size', best.size + 'px');
  research.style.setProperty('--name-size', Math.max(6, Math.min(14, best.size * .078)) + 'px');
  research.querySelectorAll('.facet-cell').forEach((cell, index) => {
    cell.style.setProperty('--columns', best.columns[index % grid.columns.length]);
    cell.style.setProperty('--rows', best.rows[Math.floor(index / grid.columns.length)]);
  });
}
venueToggle.addEventListener('click', () => {
  clearInfo();
  const showingVenues = main.classList.toggle('show-venues');
  venueToggle.textContent = showingVenues ? 'Show thumbnails' : 'Show venue';
  venueToggle.setAttribute('aria-pressed', String(showingVenues));
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.paper')) { interactionState.lastTap = null; clearInfo(); }
  if (!event.isPrimary) interactionState.lastTap = null;
  if (!event.target.closest('.axis-picker')) closeAxisMenus();
});
document.addEventListener('focusin', event => { if (!event.target.closest('.axis-picker')) closeAxisMenus(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { interactionState.lastTap = null; clearInfo(); document.activeElement?.blur(); } });
let layoutFrame = 0;
function scheduleLayout() {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; layout(); });
}
function resizeLayout() {
  if (!isPinchZoomed() || document.documentElement.clientWidth !== viewportState.width) closeAxisMenus();
  scheduleLayout();
}
window.addEventListener('resize', resizeLayout);
window.visualViewport?.addEventListener('resize', resizeLayout);
window.addEventListener('pageshow', scheduleLayout);
document.fonts.ready.then(scheduleLayout);
const layoutObserver = new ResizeObserver(scheduleLayout);
[main, document.querySelector('.page-header'), document.querySelector('.axis-controls'), info].forEach(element => layoutObserver.observe(element));
window.addEventListener('scroll', () => { if (!isPinchZoomed()) { interactionState.lastTap = null; clearInfo(); } }, { passive: true });
const response = await fetch('papers.json');
if (!response.ok) throw new Error('Publication data could not be loaded');
papers = await response.json();
papers.forEach(paper => paperNodes.set(paper.id, createPaper(paper)));
render();
requestAnimationFrame(() => requestAnimationFrame(scheduleLayout));
