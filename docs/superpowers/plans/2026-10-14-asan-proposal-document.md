# 상세 제안서 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직원식당 통합 안내 서비스 「아산 밥때」의 상세 제안서를 Markdown 원본과 A4 PDF로 만든다.

**Architecture:** `proposal/상세제안서.md`(YAML 앞머리 + 본문 + 각주)가 유일한 원본이다. Node 스크립트가 markdown-it으로 HTML을 만들고 공통 토큰(`design/tokens.css`)을 쓰는 인쇄 CSS를 입혀 Playwright Chromium으로 PDF를 출력하며, 검증 스크립트가 쪽수·각주·금지어를 확인한다.

**Tech Stack:** Node 24, markdown-it 15.0.2, markdown-it-footnote 4.0.0, playwright 1.64.0, pdfjs-dist 4.10.38(검증용), wanted-sans 1.0.3.

**Spec:** `docs/superpowers/specs/2026-10-14-asan-cafeteria-design.md` (2장), 근거: `docs/research/2026-10-14-research-notes.md`

## Global Constraints

- **구현 프로그램을 언급하지 않는다.** 금지어: `웹앱`, `구현 프로그램`, `프로토타입`, `시연`, `데모`, `Vercel`, `shadcn`, `React`, `모의 데이터`. 화면이 필요한 곳은 서비스 개념도(인라인 SVG)로 대신한다.
- 분량 PDF 12~15쪽(표지 포함). 각 장(1~9)에 표 또는 도식 하나 이상.
- 각주는 `[^n]` 문법. 각 출처는 "발행처, 「제목」, 연도, URL (접근일 2026-10-14)" 형식. 조사 노트의 `[미확인]` 수치는 쓰지 않는다. 재인용 수치(예: 보건의료노조 2026 결식률 65.5%)는 본문 또는 각주에 "재인용" 명시. "국내 최초", "36% 과대평가" 표현 금지.
- 색: `design/tokens.css`의 토큰만(`--deep`, `--primary`, `--accent`, `--border`, `--foreground`, `--muted-foreground`, `--brand-orange`). 오렌지는 표지의 짧은 선 한 곳만. 서체 Wanted Sans Variable 하나, `word-break: keep-all`.
- 금지 장식: 이모지, ✨, 그라디언트, 모든 제목 위 영문 대문자 라벨.
- 문체: 평서문(~다)과 개조식 혼용, 과장 없이, 수치는 출처 또는 "가정" 표기.
- 서비스 이름 "아산 밥때", 부제 "직원식당 통합 안내 서비스". 병원 로고 사용 금지.
- 이 계획은 웹앱 계획 Task 1이 만든 `design/tokens.css`를 사용한다. 없으면 웹앱 계획 Task 1의 Step 4만 먼저 수행한다.

## Review Focus

1. 각주 번호가 본문에서 쓰였지만 정의가 없거나, 정의만 있고 쓰이지 않음 → Task 1 `verify.mjs` 검사.
2. 표가 쪽 경계에서 잘려 머리행 없이 넘어감 → Task 1 print.css `thead { display: table-header-group }`, `tr { break-inside: avoid }` + Task 5 육안 점검.
3. 한글 서체 미임베드로 PDF에서 글자가 대체 서체로 보임 → Task 1 검증(서체 이름 확인).
4. 표지에 쪽 번호가 찍힘 → Task 1 `@page :first` 규칙 + 검증.
5. 다크 모드 토큰(.dark)이 인쇄에 섞임 → print.css는 `:root` 값만 사용, 검증에서 배경색 확인은 Task 5 육안 점검.

---

### Task 1: 변환·검증 파이프라인

**Files:**
- Create: `package.json`(루트), `proposal/build/build.mjs`, `proposal/build/verify.mjs`, `proposal/build/print.css`, `proposal/build/template.html`, `proposal/build/fixture.md`
- Test: `proposal/build/verify.mjs`를 `fixture.md`로 실행

**Interfaces:**
- Produces: `npm run proposal:html` → `proposal/build/out/상세제안서.html`, `npm run proposal:pdf` → `proposal/상세제안서.pdf`, `npm run proposal:verify [-- --input <md> --pdf <pdf>]` → 실패 항목을 출력하고 종료 코드 1.
- 앞머리 스키마: `title`, `subtitle`, `contest`, `author`(비워 두면 표지에 생략), `date`.

- [ ] **Step 1:** 루트 `package.json`(`"type": "module"`, `"private": true`)에 devDependencies 고정 버전 설치: `npm i -D markdown-it@15.0.2 markdown-it-footnote@4.0.0 playwright@1.64.0 pdfjs-dist@4.10.38 wanted-sans@1.0.3`, `npx playwright install chromium`. scripts: `proposal:html`, `proposal:pdf`(html 후 pdf), `proposal:verify`.
- [ ] **Step 2: 검증 스크립트를 먼저 작성** — `verify.mjs`가 확인하는 것:
  - md: 각주 참조 집합 == 정의 집합, 금지어 0건(Global Constraints 목록, 앞머리 제외), 장 제목 `## 1.`~`## 9.`와 `## 참고문헌` 존재(fixture 모드 `--fixture`면 장 검사 생략)
  - pdf: 쪽수 12~15(fixture 모드면 ≥ 2), 1쪽 텍스트에 쪽 번호 숫자 단독 줄 없음, 2쪽 이후 하단에 쪽 번호, 2쪽 글꼴 이름에 `WantedSans` 포함(pdfjs `page.getOperatorList()` 후 `page.commonObjs.get(fontId).name` 확인), 2쪽 이후 상단 머리글 `아산 밥때 상세 제안서` 존재
- [ ] **Step 3:** `fixture.md`(앞머리 + 각주 2개 + 표 1개 + 금지어 0, 2쪽 이상 분량)를 만들고 `npm run proposal:verify -- --fixture --input proposal/build/fixture.md --pdf proposal/build/out/fixture.pdf` → FAIL(파일 없음).
- [ ] **Step 4: build.mjs 구현** — `build.mjs --input <md> --out <html> [--pdf <pdf>]`. 앞머리는 `---` 블록을 단순 `key: value` 파싱. markdown-it `{ html: true, typographer: false }` + footnote. `template.html`에 표지(`<section class="cover">`: contest, title, subtitle, date, 오렌지 짧은 선) + 본문 삽입. PDF는 `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`, 서체는 `node_modules/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2`를 `file://`로 `@font-face`, `document.fonts.ready` 대기 후 출력.
- [ ] **Step 5: print.css** — `@import` 토큰, `@page { size: A4; margin: 20mm 18mm 22mm; @top-left { content: "아산 밥때 상세 제안서" } @bottom-right { content: counter(page) } }`(둘 다 9pt Wanted Sans, `--muted-foreground`), `@page :first { margin: 0; @top-left { content: none } @bottom-right { content: none } }`, 표지 전면 `--deep` 배경·흰 글자, `h2` 새 쪽 시작(`break-before: page`, 단 1장은 요약 다음), 본문 10.5pt/1.75, 최대 행 길이 지면 폭, 표 머리 `--accent` 배경 `--deep` 글자, 인용·강조 상자 `border-left: 3px solid var(--primary)` + `--background` 배경, 각주 영역 9pt `--muted-foreground`, `thead { display: table-header-group }`, `tr, figure { break-inside: avoid }`.
- [ ] **Step 6:** fixture로 html·pdf 생성 후 verify → PASS.
- [ ] **Step 7: Commit** — `git add package.json package-lock.json proposal/build && git commit -m "build(proposal): md→pdf 변환과 검증 파이프라인"`

---

### Task 2: 표지·요약 자리와 1~3장 (배경, 현황, 문제점)

**Files:**
- Create: `proposal/상세제안서.md`

**Interfaces:**
- Consumes: Task 1 앞머리 스키마, 조사 노트 1·3·4·5장, `reference/` 메뉴표

내용 결정:
- 앞머리: `title: 줄 서지 않는 점심, 직원식당 통합 안내 서비스`, `subtitle: 실시간 혼잡도와 메뉴, 운영시간, 위치를 한 화면에`, `contest: 2026 서울아산병원 업무개선 AI 공모전`, `date: 2026년 10월`.
- `## 요약`: 자리만 두고 Task 4에서 채운다(`<!-- 요약: Task 4 -->`).
- `## 1. 추진 배경`: 병원 규모(병상 2,446, 일 외래 11,377명, 연 수술 52,838건 — 공식 2025 현황, 각주), 임직원 약 9,242명(국민연금 가입자 기준, 사람인 재인용 표기), 의료진 식사시간 부족 근거(2018 간호사 식사시간 온전히 보장 11.3%, 2013 평균 식사시간 22.7분, 2026 결식 65.5% 재인용), 근로기준법 제54조 휴게시간. 표 1개: "의료진 식사 환경 관련 조사" (연도·조사·수치·출처).
- `## 2. 현황 분석`: 표 "직원식당 운영 구조"(끼니 × 동관 / 서관·신관: 조식 A·B 06:00–09:00 동관, 중식 동관 11:00–15:00(일·공휴 ~14:00) / 서관·신관 11:00–14:00 주말·공휴 미운영, 간편식 도시락 11:00–13:00 평일, 석식 A 17:30–19:40 / B 17:30–품절 시, 이동식 21:30–22:30, 야식 23:30–01:00), 테이크아웃 구조(그린존 2PICK·오렌지존 3PICK·퍼플존 4PICK, 동관 상시 06:00–19:40 / 서관·신관 평일 07:00–08:30, 11:00–14:00), 도시락 예약(AMIS3.0, 월 08:30~목 17:30, 일 500개 한정). 인라인 SVG 도식 "정보 확인 경로 분산": 직원 → (모바일 아산넷 오늘의메뉴 / 아산넷 웹: 도시락·주간 메뉴·테이크아웃·오늘의 중식 이미지 / AMIS3.0 도시락 신청 / 현장 DID 원산지) 네 갈래, 색은 primary·accent·border만. 출처 각주: 서울아산병원 내부 메뉴 안내 자료(2026년 10월 3주차).
- `## 3. 문제점`: 5개 문제를 표(문제 / 현재 모습 / 직원이 겪는 불편)로: ① 혼잡 정보 부재 ② 운영시간이 메뉴 이미지 안에만 있음 ③ 메뉴 정보가 아산넷 웹·모바일·이미지로 분산 ④ 식당 위치 안내 없음(공개 안내도에는 동관 B1F 직원식당만 표기, 각주) ⑤ 알림 수단 없음. 이어서 대기 심리 근거 한 단락(Maister 1985 "설명 없는 기다림은 더 길게 느껴진다", Hui & Tse 1996 대기시간 정보 제공 효과, 각주).

- [ ] **Step 1:** 위 내용으로 작성. 표·도식마다 번호 캡션(`표 1.`, `그림 1.`).
- [ ] **Step 2:** `npm run proposal:verify -- --input proposal/상세제안서.md` 실행 — 이 시점엔 4~9장 누락으로 장 검사만 실패해야 한다. 각주·금지어 오류는 0이어야 한다.
- [ ] **Step 3: Commit** — `docs(proposal): 표지와 1~3장`

---

### Task 3: 4~6장 (개선 방안, 혼잡도 측정 설계, AI 활용)

**Files:**
- Modify: `proposal/상세제안서.md`

내용 결정:
- `## 4. 개선 방안`: 기능 8개를 같은 틀(문제 → 해결 → 기대 모습) 소제목으로: 실시간 혼잡도(4단계: 여유 <2분, 보통 2~5분, 줄 있음 5~10분, 혼잡 ≥10분), 운영시간 안내(끼니별·요일별 텍스트, 지금 열린 곳·남은 시간), 메뉴 통합(동관·서관·신관 비교, 테이크아웃 존, 도시락), 식당 위치 안내(건물·층·찾아가는 길), 알림 구독(대기 해소, 즐겨찾는 메뉴, 도시락 예약 마감 목 17:30 전, 배식 마감 30분 전), 메뉴 비교·취향 추천(알레르기·칼로리 표시 포함), 도시락 예약 연계(AMIS3.0 바로가기·마감 알림), 품절 현황·만족도 피드백(영양팀 수요 예측·잔반 감축 자료로 활용). 마지막에 서비스 개념도 1개(인라인 SVG): 한 화면에 "지금 어디로 가면 좋은지 한 문장 + 식당별 상태 + 메뉴" 를 보여주는 와이어 수준 도식(실제 앱 화면 캡처 금지).
- `## 5. 혼잡도 측정 설계`: 3단계 도식(인라인 SVG, 왼→오 세 단계): 1단계 검수 직원 원터치 입력(추가 장비 0, 입력 15분 유지) → 2단계 사원증 태깅·모바일 식권 QR 로그의 분당 입장 수 집계(대기 인원 ≈ 누적(도착 − 처리), 대기시간 ≈ 대기 인원 ÷ 분당 처리 인원) → 3단계 AI 예측(요일·시간·메뉴 인기도·근무표 기반, 추천 식사 시각 = 예상 대기 3분 미만인 가장 이른 시각). 표: 단계별 데이터 원천·정확도·비용·전제 조건. 개인 단위가 아닌 식당·분 단위 집계값만 쓴다는 원칙을 이 장에도 한 줄 명시.
- `## 6. AI 활용 방안`: 혼잡 예측 모델(입력 특성 표: 요일, 시각, 공휴일, 메뉴 인기도, 직전 30분 입장 수, 날씨 선택), 메뉴 선호 분석(만족도·잔반 피드백), 식수 예측과 잔반 감소(LH 구내식당 식수 예측 경진대회 사례 — 입력: 인원·휴가·출장·초과근무·재택·메뉴, 각주; 누비랩 "평균 30% 이상" 감소는 업체 주장임을 명시), 유사 사례 표(현대그린푸드 H-카페테리아 AI 카메라 2025, 삼성웰스토리 구역별 혼잡·대기시간 2025, 서울대 마이스누 3단계 혼잡도 2024 — 각주).

- [ ] **Step 1:** 작성 → **Step 2:** verify(장 검사 7~9만 실패) → **Step 3: Commit** — `docs(proposal): 4~6장`

---

### Task 4: 7~9장, 요약, 참고문헌

**Files:**
- Modify: `proposal/상세제안서.md`

내용 결정:
- `## 7. 추진 계획`: 타임라인 도식(인라인 SVG) — 1단계(1~2개월: 운영시간·메뉴 통합·위치 안내·검수 직원 입력, 시범 식당 동관), 2단계(3~5개월: 태깅·QR 로그 집계 연동, 알림), 3단계(6개월~: AI 예측·추천, 만족도·잔반 연계). 표: 협업 부서와 역할(영양팀: 메뉴·품절·만족도 / 정보 담당 부서: 아산넷·태깅 로그 연동 / 급식 위탁사: 현장 입력·처리 인원 / 디자인·콘텐츠팀: 안내 디자인 / 노사협의회: 로그 활용 협의).
- `## 8. 기대 효과`: 정량 추정 표 — 가정을 표 안에 명시하고 "원내 실측으로 보정 필요" 각주:
  - 가정: 평일 중식 직원식당 이용 4,000명/일, 그중 대기 경험 30%, 1인 대기 단축 5분, 연 근무일 250일
  - 계산: 4,000 × 0.3 × 5분 = 6,000분/일 = 100시간/일 → 연 25,000시간
  - 정성 효과: 정시 업무 복귀, 식사 만족도, 결식 감소 기대, 잔반 감소, 정보 탐색 시간 절감(4개 경로 → 1곳)
- `## 9. 고려사항`: 개인정보(개인정보 보호법 제3조 제7항 익명 처리 우선, 제28조의2 가명정보, 제58조의2 익명정보 적용 제외 — 각주), 근로자참여법 제20조 "근로자 감시 설비" 협의 사항이므로 노사협의회 사전 협의, 기존 시스템 연동(아산넷 메뉴 등록 화면 재사용, AMIS3.0 연결), 운영 부담(검수 직원 입력은 원터치, 메뉴는 기존 등록 데이터 재사용), 한계(2단계 전에는 직원 입력 의존, 예측 정확도는 운영 데이터 축적 필요). 표: 위험 / 대응.
- `## 요약`: 1쪽 이내 — 한 문장 제안, 핵심 기능 3개(실시간 혼잡도와 추천 시각, 운영시간·메뉴·위치 통합, 알림), 기대효과 한 줄(연 25,000시간 추정, 가정 표기), 단계 추진 한 줄.
- `## 참고문헌`: markdown-it-footnote가 문서 끝에 각주 목록을 렌더링하므로, 이 제목 아래에는 "본문 각주 번호 순으로 정리한다" 한 줄만 두고 print.css에서 각주 섹션이 이 제목 바로 뒤에 오도록 build.mjs가 `<section class="footnotes">`를 참고문헌 제목 뒤로 옮긴다.

- [ ] **Step 1:** 작성 → **Step 2:** `npm run proposal:verify -- --input proposal/상세제안서.md` 의 md 검사 전부 PASS(PDF 검사는 Task 5) → **Step 3: Commit** — `docs(proposal): 7~9장, 요약, 참고문헌`

---

### Task 5: PDF 출력과 지면 점검

**Files:**
- Modify: `proposal/상세제안서.md`, `proposal/build/print.css`(필요 시)
- Create: `proposal/상세제안서.pdf`

- [ ] **Step 1:** `npm run proposal:pdf && npm run proposal:verify` → 쪽수 12~15, 서체, 쪽 번호 검사 PASS. 쪽수가 벗어나면 본문 문장을 줄이거나(16쪽 이상) 도식 크기를 조정(11쪽 이하)하고 다시 실행.
- [ ] **Step 2:** Playwright로 각 쪽을 PNG로 렌더링(스크래치 디렉터리)해 육안 점검: 표 잘림·머리행 반복, 고아 제목(쪽 끝에 제목만), 각주 영역, 표지 전면 색, 오렌지가 표지 한 곳에만 있는지. 문제를 고치고 다시 출력.
- [ ] **Step 3:** 최종 금지어·각주 검사 PASS 확인 후 Commit — `git add proposal && git commit -m "docs(proposal): 상세 제안서 PDF"`
- [ ] **Step 4:** 사용자에게 원내 확인 필요 항목(스펙 6장: 서관·신관 식당 위치, 공식 임직원 수, 노조 원문, 중식 이용 인원 가정치)을 목록으로 보고한다.
