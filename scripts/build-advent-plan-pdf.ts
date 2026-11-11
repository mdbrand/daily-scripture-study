// Builds public/downloads/morning-lamp-advent-reading-plan-2026.pdf from the table in the Advent article,
// so the PDF and the web page can never disagree. Run: npx tsx scripts/build-advent-plan-pdf.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import plan from '../lib/articles/content/advent-reading-plan';

const root = path.resolve(__dirname, '..');
const table = plan.sections?.find((s) => s.table)?.table;
if (!table || table.rows.length !== 27) throw new Error('Advent table not found or not 27 days');

const font = (f: string) => `url("file://${path.join(root, 'app/fonts', f)}")`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Each row's theme reads "Hope: Comfort for a waiting people". A new week starts every Sunday.
let week = 0;
const body = table.rows
  .map(([date, day, reading, theme]) => {
    const [label, ...rest] = theme.split(': ');
    const about = rest.join(': ');
    const head =
      day === 'Sunday'
        ? `<tr class="week"><td colspan="5">Week ${++week} · ${esc(label)}<span>Light candle ${week}</span></td></tr>`
        : '';
    const special = label.startsWith('Christmas') ? ` <b>${esc(label)}.</b>` : '';
    return `${head}<tr><td class="box"><span></span></td><td class="dt">${esc(date)}</td><td class="dy">${esc(day)}</td><td class="rd">${esc(reading)}</td><td>${special} ${esc(about)}</td></tr>`;
  })
  .join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Garamond; src: ${font('eb-garamond-latin.woff2')}; font-weight: 400 800; }
@font-face { font-family: Garamond; font-style: italic; src: ${font('eb-garamond-italic-latin.woff2')}; }
@font-face { font-family: Inter; src: ${font('inter-latin.woff2')}; font-weight: 100 900; }
@page { size: Letter; margin: 0.45in 0.55in 0.45in; }
* { box-sizing: border-box; }
body { margin: 0; color: #24323b; font-family: Inter, sans-serif; font-size: 9pt; }
.page { position: relative; height: 10.05in; }
header { display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 1.5px solid #a8834a; padding-bottom: 6px; margin-bottom: 8px; }
.brand { font-family: Garamond, serif; font-size: 11pt; letter-spacing: .14em; text-transform: uppercase; color: #a8834a; }
h1 { font-family: Garamond, serif; font-weight: 500; font-size: 27pt; margin: 2px 0 0; line-height: 1.05; color: #1d2b33; }
.sub { font-family: Garamond, serif; font-style: italic; font-size: 12.5pt; color: #5b676d; margin: 3px 0 0; }
.facts { text-align: right; font-size: 8pt; color: #5b676d; line-height: 1.5; }
.how { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 7px; }
.how div { background: #efe6d6; border-radius: 5px; padding: 5px 9px; font-size: 7.9pt; line-height: 1.4; }
.how b { display: block; font-family: Garamond, serif; font-size: 10.5pt; font-weight: 600; margin-bottom: 1px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
td { padding: 3.1px 5px; border-bottom: 0.6px solid #e6dccb; vertical-align: middle; line-height: 1.25; }
.box { width: 22px; padding-left: 2px; }
.box span { display: inline-block; width: 10px; height: 10px; border: 1px solid #a8834a; border-radius: 2px; }
.dt { width: 52px; font-weight: 600; white-space: nowrap; }
.dy { width: 78px; color: #5b676d; }
.rd { width: 128px; font-weight: 600; color: #1d2b33; }
tr.week td { background: #24323b; color: #fffdf8; font-family: Garamond, serif; font-size: 10.5pt; font-weight: 500; letter-spacing: .02em; padding: 2.6px 9px; border-bottom: 0; }
tr.week span { float: right; font-family: Inter, sans-serif; font-size: 7.4pt; letter-spacing: .06em; text-transform: uppercase; color: #d9c08f; padding-top: 2px; }
.ad { margin-top: 7px; background: #efe6d6; border-radius: 6px; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center; }
.ad b { font-family: Garamond, serif; font-weight: 600; font-size: 12.5pt; display: block; }
.ad span { font-size: 8pt; color: #5b676d; }
.ad .url { font-size: 10pt; font-weight: 600; color: #1d2b33; }
footer { position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid #d9c08f; padding-top: 6px; font-size: 7.2pt; color: #5b676d; line-height: 1.45; }
footer .verse { font-family: Garamond, serif; font-style: italic; font-size: 10pt; color: #24323b; display: block; margin-bottom: 2px; }
</style></head><body>
<section class="page">
  <header>
    <div><div class="brand">Morning Lamp</div><h1>Advent Bible Reading Plan 2026</h1><p class="sub">One short reading a day, from the first promise to the manger.</p></div>
    <div class="facts">Starts Sunday, November 29, 2026<br>Ends Christmas Day, December 25<br>About 5 minutes a day</div>
  </header>
  <div class="how">
    <div><b>Read it slowly</b>Each reading is 5 to 14 verses. Read it once, then again. Aloud is even better.</div>
    <div><b>Ask one question</b>What is God promising here, or how is he keeping a promise?</div>
    <div><b>Started late? Start today</b>Begin with today’s date. Luke 1 and 2, the heart of the story, come last.</div>
  </div>
  <table><colgroup><col style="width:22px"><col style="width:54px"><col style="width:80px"><col style="width:132px"><col></colgroup><tbody>${body}</tbody></table>
  <div class="ad"><div><b>Want one passage explained each morning?</b><span>Morning Lamp is a free daily Bible study email: the story behind one passage, in under three minutes.</span></div><div class="url">morninglamp.study</div></div>
  <footer><span class="verse">“The people walking in darkness have seen a great light; on those living in the land of deep darkness a light has dawned.” Isaiah 9:2 (NIV)</span>Free to print and share. © 2026 Morning Lamp. Scripture quotation from the NIV®, © Biblica, Inc.™ Used by permission.</footer>
</section>
</body></html>`;

const work = path.join(tmpdir(), 'ml-advent-pdf');
mkdirSync(work, { recursive: true });
const htmlPath = path.join(work, 'plan.html');
writeFileSync(htmlPath, html);
const outDir = path.join(root, 'public/downloads');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'morning-lamp-advent-reading-plan-2026.pdf');
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--user-data-dir=${path.join(work, 'profile')}`,
  `--print-to-pdf=${out}`,
  `file://${htmlPath}`,
]);
console.log('wrote', out);
