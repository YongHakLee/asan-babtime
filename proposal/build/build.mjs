// 사용: node build.mjs --input <md> --out <html> [--pdf <pdf>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const input = opt('--input');
const out = opt('--out');
const pdf = opt('--pdf');
if (!input || !out) { console.error('사용: build.mjs --input <md> --out <html> [--pdf <pdf>]'); process.exit(2); }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (!m) return { meta, body: src };
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (k) meta[k[1]] = k[2].trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

// ruling P-R1: 각주 영역을 "참고문헌" h2 바로 뒤로 옮긴다. 없으면 문서 끝에 둔다.
function placeFootnotes(html) {
  const m = html.match(/(?:<hr class="footnotes-sep">\s*)?<section class="footnotes[^"]*"[^>]*>[\s\S]*?<\/section>\s*$/);
  if (!m) return html;
  const block = m[0].replace(/^<hr class="footnotes-sep">\s*/, '');
  const rest = html.slice(0, m.index);
  const h = rest.match(/<h2[^>]*>\s*참고문헌\s*<\/h2>/);
  if (!h) return html;
  const at = h.index + h[0].length;
  return rest.slice(0, at) + '\n' + block + '\n' + rest.slice(at);
}

const src = fs.readFileSync(input, 'utf8');
const { meta, body } = parseFrontMatter(src);
const md = new MarkdownIt({ html: true, linkify: true, typographer: false }).use(footnote);
let html = placeFootnotes(md.render(body));

const tokensAll = fs.readFileSync(path.join(root, 'design/tokens.css'), 'utf8');
const tokens = tokensAll.match(/:root\s*\{[^}]*\}/)[0]; // .dark 제외
const fontFile = path.join(root, 'node_modules/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2');
const printCss = fs.readFileSync(path.join(here, 'print.css'), 'utf8');

const vars = {
  title: esc(meta.title ?? ''),
  subtitle: esc(meta.subtitle ?? ''),
  contest: esc(meta.contest ?? ''),
  date: esc(meta.date ?? ''),
  authorLine: meta.author ? `<p class="cover-author">${esc(meta.author)}</p>\n    ` : '',
  tokens,
  fontUrl: pathToFileURL(fontFile).href,
  printCss,
  body: html,
};
let page = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
page = page.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');

const outPath = path.resolve(out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, page);
console.log(`html: ${outPath}`);

if (pdf) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage();
    await p.goto(pathToFileURL(outPath).href, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const pdfPath = path.resolve(pdf);
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    await p.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log(`pdf: ${pdfPath}`);
  } finally {
    await browser.close();
  }
}
