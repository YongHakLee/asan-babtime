// 사용: node verify.mjs [--fixture] [--input md] [--pdf pdf]
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const fixture = flag('--fixture');
const mdPath = opt('--input', 'proposal/상세제안서.md');
const pdfPath = opt('--pdf', 'proposal/상세제안서.pdf');
const HEADER = '밥타임 상세 제안서';
const FORBIDDEN = ['웹앱', '구현 프로그램', '프로토타입', '시연', '데모', 'Vercel', 'shadcn', 'React', '모의 데이터'];

const fails = [];
let hasAppendix = false; // md에 "## 부록" 제목이 있는지
const fail = (m) => fails.push(m);

// ---- md ----
if (!fs.existsSync(mdPath)) fail(`md 파일 없음: ${mdPath}`);
else {
  const src = fs.readFileSync(mdPath, 'utf8');
  const body = src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const refs = new Set([...body.matchAll(/\[\^([^\]\s]+)\](?!:)/g)].map((m) => m[1]));
  const defs = new Set([...body.matchAll(/^\[\^([^\]\s]+)\]:/gm)].map((m) => m[1]));
  for (const r of refs) if (!defs.has(r)) fail(`각주 참조만 있고 정의 없음: [^${r}]`);
  for (const d of defs) if (!refs.has(d)) fail(`각주 정의만 있고 참조 없음: [^${d}]`);
  for (const w of FORBIDDEN) if (body.includes(w)) fail(`금지어 "${w}" 포함`);
  if (!fixture) {
    for (let n = 1; n <= 9; n++) if (!new RegExp(`^## ${n}\\.`, 'm').test(body)) fail(`장 제목 "## ${n}." 없음`);
  }
  if (!/^## 참고문헌\s*$/m.test(body)) fail('"## 참고문헌" 제목 없음');
  hasAppendix = /^## 부록/m.test(body);
}

// ---- pdf ----
if (!fs.existsSync(pdfPath)) fail(`pdf 파일 없음: ${pdfPath}`);
else {
  const pdfjs = await import(pathToFileURL(path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const n = doc.numPages;
  if (fixture) { if (n < 2) fail(`쪽수 ${n} (fixture는 2쪽 이상)`); }
  else if (n < 12 || n > 16) fail(`쪽수 ${n} (12~16 필요)`);

  let refPos = null; // 참고문헌 제목 위치
  let refPage = null; // 참고문헌 시작 쪽
  let appxPage = null; // 부록 시작 쪽
  let fnPos = null;  // 첫 각주 출처 줄 위치(「접근일」 포함 줄)
  for (let p = 1; p <= n; p++) {
    const page = await doc.getPage(p);
    const H = page.view[3];
    const tc = await page.getTextContent();
    // 글자 단위로 쪼개진 항목을 같은 y끼리 이어 줄로 만든다.
    const rows = new Map();
    for (const i of tc.items) {
      if (!i.str) continue;
      const y = Math.round(i.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(i);
    }
    const lines = [...rows].map(([y, its]) => {
      its.sort((a, b) => a.transform[4] - b.transform[4]);
      return { y, text: its.map((i) => i.str).join('').replace(/\s+/g, '') };
    });
    for (const l of [...lines].sort((a, b) => b.y - a.y)) {
      const pos = p * 10000 - l.y;
      if (l.text === '참고문헌' && refPos === null) { refPos = pos; refPage = p; }
      if (hasAppendix && refPos !== null && appxPage === null && l.text.startsWith('부록') && l.text.length <= 40) appxPage = p;
      if (l.text.includes('접근일') && fnPos === null) fnPos = pos;
    }
    if (p === 1) {
      if (lines.some((l) => /^\d{1,3}$/.test(l.text))) fail('1쪽에 쪽 번호가 있음');
      if (lines.some((l) => l.text.includes(HEADER.replace(/\s+/g, '')))) fail('1쪽에 머리글이 있음');
      continue;
    }
    if (!lines.some((l) => l.y < 70 && l.text === String(p))) fail(`${p}쪽 하단 쪽 번호 없음`);
    if (!lines.some((l) => l.y > H - 70 && l.text.includes(HEADER.replace(/\s+/g, '')))) fail(`${p}쪽 상단 머리글 없음`);
  }
  if (refPos === null) fail('PDF에 "참고문헌" 제목 줄 없음');
  else if (fnPos === null) fail('PDF에 각주 출처 줄(접근일) 없음');
  else if (fnPos < refPos) fail('각주 영역이 "참고문헌" 제목보다 앞에 있음 (P-R1)');
  if (!fixture && refPage !== null && refPage > 15) fail(`"참고문헌" 시작 쪽 ${refPage} (본문은 15쪽 이내)`);
  if (hasAppendix) {
    if (appxPage === null) fail('md에 "## 부록"이 있으나 PDF에서 부록 제목 줄을 찾지 못함');
    else if (!fixture && appxPage > 16) fail(`"부록" 시작 쪽 ${appxPage} (16쪽 이내 필요)`);
  }
  if (n >= 2) {
    const page = await doc.getPage(2);
    await page.getOperatorList();
    const tc = await page.getTextContent();
    const ids = [...new Set(tc.items.map((i) => i.fontName))];
    const real = [];
    for (const id of ids) {
      const f = await new Promise((res) => {
        const t = setTimeout(() => res(null), 3000);
        const store = id.startsWith('g_') ? page.commonObjs : page.objs;
        try { store.get(id, (o) => { clearTimeout(t); res(o); }); } catch { clearTimeout(t); res(null); }
      });
      if (f?.name) real.push(f.name);
    }
    if (!real.some((r) => r.includes('WantedSans'))) fail(`2쪽 글꼴에 WantedSans 없음 (확인된 글꼴: ${real.join(', ') || '없음'})`);
    else console.log(`2쪽 글꼴: ${[...new Set(real.map((r) => r.replace(/^[A-Z]+\+/, '')))].join(', ')}`);
  }
  console.log(`쪽수: ${n}${refPage ? `, 참고문헌 시작 ${refPage}쪽` : ''}${appxPage ? `, 부록 시작 ${appxPage}쪽` : ''}`);
}

if (fails.length) {
  console.error('FAIL');
  for (const f of fails) console.error(' - ' + f);
  process.exit(1);
}
console.log('PASS');
