# 밥타임 v3.1 (근무 건물·도보 시간 제거, 검수 직원 문구) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹앱과 제안서에서 근무 건물 기준 이동+대기 추천(도보 시간)을 걷어내고, 검수 직원 화면의 입력 상태와 취소를 직원 눈높이 문구로 바꾼다.

**Architecture:** 이동+대기 추천 경로(`walk.ts`, `WALK_MINUTES`, `workBuilding` 설정, 근무 건물 시트)를 지우고 `homeHeadline(now)`가 대기만 보고 고르게 한다. 검수 직원 화면은 저장 형식(`staffLog`)을 그대로 두고 `EntranceInput`의 표시만 바꾼다. 제안서는 해당 문단·표 행·그림 문구를 고치고 PDF를 다시 만든다.

**Tech Stack:** Vite, React 19, TS, shadcn(Base UI), Vitest, Playwright; 제안서 md → pdf(`npm run proposal:pdf`, `proposal:verify`).

**Spec:** `docs/superpowers/specs/2026-10-15-remove-walk-staff-copy-design.md`

## Global Constraints

- UI 작업 전 `.claude/skills/shadcn/SKILL.md`를 읽는다.
- 웹앱 문구는 해요체 한국어. 이모지·그라디언트·가운데점(·)으로 잇는 메타 문구·버튼 뒤 화살표·영문 대문자 라벨 금지. 오렌지는 새 요소에 쓰지 않는다.
- 직원 화면에는 '예측값', '모델' 낱말을 쓰지 않는다.
- 제안서는 구현 프로그램(웹앱·프로토타입·시연)을 언급하지 않고, 본문 문체(한다체)를 따른다. verify 쪽수 12~16.
- 지도(`BUILDINGS`, `BuildingId`, `CampusMap`)는 건드리지 않는다.
- 저장 형식 `staffLog`(입력 순간의 `model` 포함)와 `/ops`, `/ops/accuracy`는 바꾸지 않는다.
- 각 작업 끝에 `app/`에서 `npm test`가 통과해야 한다. 마지막 작업에서 E2E·tsc·lint·build와 제안서 verify까지.
- 커밋 메시지 형식 `feat(app): …` / `fix(app): …` / `docs: …` / `docs(proposal): …` + 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 배포하지 않는다.

## Review Focus

1. 예전 브라우저 저장값: `babttae.workBuilding`이 `"west"`로 남은 상태로 홈을 열면 오류 없이 대기 기준 문장("지금은 …")이 나와야 한다 → Task 1 `ignores a stored work building`.
2. 끝나는 시각 표기: 12:20에 입력하면 "12:35까지"여야 한다(실제 경과 몇 ms 때문에 "12:34"로 내려가면 안 됨) → Task 2 `shows the end time as at + 15 minutes`.
3. 같은 등급을 다시 누름: 상자 시각이 갱신되고 화면 읽기 문구가 다시 읽혀야 한다 → Task 2 `re-press re-announces and refreshes the end time`.
4. 다른 탭에서 입력이 들어오거나 15분이 지나 풀림: 상자가 사라지고 안내 문구가 돌아와야 한다 → Task 2 `expiry brings back the prompt`.
5. 제안서에 표 밖 언급 잔존: 본문 전체 검색 결과가 원칙대로 처리돼야 한다 → Task 3 Step 2의 grep 확인.

---

## File Structure

| 파일 | 변경 |
|---|---|
| `app/src/lib/walk.ts`, `app/src/lib/walk.test.ts` | 삭제 |
| `app/src/components/home/WorkBuildingSheet.tsx` | 삭제 |
| `app/src/data/buildings.ts`, `buildings.test.ts` | `WALK_MINUTES`와 그 테스트 삭제 |
| `app/src/lib/prefs.ts`, `prefs.test.ts`, `app/src/hooks/usePrefs.ts` | `getWorkBuilding`/`setWorkBuilding`/`workBuilding` 삭제 |
| `app/src/lib/recommend.ts`, `recommend.test.ts` | `homeHeadline(at)`로, 도보 분기 삭제 |
| `app/src/pages/Home.tsx`, `Home.test.tsx` | 근무 건물 칩·시트·도보 문구 삭제 |
| `app/src/components/home/HallDetailSheet.tsx` | 도보 줄 삭제 |
| `app/e2e/home.spec.ts` | 근무 건물 테스트 삭제 |
| `app/src/pages/Staff.tsx`, `Staff.test.tsx`, `app/e2e/staff.spec.ts` | 입력 상태 상자, 선택 취소, 문구 |
| `proposal/상세제안서.md`, `proposal/상세제안서.pdf` | 이동+대기 추천 제거 |
| `docs/HANDOFF.md` | 확인 항목·이슈·시연 목록·검증 수 |

---

### Task 1: 웹앱에서 근무 건물·도보 시간 제거

**Files:**
- Delete: `app/src/lib/walk.ts`, `app/src/lib/walk.test.ts`, `app/src/components/home/WorkBuildingSheet.tsx`
- Modify: `app/src/data/buildings.ts`(`WALK_MINUTES`), `app/src/data/buildings.test.ts:45-`, `app/src/lib/prefs.ts:62-69`, `app/src/lib/prefs.test.ts:7-42`, `app/src/hooks/usePrefs.ts`, `app/src/lib/recommend.ts:107-150`, `app/src/lib/recommend.test.ts:146-160`(from 건물 테스트), `app/src/pages/Home.tsx`, `app/src/pages/Home.test.tsx`(163·226·263·287행 근처 근무 건물 테스트), `app/src/components/home/HallDetailSheet.tsx:139,178-188`, `app/e2e/home.spec.ts`

**Interfaces:**
- Produces: `homeHeadline(at: Date): { title: string; detail: string | null; tiles: Tile[] }` — 근무 건물 인자 없음. `usePrefs()`는 `{ favorites, subscriptions, toggleFavorite, setSubscriptions }`만.

- [ ] **Step 1: 실패하는 테스트**

  `Home.test.tsx`에 추가하고 근무 건물 테스트 4개(163·226·263·287행 근처)는 지운다:
  - `ignores a stored work building`: `localStorage.setItem("babttae.workBuilding", '"west"')` 후 `renderAt("2026-10-14T12:20", <HomePage />)` → 제목이 "지금은 신관이 바로 드실 수 있어요"(v2 보정 목표), 화면에 "걸어서", "근무 건물", "도보" 텍스트가 없다.
  - `hall rows show no walking time`: 같은 시각, 식당 줄 3개에 "걸어서"가 없다.

  `recommend.test.ts`의 `homeHeadline(…, '동관'/'서관' 등)` 도보 테스트(146–160행 근처)를 지운다. `buildings.test.ts`의 `copies the walking-minute table from the spec`, `prefs.test.ts`의 근무 건물 테스트(33–42행)를 지운다.

- [ ] **Step 2: 실패 확인**

  Run: `cd app && npx vitest run src/pages/Home.test.tsx`
  Expected: FAIL (`근무 건물` 칩이 아직 보임)

- [ ] **Step 3: 구현**

  파일 표대로 지운다. `homeHeadline`은 `from` 인자와 그 두 분기(도보 선택, "지금 출발하면 마감 전에 도착하기 어려워요")를 지우고 나머지 대기 기준 흐름을 그대로 둔다. `Home.tsx`는 `homeHeadline(now)`를 부르고 칩·시트·`walk` prop을 지운다. `HallDetailSheet`는 `usePrefs`의 `workBuilding`을 쓰는 줄을 지운다(다른 용도로 `usePrefs`를 쓰지 않으면 import도 지움). `e2e/home.spec.ts`에서 근무 건물 칩·도보를 다루는 테스트를 지운다.

- [ ] **Step 4: 통과와 잔재 확인**

  Run: `cd app && npm test && npx tsc -p tsconfig.app.json --noEmit && npm run lint`
  Expected: PASS, 오류 0
  Run: `grep -rn -e "workBuilding" -e "WALK_MINUTES" -e "fastestHall" -e "walkMinutes" -e "걸어서" -e "근무 건물" app/src app/e2e`
  Expected: 출력 없음(Home.test의 `ignores a stored work building`이 쓰는 `babttae.workBuilding` 문자열 한 곳만 허용)

- [ ] **Step 5: 커밋**

```bash
git add -A app
git commit -m "feat(app): 근무 건물과 도보 시간을 없애고 홈 추천을 대기 기준으로"
```

---

### Task 2: 검수 직원 화면 — 상태 상자와 선택 취소

**Files:**
- Modify: `app/src/pages/Staff.tsx` (`EntranceInput`, `PARTICLE`, `compareWait` 삭제 여부)
- Test: `app/src/pages/Staff.test.tsx`, `app/e2e/staff.spec.ts`

**Interfaces:**
- Consumes: `addStaffEntry`, `cancelStaffEntry`, `getActiveEntry`, `entryRemainingMs`, `OVERRIDE_TTL_MS`, `subscribeOverrides` (`@/lib/override`); `LEVEL_LABEL` (`@/lib/queue`); `formatMinutes`, `seoulMinutes` (`@/lib/format`).

- [ ] **Step 1: 실패하는 테스트 (`Staff.test.tsx`)**

  지울 테스트: 모델 비교 문구 테스트들(`after input shows the stored model…`, `different level says 모델은`, `uses 로 after 여유`의 비교 문구 부분, `compares against the stored model…`, 내림 분 테스트), 예전 취소 문구 테스트. 새 묶음 `Staff entrance status` (`renderAt("2026-10-14T12:20", <StaffPage />)`):
  - `asks to choose before input`: "지금 입구 상황을 골라 주세요"가 보이고 "선택 취소" 버튼이 없다.
  - `shows the status box after input`: 동관 "혼잡" 클릭 → "직원들 화면에 '혼잡'으로 보여요", "12:35까지 유지돼요(15분 남음)", "선택 취소" 버튼; 안내 문구 "지금 입구 상황을 골라 주세요"는 없다.
  - `uses 로 after 여유`: "여유" 클릭 → "직원들 화면에 '여유'로 보여요".
  - `shows the end time as at + 15 minutes`: 가짜 실제 시계(`vi.useFakeTimers({ toFake: ['Date'] })`)로 입력 후 실제 시각 5분 30초 진행 → "12:35까지 유지돼요(10분 남음)".
  - `cancel brings back the prompt`: "혼잡" → "선택 취소" → 상자 없음, 안내 문구 다시 보임, 어떤 버튼도 `aria-pressed="true"` 아님, `getActiveEntry("east")`가 `null`, `role="status"` 텍스트 "선택 취소됨".
  - `expiry brings back the prompt`: 입력 후 실제 시각 15분 진행 → 상자 없음, 안내 문구 보임.
  - `re-press re-announces and refreshes the end time`: "혼잡" → 실제 시각 2분 진행 → 다시 "혼잡" → 상태 영역(`role="status"`) 요소는 같은 노드이고 그 안의 글자 노드가 바뀌어 "혼잡 선택됨"; 상자 둘째 줄이 새 입력 기준 `` `${formatMinutes(seoulMinutes(new Date(getActiveEntry("east")!.at + OVERRIDE_TTL_MS)))}까지 유지돼요(15분 남음)` ``와 같다(시연 시계가 흐르는지에 따라 12:35 또는 12:37이므로 값은 계산해 비교).
  - `never mentions the model or prediction`: 입력 전·후·취소 후 모두 `document.body.textContent`에 "예측값"과 "모델"이 없다.

- [ ] **Step 2: 실패 확인**

  Run: `cd app && npx vitest run src/pages/Staff.test.tsx`
  Expected: FAIL

- [ ] **Step 3: 구현**

  - 제목 "입구 상황" 아래, 입력이 없을 때만 `<p className="text-sm text-muted-foreground">지금 입구 상황을 골라 주세요</p>`.
  - 버튼 그리드는 그대로.
  - 유효한 입력이 있을 때 버튼 아래 상자: `rounded-2xl border border-border bg-card p-4 flex flex-col gap-3`. 첫 줄 `font-semibold`: `` `직원들 화면에 '${LEVEL_LABEL[level]}'${PARTICLE[level]} 보여요` ``. 둘째 줄 `text-sm text-muted-foreground`: `` `${formatMinutes(seoulMinutes(new Date(active.at + OVERRIDE_TTL_MS)))}까지 유지돼요(${left}분 남음)` `` (`left`는 지금처럼 `Math.ceil(entryRemainingMs / 60_000)`). 버튼 `<Button variant="outline" className="h-11 w-full">선택 취소</Button>` → `cancelStaffEntry(active.id)`.
  - 상태 영역: 항상 렌더되는 `<p role="status" className="sr-only">` 하나. 안의 글자는 `<span key={announceKey}>{announce}</span>`로 두어, 입력할 때마다(`entry.id`) 또는 취소할 때 새 span으로 바뀌게 한다. 문구 `${LEVEL_LABEL[level]} 선택됨`, `선택 취소됨`. 만료로 풀릴 때는 읽지 않는다.
  - 지우는 것: 모델 비교 줄, `compareWait`, 예전 취소 문구와 `cancelledHall`의 문구 용도(상태 영역용으로 필요하면 이름을 바꿔 둔다), "지금은 예측값을 보여주고 있어요".
  - `key={hall}`로 식당을 바꾸면 다시 만드는 지금 구조는 유지.

- [ ] **Step 4: 통과 확인**

  Run: `cd app && npx vitest run src/pages/Staff.test.tsx && npm test`
  Expected: PASS

- [ ] **Step 5: E2E 문구 갱신**

  `e2e/staff.spec.ts`: `"입력 취소"` → `"선택 취소"`; `/에 입력, \d+분 남음/`, `/에 입력, 15분 남음/` → `/까지 유지돼요\(\d+분 남음\)/`, `/까지 유지돼요\(15분 남음\)/`; "입력을 취소했어요" 검사 → "지금 입구 상황을 골라 주세요". 홈·운영자 반영 검사는 그대로.

  Run: `cd app && npx playwright test e2e/staff.spec.ts`
  Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add app/src/pages/Staff.tsx app/src/pages/Staff.test.tsx app/e2e/staff.spec.ts
git commit -m "feat(app): 검수 직원 화면에 입력 상태 상자와 선택 취소, 예측값 문구 제거"
```

---

### Task 3: 제안서에서 이동+대기 추천 제거

**Files:**
- Modify: `proposal/상세제안서.md` (19, 173, 182, 190–238, 375, 402행 근처), `proposal/상세제안서.pdf`(다시 생성)

- [ ] **Step 1: 스펙 3장 표대로 고친다**

  정확한 새 문구:
  - 19행: `4. **평소 혼잡 패턴, 운영자 대시보드.** 요일·시간대별 평소 혼잡과 원산지를 미리 보여 준다. 영양팀·식당 운영 주체는 시간대별 입장·품절·만족도·잔반을 보고 배식 인력과 준비량을 조정한다.`
  - 173행 `<tr>…이동+대기 총 소요시간 추천…</tr>` 삭제.
  - 182행 `- **이동+대기 총 소요시간.** …` 항목 삭제.
  - 그림 2: 40행 근처 `<text …>지금 출발하면 서관이 가장 빠릅니다</text>` → `지금은 서관이 가장 한산합니다`; 191행 `동관에서 걸어서 7분, 도착하면 대기 1분 예상` → `예상 대기 1분, 동관은 13시 15분부터 한산`; 227–228행 두 줄 → `식당 3곳의 예상 대기를 비교해` / `지금 가장 빨리 먹을 수 있는 곳을 먼저 말한다`; 238행 캡션에서 `근무 건물을 정하면 도보 시간을 더해 고른다` 문장 삭제(`(표시 값은 예시)`는 앞 문장 끝으로).
  - 375행 `· 이동+대기 추천, 평소 혼잡 패턴` → `· 평소 혼잡 패턴`.
  - 402행 `예측 모델·오차(MAE) 점검, 이동+대기 추천, 혼잡 패턴` → `예측 모델·오차(MAE) 점검, 혼잡 패턴`.

- [ ] **Step 2: 잔재 검색**

  Run: `grep -n -e "이동+대기" -e "도보" -e "걸어" -e "근무 건물" -e "건물 간" proposal/상세제안서.md`
  Expected: 552행 설문 주석의 "근무 건물" 한 곳만. 그 밖에 나오면 스펙 3장 원칙(기능 설명이면 빼고, 배경·문제 정의면 남김)으로 처리하고 보고서에 적는다. 기능 개수를 세는 문장이 바뀐 기능 수와 맞는지 확인한다.

- [ ] **Step 3: PDF 다시 만들기와 검증**

  Run: `npm run proposal:pdf && npm run proposal:verify` (저장소 루트)
  Expected: verify PASS, 쪽수 12~16. 쪽수가 바뀌면 보고서에 적는다. 그림 2를 PDF에서 눈으로 확인한다(글자 겹침·잘림 없음).

- [ ] **Step 4: 커밋**

```bash
git add proposal/상세제안서.md proposal/상세제안서.pdf
git commit -m "docs(proposal): 근무 건물 기준 이동+대기 추천을 빼고 그림 2 문구 정리"
```

---

### Task 4: 인수인계 문서와 전체 검증

**Files:**
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: 전체 검증**

  Run: `cd app && npm test && npx playwright test && npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm run build`, 그리고 저장소 루트에서 `npm run proposal:verify`
  Expected: 모두 통과. 단위·E2E 수를 기록한다.

- [ ] **Step 2: `docs/HANDOFF.md` 갱신**

  - "사용자(작성자)가 원내에서 확인할 항목" 4번(건물 간 도보 시간)을 지우고 번호를 다시 매긴다.
  - "알려진 경미한 이슈"의 "식당 상세 시트는 운영하지 않는 날에도 도보 시간을 보여줌"을 지운다.
  - 시연 목록의 "홈의 \"근무 건물\" 칩"을 지운다.
  - 현재 상태 표의 검증 수를 Step 1 값으로, 웹앱 행에 "v3.1(근무 건물·도보 제거, 직원 화면 문구) 미배포, 사용자 확인 후 배포"를 적는다. 제안서 행의 쪽수가 바뀌었으면 고친다.

- [ ] **Step 3: 커밋**

```bash
git add docs/HANDOFF.md
git commit -m "docs: 인수인계 문서에 근무 건물·도보 제거와 직원 화면 문구 반영"
```
