export const DIMENSIONS = {
  category: { label: 'Category (coarse)', values: [['analysis', 'Data Analysis for Everyone'], ['communication', 'Data Communication for Everyone']] },
  categoryFine: { label: 'Category (fine)', values: [
    ['understanding', 'Understanding Problem', 'analysis'],
    ['evaluation', 'Evaluation', 'analysis'],
    ['optimization', 'Optimization', 'analysis'],
    ['interaction', 'Interaction', 'analysis'],
    ['authoring', 'Chart Authoring', 'communication'],
    ['perception', 'Perception & Cognition', 'communication'],
  ] },
  year: { label: 'Year' },
  venue: { label: 'Venue', values: [['sigchi', 'ACM CHI'], ['vis', 'IEEE VIS'], ['others', 'Others']] },
  authorship: { label: 'Authorship', values: [['first', 'Leading author'], ['coauthor', 'Co-author']] },
};

export function venueGroupFor(paper) {
  const venue = `${paper.venue} ${paper.venueFull}`;
  if (paper.id === 'drbias') return 'others';
  if (/\bCHI\s*2027\b/i.test(venue) && /under review/i.test(`${paper.backStatus || ''} ${venue}`)) return 'others';
  if (/EuroVis|Information Visualization|PacificVis|Pacific Visualization/i.test(venue)) return 'others';
  if (/\bCHI\b|SIGCHI|UIST|\bIUI\b|\bCSCW\b|\bDIS\b/i.test(venue)) return 'sigchi';
  if (/\bVIS\b|\bVAST\b|\bTVCG\b|Transactions on Visualization and Computer Graphics/i.test(venue)) return 'vis';
  return 'others';
}

export function cardVenueLabel(paper) {
  const isTvcg = /\bTVCG\b|Transactions on Visualization and Computer Graphics/i.test(`${paper.venue} ${paper.venueFull}`);
  let label = paper.venue.replace(/^IEEE\s+/i, '');
  if (isTvcg && paper.presentationConference) {
    label = `${paper.presentationConference.replace(/^IEEE\s+/i, '')} / TVCG`;
  } else if (!/\b\d{4}\b/.test(label)) {
    label += ` ${paper.year}`;
  }
  if (paper.backStatus) label += ` · ${paper.backStatus}`;
  return label;
}

export function facetValue(paper, dimension) {
  if (dimension === 'category') return paper.category;
  if (dimension === 'categoryFine') return paper.fineCategory;
  if (dimension === 'year') return String(paper.year);
  if (dimension === 'venue') return venueGroupFor(paper);
  if (dimension === 'authorship') return paper.firstAuthor ? 'first' : 'coauthor';
  if (dimension === 'none') return 'all';
  throw new Error(`Unknown facet: ${dimension}`);
}

export function facetValues(papers, dimension) {
  if (dimension === 'none') return [{ key: 'all', label: '' }];
  if (dimension === 'year') return [...new Set(papers.map(paper => paper.year))].sort((a, b) => a - b).map(year => ({ key: String(year), label: String(year) }));
  return DIMENSIONS[dimension].values.map(([key, label, parent]) => ({ key, label, ...(parent ? { parent, parentLabel: DIMENSIONS.category.values.find(([key]) => key === parent)[1] } : {}) }));
}

export function buildFacetGrid(papers, x, y = 'none') {
  if (!DIMENSIONS[x] || (y !== 'none' && (!DIMENSIONS[y] || x === y))) throw new Error('Choose distinct X and Y dimensions');
  const columns = facetValues(papers, x);
  const rows = facetValues(papers, y);
  const cells = rows.map(row => columns.map(column => ({
    x: column.key,
    y: row.key,
    papers: papers.filter(paper => facetValue(paper, x) === column.key && facetValue(paper, y) === row.key),
  })));
  return { x, y, columns, rows, cells };
}
