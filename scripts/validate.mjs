import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const papers=JSON.parse(await fs.readFile('dist/papers.json','utf8'));
assert.equal(new Set(papers.map(p=>p.id)).size,papers.length,'Duplicate publications');
assert(papers.length>0);
for(const p of papers){for(const key of ['id','name','title','summary','category','venue','type','year'])assert(p[key],`${p.id}: missing ${key}`);assert(['analysis','communication'].includes(p.category));await fs.access('dist/'+p.image);if(p.logo)await fs.access('dist/'+p.logo);for(const key of ['pdf','arxiv','github','demo'])if(p[key])assert.equal(new URL(p[key]).protocol,'https:');}
for(const name of ['index.html','style.css','app.js','layout.js','facets.js','viewport.js','interaction.js','motion.js'])await fs.access('dist/'+name);
for(const id of ['vl2nl','tailvis','ggaction','visauto','fourdomains','misannot'])assert.equal(papers.find(p=>p.id===id)?.category,'communication',`${id} must be communication`);
for(const id of ['snc','clm','drbias'])assert.equal(papers.find(p=>p.id===id)?.category,'analysis',`${id} must be analysis`);
for(const id of ['clochat','clever','extensive','issue_propagation','iolens','vant','hooklens','monetexplorer','githru','phenoflow','directvis','graphsim'])assert(!papers.some(p=>p.id===id),`${id} should be excluded`);
assert(papers.every(p=>typeof p.firstAuthor==='boolean'),'Every paper needs its authorship classification');
assert(papers.every(p=>p.logo),'Every paper needs a venue logo');
assert(papers.every(p=>p.pdf && new URL(p.pdf).origin === 'https://www.hyeonjeon.com'),'Every card must link to the paper on the author website');
console.log(`Static site ready: ${papers.length} papers; all local assets and publication links validated.`);
