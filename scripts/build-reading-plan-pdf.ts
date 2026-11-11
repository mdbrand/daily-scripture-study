// Builds public/downloads/morning-lamp-2027-bible-reading-plan.pdf from the plan table in the article,
// so the PDF and the web page can never disagree. Run: npx tsx scripts/build-reading-plan-pdf.ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import plan from '../lib/articles/content/2027-bible-reading-plan';

const root = path.resolve(__dirname, '..');
const table = plan.sections?.find((s) => s.table)?.table;
if (!table || table.rows.length !== 52) throw new Error('plan table not found or not 52 weeks');

const font = (f: string) => `url("file://${path.join(root, 'app/fonts', f)}")`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rows = (from: number, to: number) =>
  table.rows
    .slice(from, to)
    .map(
      ([w, d, ot, nt, ps]) =>
        `<tr><td class="box"><span></span></td><td class="wk">${w}</td><td class="dt">${esc(d)}</td><td>${esc(ot)}</td><td>${esc(nt)}</td><td>${esc(ps)}</td></tr>`,
    )
    .join('');
const head = `<thead><tr><th class="box"></th><th class="wk">Week</th><th class="dt">Dates</th><th class="ot">Old Testament</th><th class="nt">New Testament</th><th class="ps">Psalms or Proverbs</th></tr></thead>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Garamond; src: ${font('eb-garamond-latin.woff2')}; font-weight: 400 800; }
@font-face { font-family: Garamond; font-style: italic; src: ${font('eb-garamond-italic-latin.woff2')}; }
@font-face { font-family: Inter; src: ${font('inter-latin.woff2')}; font-weight: 100 900; }
@page { size: Letter; margin: 0.45in 0.5in 0.5in; }
* { box-sizing: border-box; }
body { margin: 0; color: #24323b; font-family: Inter, sans-serif; font-size: 8.6pt; }
.page { page-break-after: always; position: relative; height: 10.05in; }
.page:last-child { page-break-after: auto; }
header { display: flex; align-items: flex-end; justify-content: space-between; border-bottom: 1.5px solid #a8834a; padding-bottom: 8px; margin-bottom: 10px; }
.brand { font-family: Garamond, serif; font-size: 11pt; letter-spacing: .14em; text-transform: uppercase; color: #a8834a; }
h1 { font-family: Garamond, serif; font-weight: 500; font-size: 27pt; margin: 2px 0 0; line-height: 1.05; color: #1d2b33; }
.sub { font-family: Garamond, serif; font-style: italic; font-size: 12.5pt; color: #5b676d; margin: 3px 0 0; }
.facts { text-align: right; font-size: 8pt; color: #5b676d; line-height: 1.5; }
.how { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 10px; }
.how div { background: #efe6d6; border-radius: 5px; padding: 7px 9px; font-size: 7.9pt; line-height: 1.4; }
.how b { display: block; font-family: Garamond, serif; font-size: 10.5pt; font-weight: 600; margin-bottom: 1px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ot { width: 37%; } .nt { width: 30%; } .ps { width: 17%; }
th { text-align: left; font-size: 7.4pt; text-transform: uppercase; letter-spacing: .06em; color: #8a6a37; font-weight: 600; padding: 0 5px 4px; border-bottom: 1px solid #d9c08f; }
td { padding: 4.6px 5px; border-bottom: 0.6px solid #e6dccb; vertical-align: middle; line-height: 1.25; }
tr:nth-child(even) td { background: #fbf7ef; }
.box { width: 20px; padding-left: 2px; }
.box span { display: inline-block; width: 10px; height: 10px; border: 1px solid #a8834a; border-radius: 2px; }
.wk { width: 38px; font-weight: 600; text-align: center; }
.dt { width: 84px; color: #5b676d; white-space: nowrap; }
.cont { font-family: Garamond, serif; font-size: 15pt; margin: 0 0 8px; }
footer { position: absolute; bottom: 0; left: 0; right: 0; border-top: 1px solid #d9c08f; padding-top: 7px; display: flex; justify-content: space-between; align-items: center; font-size: 7.6pt; color: #5b676d; }
footer > span:first-child { flex: 1; padding-right: 16px; } footer > span:last-child { white-space: nowrap; }
footer .verse { font-family: Garamond, serif; font-style: italic; font-size: 10pt; color: #24323b; }
.ad { margin-top: 10px; background: #24323b; color: #fffdf8; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
.ad b { font-family: Garamond, serif; font-weight: 500; font-size: 13pt; display: block; }
.ad span { font-size: 8pt; color: #d9c08f; }
.ad .url { font-size: 10pt; font-weight: 600; color: #fffdf8; }
</style></head><body>
<section class="page">
  <header>
    <div><div class="brand">Morning Lamp</div><h1>2027 Bible Reading Plan</h1><p class="sub">Read the whole Bible in one year: all 1,189 chapters in 52 weeks.</p></div>
    <div class="facts">Starts Monday, January 4, 2027<br>Ends Sunday, January 2, 2028<br>About 3 chapters a day</div>
  </header>
  <div class="how">
    <div><b>Three streams a week</b>Old Testament in order, 5 New Testament chapters, and a few psalms or proverbs. You are never stuck in one hard book for long.</div>
    <div><b>Set by the week</b>Split each row into about three chapters a day. Missed a day? Make it up before Monday.</div>
    <div><b>Fall behind? Keep going</b>Skip to the current week and save the missed ones for a slower stretch. Fourteen months is still the whole Bible.</div>
  </div>
  <table>${head}<tbody>${rows(0, 26)}</tbody></table>
  <footer><span class="verse">“Your word is a lamp for my feet, a light on my path.” Psalm 119:105 (NIV)</span><span>Page 1 of 2</span></footer>
</section>
<section class="page">
  <p class="cont">Weeks 27–52</p>
  <table>${head}<tbody>${rows(26, 52)}</tbody></table>
  <div class="ad"><div><b>Want one passage explained each morning?</b><span>Morning Lamp is a free daily Bible study email: the story behind one passage, in under three minutes.</span></div><div class="url">morninglamp.study</div></div>
  <footer><span>Free to print and share with your church or small group. © 2026 Morning Lamp. Scripture quotation from the NIV®, © Biblica, Inc.™ Used by permission.</span><span>Page 2 of 2</span></footer>
</section>
</body></html>`;

const work = path.join(tmpdir(), 'ml-plan-pdf');
mkdirSync(work, { recursive: true });
const htmlPath = path.join(work, 'plan.html');
writeFileSync(htmlPath, html);
const outDir = path.join(root, 'public/downloads');
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'morning-lamp-2027-bible-reading-plan.pdf');
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--user-data-dir=${path.join(work, 'profile')}`,
  `--print-to-pdf=${out}`,
  `file://${htmlPath}`,
]);
console.log('wrote', out);
