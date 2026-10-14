# 아산 밥때 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서울아산병원 직원식당의 혼잡도·메뉴·운영시간·위치·알림을 한 화면에 보여주는 모바일 우선 프런트엔드 프로토타입을 만들어 Vercel URL로 제출한다.

**Architecture:** Vite SPA. 순수 TypeScript 도메인 모듈(`src/lib/*`: 운영시간, 대기열 모델, 추천, 알림 규칙)이 정적 데이터(`src/data/*`)와 시뮬레이션 시계를 입력으로 받아 계산하고, React 화면은 이를 훅으로 구독해 그리기만 한다. 서버 없음, 상태는 `localStorage` + `BroadcastChannel`.

**Tech Stack:** Vite, React 19, TypeScript, shadcn/ui(Base UI, `maia` 스타일), Tailwind v4, React Router, Recharts(shadcn `Chart`), Vitest + Testing Library, Playwright, Wanted Sans Variable.

**Spec:** `docs/superpowers/specs/2026-10-14-asan-cafeteria-design.md`

## Global Constraints

- 프로젝트 스킬을 반드시 쓴다: UI 작업 전 `shadcn` 스킬(`.claude/skills/shadcn/SKILL.md`)을 로드하고, 컴포넌트를 쓰기 전 `npx shadcn@latest docs <component>`로 API를 확인한다. Radix 기반 코드가 들어오면 `migrate-radix-to-base` 스킬로 변환한다. 차트 작업 전 `dataviz` 스킬을 로드한다.
- shadcn Critical Rules 준수: `gap-*`(no `space-*`), `size-*`, semantic token 클래스만(raw 색 클래스·수동 `dark:` 금지), `cn()`, 아이콘은 `data-icon`, 폼은 `FieldGroup`/`Field`, 2–7개 선택지는 `ToggleGroup`, 빈 상태는 `Empty`, Base UI 토스트는 `toast` 컴포넌트(`toast.add`).
- 색은 `design/tokens.css` 한 곳에서만 정의한다(스펙 3.6 표의 HEX 그대로). 앱 코드에 HEX 직접 기입 금지.
- 브랜드 오렌지(`--brand-orange`)는 세 곳에만: "지금" 표시선, 예측 막대의 현재 막대, (제안서) 표지 짧은 선. 테이크아웃 존 색은 `--zone-*` 토큰으로 테이크아웃 존 표시에만.
- 금지: ✨/이모지 아이콘, 그라디언트 장식, 같은 카드 반복 나열, 상태 배지 남발, 영문 대문자 라벨, 버튼 글자 뒤 화살표, 자동 등장 애니메이션. `prefers-reduced-motion` 존중.
- 서체 Wanted Sans Variable 하나, `font-feature-settings: "tnum"`, `word-break: keep-all`.
- 상태는 항상 글자로 표기: 여유 / 보통 / 줄 있음 / 혼잡. 기준(예상 대기): 여유 < 2분, 보통 2~5분, 줄 있음 5~10분, 혼잡 ≥ 10분.
- 검수 직원 입력은 15분 동안 모델 값보다 우선.
- 추천 시각: 예상 대기 3분 미만인 가장 이른 시각.
- `localStorage` 키 접두사 `babttae.`, `BroadcastChannel` 이름 `babttae`.
- 메뉴 데이터 기준 주: 2026-10-12(월) ~ 2026-10-18(일). 화면에 "10월 3주차 메뉴 기준" 표기.
- 서관·신관 직원식당 위치는 `estimated`로 표기("추정" 글자 노출).
- 예측·혼잡도 화면에 "모의 데이터 기반 예측 시연" 표기. 알레르기·칼로리는 "예시" 표기.
- 사용자 문구: 존댓말 해요체, 문장형, 군더더기 없이. 병원 로고 사용 금지.
- 작업 디렉터리: 웹앱은 `app/`. 명령은 `app/`에서 실행(`npm`).

## Review Focus

1. 자정 넘김(00:00~01:00) 야식 — 목요일 00:30은 수요일 23:30에 시작한 야식으로 `open`이어야 한다. → Task 2 테스트.
2. 평일 공휴일(예: 2026-10-09 금) — 서관·신관 중식 휴무, 동관 중식 11:00–14:00. → Task 2 테스트.
3. 배식 시간이 아닐 때(15:30, 03:00) 열어도 홈이 비지 않고 다음 배식과 메뉴를 보여준다. → Task 6, Task 9 테스트.
4. `localStorage` 접근이 예외를 던지는 환경(사파리 프라이빗 등)에서도 앱이 동작한다. → Task 1 테스트.
5. 알림 권한 거부·`Notification` 미지원 브라우저 — 같은 알림이 앱 안 토스트로 한 번만 나온다. → Task 7 테스트.

---

## File Structure

```
design/tokens.css                 # 공통 색·서체 토큰 (제안서도 사용)
app/
  DESIGN.md                       # shadcn design-system 흐름 입력
  vercel.json                     # SPA rewrite
  src/index.css                   # tailwindCssFile: tokens import + shadcn 변수 매핑
  src/main.tsx, src/App.tsx       # 라우터, Provider
  src/data/
    restaurants.ts                # 장소, 위치, 운영시간 창, 공휴일
    menus/week-2026-10-12.ts      # 주간 직원식당·도시락·테이크아웃 메뉴
    menus/box-lunch-reservation.ts# 다음 주 도시락 예약 메뉴(10/19–23)
  src/domain/types.ts             # 공용 타입
  src/lib/
    storage.ts                    # 안전한 localStorage 래퍼
    hours.ts                      # 운영 상태 판정
    menu.ts                       # 요일 매핑, 인기도
    clock.ts                      # 시뮬레이션 시계
    queue.ts                      # 대기열 모델, 상태 등급
    override.ts                   # 검수 직원 입력, 탭 동기화
    recommend.ts                  # 예측 곡선, 추천, 홈 문장
    prefs.ts                      # 즐겨찾기, 구독, 별점
    alerts.ts                     # 알림 규칙, 전달
  src/hooks/                      # useClock, useVenueStatus, usePrefs, useAlertsEngine
  src/providers/                  # ThemeProvider, ClockProvider
  src/components/layout/          # AppShell, TabBar, Header, DemoTimeSheet
  src/components/common/          # BuildingTile, StatusText, ServiceStrip, ForecastBars
  src/pages/                      # Home, Menu, Map, Alerts, Staff
  e2e/                            # Playwright 스모크
```

---

### Task 1: 스캐폴드, 디자인 토큰, 테마, 안전 저장소

**Files:**
- Create: `design/tokens.css`, `app/` (shadcn init), `app/DESIGN.md`, `app/src/lib/storage.ts`, `app/src/providers/theme.tsx`, `app/vitest.config.ts`, `app/src/test/setup.ts`
- Modify: `app/src/index.css`, `app/src/main.tsx`
- Test: `app/src/lib/storage.test.ts`, `app/src/providers/theme.test.tsx`

**Interfaces:**
- Produces: `storage.get<T>(key: string, fallback: T): T`, `storage.set<T>(key: string, value: T): void`, `storage.isPersistent(): boolean` (키는 자동으로 `babttae.` 접두사). `ThemeProvider`, `useTheme(): { theme: 'light'|'dark'|'system'; resolved: 'light'|'dark'; setTheme(t) }` — `resolved`에 따라 `<html>`에 `dark` 클래스 토글.

- [ ] **Step 1: 스킬 로드** — `shadcn` 스킬과 그 안의 `design-system.md`를 읽는다.
- [ ] **Step 2: 스캐폴드** — 저장소 루트에서 `npx shadcn@latest init --base base --preset maia --template vite --name app --no-monorepo -y` → `cd app && npx shadcn@latest info --json`으로 `base`, `style`, `iconLibrary`, `tailwindCssFile`, `aliases` 기록. 이후 모든 import는 이 alias를 따른다.
- [ ] **Step 3: 컴포넌트 설치** — `npx shadcn@latest add button card tabs toggle-group sheet slider switch field label separator empty toast chart tooltip skeleton scroll-area -y`. 추가된 파일을 읽어 Critical Rules 위반·누락 import를 고친다. 루트에 `TooltipProvider`와 Base UI `Toaster`를 감싼다.
- [ ] **Step 4: 토큰 작성** — `design/tokens.css`에 스펙 3.6 표의 모든 역할을 `:root`(라이트)와 `.dark`(다크) CSS 변수로 정의: `--deep, --primary, --primary-foreground, --background, --card, --foreground, --muted-foreground, --accent, --border, --brand-orange, --status-ok, --status-mid, --status-queue, --status-busy, --zone-green-bg/fg, --zone-orange-bg/fg, --zone-purple-bg/fg`. `@font-face`는 넣지 않는다(앱·제안서가 각자 서체를 로드).
- [ ] **Step 5: 앱 테마 매핑** — `app/DESIGN.md`에 스펙 3.6 내용을 옮기고, `tailwindCssFile`에서 `design/tokens.css`를 import한 뒤 shadcn 변수(`--background`, `--primary`, `--ring`=primary, `--input`=border, `--popover`=card, `--secondary`=accent, `--chart-1`=primary, `--chart-2`=brand-orange …)에 매핑하고, shadcn 슬롯이 없는 토큰(`deep`, `brand-orange`, `status-*`, `zone-*`)은 `@theme inline`에 `--color-*`로 등록. 반경: 시트 22px는 `--radius-3xl: 22px`, 타일 8px는 `rounded-lg` 유지. 서체: `npm i wanted-sans@1.0.3`, `@import "wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css"`, body에 `font-family: "Wanted Sans Variable"`, `tnum`, `keep-all`.
- [ ] **Step 6: 테스트 도구** — `npm i -D vitest@3 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`; `vitest.config.ts`(environment jsdom, setupFiles), `package.json`에 `"test": "vitest run"`.
- [ ] **Step 7: 실패하는 테스트 작성**

```ts
// storage.test.ts
it('falls back to memory when localStorage throws', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
  storage.set('x', 1)
  expect(storage.get('x', 0)).toBe(1)
  expect(storage.isPersistent()).toBe(false)
})
it('prefixes keys', () => { storage.set('theme', 'dark'); expect(localStorage.getItem('babttae.theme')).toBe('"dark"') })

// theme.test.tsx
it('adds dark class when theme is dark', async () => { /* render ThemeProvider, setTheme('dark') */ expect(document.documentElement.classList.contains('dark')).toBe(true) })
it('follows system preference when theme is system', () => { /* matchMedia mock true → resolved 'dark' */ })
```

- [ ] **Step 8:** `npm test` → FAIL(모듈 없음).
- [ ] **Step 9:** `storage.ts`, `theme.tsx` 구현. 저장 실패 시 모듈 내부 `Map`으로 대체하고 이후 계속 메모리 사용.
- [ ] **Step 10:** `npm test` → PASS. `npx tsc -p tsconfig.app.json --noEmit` 오류 0, `npm run build` 성공.
- [ ] **Step 11: Commit** — `git add design app && git commit -m "feat(app): shadcn 스캐폴드, 아산 디자인 토큰, 테마, 안전 저장소"`

---

### Task 2: 장소 데이터와 운영시간 판정

**Files:**
- Create: `app/src/domain/types.ts`, `app/src/data/restaurants.ts`, `app/src/lib/hours.ts`
- Test: `app/src/lib/hours.test.ts`

**Interfaces:**
- Produces (types.ts):
  - `type VenueId = 'east' | 'westNew' | 'boxLunch'` (식당 서비스 단위), `type DiningHallId = 'east' | 'westNew'` (대기열 대상)
  - `type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'lateNight' | 'mobile'`
  - `type DayKind = 'weekday' | 'saturday' | 'sundayOrHoliday'`
  - `interface ServiceWindow { venue: VenueId; meal: MealKey; days: DayKind[]; start: string /*HH:MM*/; end: string /*HH:MM, start보다 작으면 다음날*/; displayNote?: string }`
  - `type ServiceStatus = { kind: 'open'; opensAt: Date; closesAt: Date; minutesLeft: number } | { kind: 'before'; opensAt: Date; minutesUntil: number } | { kind: 'ended' } | { kind: 'notToday' }`
  - `interface Venue { id: VenueId; name: string; short: '동'|'서'|'도'; building: string; floor: string; location: 'official'|'estimated'; directions: string; map: { x: number; y: number } }`
- Produces (hours.ts): `dayKind(d: Date): DayKind`, `getServiceStatus(venue: VenueId, meal: MealKey, at: Date): ServiceStatus`, `getActiveMeal(venue: VenueId, at: Date): MealKey | null`, `getNextService(venue: VenueId, at: Date): { meal: MealKey; opensAt: Date } | null` (48시간 안에서 탐색).
- Produces (restaurants.ts): `VENUES: Record<VenueId, Venue>`, `SERVICE_WINDOWS: ServiceWindow[]`, `TAKEOUT_HOURS` (표시용 텍스트), `HOLIDAYS: string[]` (YYYY-MM-DD).

데이터 값(스펙·메뉴표 그대로):

| venue | meal | days | 시간 | displayNote |
|---|---|---|---|---|
| east | breakfast | 전체 | 06:00–09:00 | 조식 A·B |
| east | lunch | weekday, saturday | 11:00–15:00 | |
| east | lunch | sundayOrHoliday | 11:00–14:00 | |
| east | dinner | 전체 | 17:30–20:30 | A 17:30–19:40, B 17:30–품절 시 |
| east | mobile | 전체 | 21:30–22:30 | 이동식 |
| east | lateNight | 전체 | 23:30–01:00 | |
| westNew | lunch | weekday | 11:00–14:00 | 주말·공휴일 운영하지 않음 |
| boxLunch | lunch | weekday | 11:00–13:00 | 간편식 도시락 수령 |

`TAKEOUT_HOURS`: 동관 매일 06:00–19:40 / 서관·신관 평일 조식 07:00–08:30, 중식 11:00–14:00.
`HOLIDAYS`: `['2026-10-03','2026-10-05','2026-10-09','2026-12-25']` (10/5는 개천절 대체공휴일).
`VENUES`: east = 동관 B1F, `official`, "동관 지하 1층, 보호자식당과 같은 공간". westNew = 서관 B1F, `estimated`, "서관·신관 연결 통로 쪽(추정)". boxLunch = 동관 B1F 직원식당 앞, `estimated`.

- [ ] **Step 1: 실패하는 테스트**

```ts
const t = (s: string) => new Date(`${s}+09:00`)
it('east lunch open at Wed 12:20', () => expect(getServiceStatus('east','lunch',t('2026-10-14T12:20'))).toMatchObject({kind:'open', minutesLeft: 160}))
it('late night spans midnight', () => expect(getServiceStatus('east','lateNight',t('2026-10-15T00:30')).kind).toBe('open'))
it('westNew lunch not served on Saturday', () => expect(getServiceStatus('westNew','lunch',t('2026-10-17T12:00')).kind).toBe('notToday'))
it('weekday holiday: westNew closed, east until 14:00', () => {
  expect(getServiceStatus('westNew','lunch',t('2026-10-09T12:00')).kind).toBe('notToday')
  expect(getServiceStatus('east','lunch',t('2026-10-09T14:30')).kind).toBe('ended')
})
it('before opening reports minutes until', () => expect(getServiceStatus('east','lunch',t('2026-10-14T10:30'))).toMatchObject({kind:'before', minutesUntil:30}))
it('active meal at 15:30 is null; next is dinner 17:30', () => {
  expect(getActiveMeal('east', t('2026-10-14T15:30'))).toBeNull()
  expect(getNextService('east', t('2026-10-14T15:30'))).toMatchObject({meal:'dinner'})
})
it('dayKind', () => { expect(dayKind(t('2026-10-18T09:00'))).toBe('sundayOrHoliday'); expect(dayKind(t('2026-10-17T09:00'))).toBe('saturday') })
```

- [ ] **Step 2:** `npm test -- hours` → FAIL.
- [ ] **Step 3:** 구현. 시각은 모두 Asia/Seoul 기준으로 해석(`Intl.DateTimeFormat`으로 서울 날짜·시분 추출하는 내부 헬퍼). 자정 넘김 창은 "전날 시작" 창도 함께 검사한다. 판정 날짜(`days`)는 창이 **시작한** 날의 DayKind.
- [ ] **Step 4:** `npm test -- hours` → PASS.
- [ ] **Step 5: Commit** — `feat(app): 식당 데이터와 운영시간 판정`

---

### Task 3: 메뉴 데이터와 요일 매핑

**Files:**
- Create: `app/src/data/menus/week-2026-10-12.ts`, `app/src/data/menus/box-lunch-reservation.ts`, `app/src/lib/menu.ts`
- Test: `app/src/lib/menu.test.ts`

**Interfaces:**
- Consumes: `VenueId`, `MealKey` (Task 2)
- Produces (types.ts에 추가):
  - `type Allergen = 'egg'|'milk'|'wheat'|'soy'|'peanut'|'shellfish'|'fish'|'pork'|'beef'|'chicken'`
  - `interface MenuItem { name: string; popularity?: number /*기본 1.0*/; allergens?: Allergen[]; kcal?: number }` (allergens·kcal은 화면에서 "예시")
  - `interface Course { label?: string /*'A'|'B'|'라이브코너(서관)'*/; items: MenuItem[] }`
  - `interface DayMenu { date: string; meals: Partial<Record<VenueId, Partial<Record<MealKey, Course[]>>>>; takeout: TakeoutDay }`
  - `type ZoneId = 'green'|'orange'|'purple'`; `interface TakeoutZone { zone: ZoneId; name: string /*'그린존'*/; pick: 2|3|4; groups: { label: string; items: string[]; eastOnly?: boolean }[] }`; `interface TakeoutDay { zones: TakeoutZone[] }`
- Produces (menu.ts): `MENU_WEEK_LABEL = '10월 3주차 메뉴 기준'`, `getMenuForDate(at: Date): DayMenu` (서울 기준 요일 → 저장 주의 같은 요일), `getCourses(at: Date, venue: VenueId, meal: MealKey): Course[]`, `dayPopularity(at: Date, venue: VenueId, meal: MealKey): number` (첫 코스 첫 품목(주메뉴)의 popularity, 지정 없으면 1.0, 메뉴 없으면 1.0), `summary(courses: Course[], n = 2): string` (앞 n개 품목명을 ", "로).

데이터 옮기기:
- 출처: `reference/주간직원식당메뉴.png`, `reference/주간직원식당테이크아웃메뉴.png`, `reference/도시락메뉴.png`. 텍스트 추출 보조: 스크래치 디렉터리에서 `pdfjs-dist@4.10.38`로 `reference/*.pdf` 텍스트를 뽑아 대조한다(이미지와 동일 주차).
- 동관 중식 → `east.lunch`, 서·신관 중식 → `westNew.lunch`(토·일은 `label: '라이브코너(서관)'`), 조식 A/B → `east.breakfast` 두 코스, 석식 A/B → `east.dinner`(한 칸으로 합쳐진 날은 코스 하나), 야식 → `east.lateNight`, 이동식 A/B → `east.mobile`, 간편식 도시락 A/B → `boxLunch.lunch`(주말 없음).
- 인기도(모의): 고기·튀김·면 요리 주메뉴 1.2, 국·찌개 주메뉴 1.0, 나머지 생략. 10/14 동관 "꽈리고추간장닭갈비"는 1.25, 서·신관 "투움바파스타"는 1.05로 고정(홈 시연 기준점).
- 알레르기·칼로리: 각 날 중식 주메뉴에만 상식적 예시값.
- 테이크아웃: 그린존(2PICK)·오렌지존(3PICK)·퍼플존(4PICK), 그룹 라벨과 품목은 원본 그대로, "(동관 전용)"은 `eastOnly: true`.
- `box-lunch-reservation.ts`: `export const BOX_LUNCH_RESERVATION: { date: string; a: { name: string; kcal?: number }; b: { name: string; kcal?: number } }[]` 와 `export const BOX_LUNCH_NOTICE: string`. 10/19–23 한식(A)·샐러드(B) 이름과 kcal(원본 값, 빈칸은 생략), 안내문 "AMIS3.0 도시락신청, 월 08:30 ~ 목 17:30, 하루 500개 한정".

- [ ] **Step 1: 실패하는 테스트**

```ts
it('maps any Wednesday to the stored Wednesday', () => {
  expect(getCourses(t('2026-11-04T12:00'),'east','lunch')[0].items[0].name).toBe('꽈리고추간장닭갈비')
  expect(getCourses(t('2026-10-14T12:00'),'westNew','lunch')[0].items[0].name).toBe('투움바파스타')
})
it('east lunch is more popular than westNew on Wednesday', () =>
  expect(dayPopularity(t('2026-10-14T12:00'),'east','lunch')).toBeGreaterThan(dayPopularity(t('2026-10-14T12:00'),'westNew','lunch')))
it('no box lunch on Sunday', () => expect(getCourses(t('2026-10-18T12:00'),'boxLunch','lunch')).toEqual([]))
it('takeout has three zones with picks 2,3,4', () =>
  expect(getMenuForDate(t('2026-10-14T12:00')).takeout.zones.map(z => z.pick)).toEqual([2,3,4]))
it('summary joins first two items', () => expect(summary(getCourses(t('2026-10-14T12:00'),'east','lunch'))).toBe('꽈리고추간장닭갈비, 순두부찌개'))
```

- [ ] **Step 2:** FAIL 확인 → **Step 3:** 데이터·함수 구현 → **Step 4:** PASS 확인.
- [ ] **Step 5: Commit** — `feat(app): 10월 3주차 메뉴 데이터와 요일 매핑`

---

### Task 4: 시뮬레이션 시계

**Files:**
- Create: `app/src/lib/clock.ts`, `app/src/providers/clock.tsx`, `app/src/hooks/useClock.ts`
- Test: `app/src/lib/clock.test.ts`

**Interfaces:**
- Produces: `createClock(realNow: () => number = Date.now): Clock` where `interface Clock { now(): Date; isDemo(): boolean; setDemo(at: Date | null): void; subscribe(fn: () => void): () => void; tick(): void }`. 데모 시각은 고정이 아니라 **설정 시점부터 실제 시간만큼 흐른다**(오프셋 방식). `ClockProvider`는 30초 간격 `tick()`. `useClock(): { now: Date; isDemo: boolean; setDemo(at: Date | null): void }`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('returns real time by default', () => { let r = 1000; const c = createClock(() => r); expect(c.now().getTime()).toBe(1000) })
it('demo time advances with real time', () => {
  let r = 0; const c = createClock(() => r)
  c.setDemo(new Date('2026-10-14T12:20:00+09:00')); r += 60_000
  expect(c.now().toISOString()).toBe('2026-10-14T03:21:00.000Z'); expect(c.isDemo()).toBe(true)
})
it('setDemo(null) returns to real time and notifies', () => { const fn = vi.fn(); /* subscribe, setDemo(null) */ expect(fn).toHaveBeenCalled() })
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현(Provider는 `useSyncExternalStore`) → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 시뮬레이션 시계`

---

### Task 5: 대기열 모델과 검수 직원 입력

**Files:**
- Create: `app/src/lib/queue.ts`, `app/src/lib/override.ts`, `app/src/hooks/useVenueStatus.ts`
- Test: `app/src/lib/queue.test.ts`, `app/src/lib/override.test.ts`

**Interfaces:**
- Consumes: `getServiceStatus`, `getActiveMeal` (Task 2), `dayPopularity` (Task 3), `storage` (Task 1)
- Produces (queue.ts):
  - `type CongestionLevel = 'ok' | 'mid' | 'queue' | 'busy'`; `LEVEL_LABEL: Record<CongestionLevel, string>` = 여유/보통/줄 있음/혼잡
  - `levelForWait(minutes: number): CongestionLevel`
  - `simulateQueue(hall: DiningHallId, meal: MealKey, at: Date, popularity: number): { waitingPeople: number; waitMinutes: number; level: CongestionLevel }` — 해당 끼니가 `open`이 아니면 0/0/'ok'
- Produces (override.ts):
  - `type OverrideKind = 'queue' | 'clear'`; `interface Override { hall: DiningHallId; kind: OverrideKind; at: number }`; `interface SoldOut { hall: DiningHallId; meal: MealKey; course?: string; date: string }`
  - `setOverride(hall, kind, at: Date): void`, `getActiveOverride(hall, at: Date): Override | null` (15분 유효), `setSoldOut(s: SoldOut, on: boolean): void`, `isSoldOut(hall, meal, course: string|undefined, at: Date): boolean`, `subscribeOverrides(fn: () => void): () => void` (`BroadcastChannel('babttae')` + `storage` 이벤트)
- Produces (hook): `useVenueStatus(hall: DiningHallId): { meal: MealKey | null; status: ServiceStatus | null; waitMinutes: number; level: CongestionLevel; source: 'model' | 'staff' }` — 직원 입력이 있으면 `queue`→ level `'queue'`, waitMinutes = max(모델, 5); `clear`→ `'ok'`, 0.

모델 값(코드 상수로 고정):

| hall·meal | peak | σ(분) | 기본 도착/분 | 처리/분 |
|---|---|---|---|---|
| east·breakfast | 07:30 | 35 | 7 | 12 |
| east·lunch | 12:10 | 28 | 18 | 14 |
| east·dinner | 18:10 | 25 | 10 | 12 |
| east·lateNight | 23:50 | 15 | 5 | 10 |
| westNew·lunch | 12:00 | 25 | 11 | 12 |

알고리즘(결정적):
```
q = 0
for m in [windowStart, at) 1분 간격:
  arrivals = base * popularity * exp(-((m - peak)^2) / (2σ^2)) * (0.9 + 0.2 * rand(seed(hall, 서울날짜, m)))
  q = max(0, q + arrivals - service)
waitMinutes = round(q / service, 1)
```
`rand`는 mulberry32, 시드는 문자열 FNV-1a 해시. 표에 없는 조합(mobile 등)은 대기 0.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('level boundaries', () => { expect(levelForWait(1.99)).toBe('ok'); expect(levelForWait(2)).toBe('mid'); expect(levelForWait(5)).toBe('queue'); expect(levelForWait(10)).toBe('busy') })
it('is deterministic', () => expect(simulateQueue('east','lunch',t('2026-10-14T12:20'),1.25)).toEqual(simulateQueue('east','lunch',t('2026-10-14T12:20'),1.25)))
it('Wednesday 12:20: east queues, westNew is light', () => {
  const e = simulateQueue('east','lunch',t('2026-10-14T12:20'),1.25), w = simulateQueue('westNew','lunch',t('2026-10-14T12:20'),1.05)
  expect(['queue','busy']).toContain(e.level); expect(['ok','mid']).toContain(w.level); expect(e.waitMinutes).toBeGreaterThan(w.waitMinutes)
})
it('zero when closed', () => expect(simulateQueue('east','lunch',t('2026-10-14T16:00'),1.25).waitMinutes).toBe(0))
// override.test.ts
it('override expires after 15 minutes', () => {
  setOverride('east','queue',t('2026-10-14T12:00'))
  expect(getActiveOverride('east',t('2026-10-14T12:14'))?.kind).toBe('queue'); expect(getActiveOverride('east',t('2026-10-14T12:15'))).toBeNull()
})
it('sold out is per date', () => { setSoldOut({hall:'east',meal:'dinner',course:'B',date:'2026-10-14'}, true); expect(isSoldOut('east','dinner','B',t('2026-10-15T18:00'))).toBe(false) })
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현. 보정이 필요하면 표의 상수를 바꾸지 말고 Task 3의 인기도 고정값 범위 안에서만 확인 — 테스트가 통과하지 않으면 멈추고 보고.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 대기열 모델과 검수 직원 입력 동기화`

---

### Task 6: 예측 곡선, 추천 시각, 홈 문장

**Files:**
- Create: `app/src/lib/recommend.ts`
- Test: `app/src/lib/recommend.test.ts`

**Interfaces:**
- Consumes: `simulateQueue`, `getServiceStatus`, `getActiveMeal`, `getNextService`, `dayPopularity`, `getActiveOverride`
- Produces:
  - `forecast(hall: DiningHallId, meal: MealKey, at: Date, stepMin = 10): { time: Date; waitMinutes: number; isNow: boolean }[]` — 그 끼니 배식 창 전체를 stepMin 간격으로, `at`이 속한 칸에 `isNow`
  - `recommendTime(hall, meal, at: Date): Date | null` — `at` 이후 마감 전, 예상 대기 < 3분인 가장 이른 시각(5분 간격 탐색), 지금이 이미 < 3분이면 `at`
  - `homeHeadline(at: Date): { title: string; detail: string | null; tiles: ('동'|'서'|'신')[] }`

문구 규칙(정확히):
- 열린 식당 중 대기 최소가 2분 미만: title `지금은 {이름}이 바로 드실 수 있어요` (이름: east "동관", westNew "서관·신관"; tiles 동 / 서,신)
- 최소가 2분 이상: `지금은 {이름}이 가장 빨라요, 약 {n}분 기다려요`
- 다른 식당이 대기 3분 이상이고 `recommendTime`이 있으면 detail `{이름}은 {H}시 {M}분부터 한산해질 것으로 보여요` (M=0이면 `{H}시부터`)
- 열린 직원식당이 하나뿐인 주말·공휴일: detail `주말과 공휴일에는 동관만 운영해요`
- 배식 중인 직원식당이 없음: title `다음 배식은 {끼니} {HH:MM}부터예요` (끼니: 조식/중식/석식/야식/이동식), detail = 그 끼니 동관 메뉴 `summary`, tiles ['동']

- [ ] **Step 1: 실패하는 테스트**

```ts
it('Wednesday 12:20 headline', () => {
  const h = homeHeadline(t('2026-10-14T12:20'))
  expect(h.title).toBe('지금은 서관·신관이 바로 드실 수 있어요'); expect(h.detail).toMatch(/^동관은 \d+시( \d+분)?부터 한산해질 것으로 보여요$/); expect(h.tiles).toEqual(['서','신'])
})
it('15:30 shows next service', () => expect(homeHeadline(t('2026-10-14T15:30')).title).toBe('다음 배식은 석식 17:30부터예요'))
it('03:00 shows breakfast', () => expect(homeHeadline(t('2026-10-15T03:00')).title).toBe('다음 배식은 조식 06:00부터예요'))
it('Saturday lunch mentions east only', () => expect(homeHeadline(t('2026-10-17T12:20')).detail).toBe('주말과 공휴일에는 동관만 운영해요'))
it('recommendTime is before closing and under 3 min', () => {
  const r = recommendTime('east','lunch',t('2026-10-14T12:20'))!
  expect(r.getTime()).toBeLessThan(t('2026-10-14T15:00').getTime())
})
it('forecast marks exactly one now bucket', () => expect(forecast('east','lunch',t('2026-10-14T12:20')).filter(p => p.isNow)).toHaveLength(1))
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 혼잡 예측과 추천 문장`

---

### Task 7: 개인 설정과 알림 규칙

**Files:**
- Create: `app/src/lib/prefs.ts`, `app/src/lib/alerts.ts`, `app/src/hooks/usePrefs.ts`, `app/src/hooks/useAlertsEngine.ts`
- Test: `app/src/lib/prefs.test.ts`, `app/src/lib/alerts.test.ts`

**Interfaces:**
- Consumes: `storage`, `useClock`, `useVenueStatus`, `getCourses`, `getServiceStatus`
- Produces (prefs.ts): `interface Subscriptions { queueCleared: DiningHallId[]; favoriteDay: boolean; boxLunchDeadline: boolean; closingSoon: boolean }` (기본: 모두 꺼짐/빈 배열), `interface Rating { stars: 1|2|3|4|5; leftover: 'none'|'some'|'much' }`, `getFavorites(): string[]`, `toggleFavorite(name: string): void`, `getSubscriptions(): Subscriptions`, `setSubscriptions(s: Subscriptions): void`, `rateMeal(key: string /*`${date}:${venue}:${meal}`*/, r: Rating): void`, `getRating(key): Rating | null`, `mockRating(itemName: string): { avg: number; count: number }` (이름 해시로 3.8–4.8, 40–240건, 결정적)
- Produces (alerts.ts):
  - `type AlertKind = 'queueCleared' | 'favoriteDay' | 'boxLunchDeadline' | 'closingSoon'`; `interface AppAlert { key: string; kind: AlertKind; title: string; body: string }`
  - `interface AlertSnapshot { at: Date; levels: Record<DiningHallId, CongestionLevel> }`
  - `evaluateAlerts(prev: AlertSnapshot | null, next: AlertSnapshot, subs: Subscriptions, favorites: string[], sent: ReadonlySet<string>): AppAlert[]` (순수 함수)
  - `deliverAlert(a: AppAlert, deps = { Notification: globalThis.Notification, toast }): 'system' | 'toast'` — `Notification.permission === 'granted'`이면 시스템 알림, 아니면 토스트
  - `requestPermission(): Promise<'granted'|'denied'|'unsupported'>`

규칙과 중복 방지 키(`sent`는 `storage`의 `babttae.alerts.sent`, 날짜 지난 키는 정리):
- queueCleared: 구독한 식당의 level이 prev `queue|busy` → next `ok|mid`. 키 `queueCleared:{hall}:{date}:{HH}`. 제목 `{이름} 대기가 줄었어요`, 본문 `지금 가면 바로 드실 수 있어요`.
- favoriteDay: 오늘 어떤 코스 품목명이 즐겨찾기 문자열을 포함, 10:30 이후 첫 평가 → 키 `favoriteDay:{date}`; 내일 메뉴에 포함, 18:00 이후 → 키 `favoriteDay:eve:{date}`. 제목 `즐겨찾는 메뉴가 나와요`, 본문 `{오늘|내일} {식당} {끼니}: {품목}`.
- boxLunchDeadline: 목요일 16:30 이후 17:30 전 → 키 `boxLunchDeadline:{date}`. 제목 `도시락 예약이 오늘 17:30에 마감돼요`, 본문 `다음 주 도시락은 AMIS3.0에서 신청할 수 있어요`.
- closingSoon: 열린 직원식당 끼니의 `minutesLeft <= 30` → 키 `closingSoon:{hall}:{date}:{meal}`. 제목 `{이름} {끼니} 배식이 30분 남았어요`.

- [ ] **Step 1: 실패하는 테스트**

```ts
const snap = (s: string, east: CongestionLevel, westNew: CongestionLevel = 'ok') => ({ at: t(s), levels: { east, westNew } })
const subs = { queueCleared: ['east'], favoriteDay: true, boxLunchDeadline: true, closingSoon: true } as Subscriptions
it('fires queueCleared once', () => {
  const a = evaluateAlerts(snap('2026-10-14T12:40','busy'), snap('2026-10-14T12:41','ok'), subs, [], new Set())
  expect(a.map(x => x.kind)).toContain('queueCleared')
  expect(evaluateAlerts(snap('2026-10-14T12:40','busy'), snap('2026-10-14T12:41','ok'), subs, [], new Set(a.map(x => x.key))).filter(x => x.kind==='queueCleared')).toHaveLength(0)
})
it('favoriteDay at 10:30 when favorite appears', () => expect(evaluateAlerts(null, snap('2026-10-14T10:31','ok'), subs, ['닭갈비'], new Set()).some(x => x.kind==='favoriteDay')).toBe(true))
it('boxLunchDeadline only Thursday 16:30–17:30', () => {
  expect(evaluateAlerts(null, snap('2026-10-15T16:45','ok'), subs, [], new Set()).some(x => x.kind==='boxLunchDeadline')).toBe(true)
  expect(evaluateAlerts(null, snap('2026-10-14T16:45','ok'), subs, [], new Set()).some(x => x.kind==='boxLunchDeadline')).toBe(false)
})
it('closingSoon for westNew at 13:35', () => expect(evaluateAlerts(null, snap('2026-10-14T13:35','ok'), subs, [], new Set()).some(x => x.key.startsWith('closingSoon:westNew'))).toBe(true))
it('delivers as toast when permission denied or unsupported', () => {
  const alert: AppAlert = { key: 'k', kind: 'closingSoon', title: 't', body: 'b' }
  const toast = { add: vi.fn() }
  expect(deliverAlert(alert, { Notification: { permission: 'denied' } as any, toast })).toBe('toast')
  expect(deliverAlert(alert, { Notification: undefined as any, toast })).toBe('toast'); expect(toast.add).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현. `useAlertsEngine`은 시계 변경마다 이전 스냅샷과 비교해 `evaluateAlerts` → `deliverAlert` → `sent` 갱신(App 루트에서 한 번 마운트).
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 개인 설정과 알림 규칙`

---

### Task 8: 앱 셸, 탭 이동, 시연 시간 조절, E2E 기반

**Files:**
- Create: `app/src/App.tsx`(라우터), `app/src/components/layout/{AppShell,TabBar,Header,DemoTimeSheet}.tsx`, `app/src/pages/{Home,Menu,Map,Alerts,Staff}.tsx`(빈 페이지 자리), `app/vercel.json`, `app/playwright.config.ts`, `app/e2e/shell.spec.ts`
- Test: `app/e2e/shell.spec.ts`

**Interfaces:**
- Consumes: `ThemeProvider/useTheme`, `ClockProvider/useClock`, `useAlertsEngine`
- Produces: 라우트 `/`(지금), `/menu`, `/map`, `/alerts`, `/staff`(탭에 없음). `AppShell`은 모바일에서 하단 `TabBar`(지금·메뉴·지도·알림), 768px 이상에서 머리글 안 가로 내비. `Header`: 서비스 이름 "아산 밥때", 서울 기준 `{요일} {HH:MM}`, 테마 전환(`ToggleGroup`: 라이트/다크/시스템, 아이콘+sr-only 라벨), 시연 시간 버튼 → `DemoTimeSheet`(`Sheet` + 요일 `ToggleGroup` 월~일 + 시각 `Slider` 05:00–25:00 5분 단위 + "실시간으로 돌아가기" 버튼). 시연 중이면 머리글 시각 옆에 "시연 중" 글자.
- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`

- [ ] **Step 1:** `npm i react-router@7`, `npm i -D @playwright/test@1.64.0`, `npx playwright install chromium`. `playwright.config.ts`: webServer `npm run dev -- --port 5199`, projects `mobile`(390×844)·`desktop`(1280×800). `package.json`에 `"e2e": "playwright test"`.
- [ ] **Step 2: 실패하는 E2E**

```ts
test('tabs navigate', async ({ page }) => {
  await page.goto('/'); for (const [label, path] of [['메뉴','/menu'],['지도','/map'],['알림','/alerts'],['지금','/']]) {
    await page.getByRole('link', { name: label }).click(); await expect(page).toHaveURL(path) }
})
test('dark mode toggles html class', async ({ page }) => { await page.goto('/'); await page.getByRole('radio', { name: '다크' }).click(); await expect(page.locator('html')).toHaveClass(/dark/) })
test('demo time sets clock label', async ({ page }) => { /* 시연 시간 열기 → 수요일, 12:20 → 머리글에 "수요일 12:20"와 "시연 중" */ })
test('no horizontal overflow on mobile', async ({ page }) => { await page.goto('/'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true) })
```

- [ ] **Step 3:** `npm run e2e` → FAIL → **Step 4:** 구현(각 컴포넌트 전에 `npx shadcn@latest docs sheet slider toggle-group` 확인; Base UI는 `render` prop) → **Step 5:** PASS.
- [ ] **Step 6: Commit** — `feat(app): 앱 셸, 탭, 테마, 시연 시간 조절`

---

### Task 9: 지금(홈) 화면

**Files:**
- Create: `app/src/components/common/{BuildingTile,StatusText,ServiceStrip,ForecastBars}.tsx`, `app/src/pages/Home.tsx`
- Test: `app/src/pages/Home.test.tsx`

**Interfaces:**
- Consumes: `homeHeadline`, `forecast`, `useVenueStatus`, `useClock`, `getCourses`, `summary`, `getServiceStatus`, `VENUES`
- Produces: `BuildingTile({ glyph: '동'|'서'|'신'|'도'; tone?: 'solid'|'soft' })`, `StatusText({ level: CongestionLevel; waitMinutes: number })`(오른쪽 정렬 두 줄: 라벨 / "약 n분" 또는 "대기 없음"; 색 `text-status-*`), `ServiceStrip({ meal; status })`(배식 막대 + `bg-brand-orange` 지금 선), `ForecastBars({ points })`

각 식당 행은 `<li aria-label="{식당 이름}">`(예: "동관 직원식당", "서관·신관 직원식당", "간편식 도시락")이고 목록은 `<ul>`. 구성(스펙 3.2-1 그대로): `bg-deep` 상단 영역(서비스 이름·시각은 Header가 담당하므로 홈은 타일+title+detail만) → `rounded-t-3xl bg-card -mt-[18px]` 시트 → `ServiceStrip` → 행 목록(동관, 서관·신관, 간편식 도시락; `Separator`로 구분, 카드 금지). 붐비는(`queue|busy`) 직원식당 행에만 `ForecastBars`(10분 칸, 지난 칸·현재 칸은 primary, 현재 칸은 brand-orange, 이후는 accent; `dataviz` 스킬 확인 후 shadcn `Chart` 또는 단순 SVG 중 dataviz 권고를 따름). 시트 하단에 작은 글자 "모의 데이터 기반 예측 시연". 데스크톱(≥1024px): 상단 영역을 왼쪽 열(sticky), 시트를 오른쪽 열로.

- [ ] **Step 1: 실패하는 테스트** (ClockProvider에 데모 시각 주입하는 테스트 래퍼 사용)

```tsx
it('shows headline and statuses at Wed 12:20', () => {
  renderAt('2026-10-14T12:20', <Home />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('지금은 서관·신관이 바로 드실 수 있어요')
  expect(within(screen.getByRole('listitem', { name: /동관 직원식당/ })).getByText(/줄 있음|혼잡/)).toBeInTheDocument()
  expect(screen.getByText('꽈리고추간장닭갈비, 순두부찌개')).toBeInTheDocument()
})
it('outside service hours shows next service and no empty list', () => {
  renderAt('2026-10-14T15:30', <Home />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('다음 배식은 석식 17:30부터예요')
})
it('labels prediction as simulation', () => { renderAt('2026-10-14T12:20', <Home />); expect(screen.getByText('모의 데이터 기반 예측 시연')).toBeInTheDocument() })
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS. 개발 서버에서 390px·1280px, 라이트·다크 스크린샷을 찍어 스펙 3.6 금지 목록과 대조하고 고친다.
- [ ] **Step 5: Commit** — `feat(app): 지금 화면`

---

### Task 10: 메뉴 화면

**Files:**
- Create: `app/src/pages/Menu.tsx`, `app/src/components/menu/{HallCompare,TakeoutZones,BoxLunch,MenuItemRow}.tsx`
- Test: `app/src/pages/Menu.test.tsx`

**Interfaces:**
- Consumes: `getMenuForDate`, `getCourses`, `MENU_WEEK_LABEL`, `isSoldOut`, `getFavorites/toggleFavorite`, `mockRating`, `BOX_LUNCH_RESERVATION`(Task 3 box-lunch-reservation.ts의 export 이름), `useClock`
- Produces: 화면만.

구성: 상단 `Tabs`(식당 / 테이크아웃 / 도시락) + 이번 주 날짜 `ToggleGroup`(월~일, 기본 오늘) + 끼니 `ToggleGroup`(조식/중식/석식/야식/이동식, 기본 현재 또는 다음 끼니).
- 식당·중식: `HallCompare` 두 열(동관 / 서관·신관). 품목 행 `MenuItemRow`: 이름, 즐겨찾기 토글 버튼(하트 아이콘, `aria-pressed`, 라벨 "즐겨찾기"), 주메뉴 아래 "알레르기 예시: …, 약 n kcal 예시", 첫 코스 아래 `★ {avg} ({count})`. 서관·신관 메뉴 없는 날: `Empty` "주말과 공휴일에는 서관·신관 식당을 운영하지 않아요" + 버튼 "동관 메뉴 보기"(동관 열로 스크롤/포커스). 토·일 라이브코너 코스는 라벨 "라이브코너(서관)"과 함께 표시.
- 품절: `isSoldOut`이면 코스 제목 옆 "품절" 글자(status-busy 색).
- 테이크아웃: `TakeoutZones` — 존마다 `bg-zone-{z}-bg text-zone-{z}-fg` 머리(이름 + "{pick}가지 골라 담기"), 그룹 라벨과 품목, `eastOnly` 그룹에 "동관 전용". 아래 운영시간(`TAKEOUT_HOURS`).
- 도시락: 오늘 간편식 도시락 A/B, "오늘 남은 수량 {n}개"(n = 500 − 시각 기반 결정적 감소, 13:00 이후 "수령 마감"), 다음 주 예약 메뉴 표(10/19–23), 버튼 "AMIS3.0에서 예약하기" → 클릭 시 토스트 "AMIS3.0은 병원 내부망에서 열 수 있어요", 버튼 "마감 알림 받기" → `boxLunchDeadline` 구독 켜기 + 토스트 "도시락 마감 알림을 켰어요".
- 상단에 작은 글자 `MENU_WEEK_LABEL`.

- [ ] **Step 1: 실패하는 테스트**

```tsx
it('compares halls at Wednesday lunch', () => { renderAt('2026-10-14T12:20', <Menu />); expect(screen.getByText('꽈리고추간장닭갈비')).toBeVisible(); expect(screen.getByText('투움바파스타')).toBeVisible() })
it('saturday shows live corner label for westNew', async () => { renderAt('2026-10-17T12:20', <Menu />); expect(screen.getByText('라이브코너(서관)')).toBeInTheDocument() })
it('holiday shows empty state for westNew', () => { renderAt('2026-10-09T12:00', <Menu />); expect(screen.getByText('주말과 공휴일에는 서관·신관 식당을 운영하지 않아요')).toBeInTheDocument() })
it('favorite toggles and persists', async () => { /* 하트 클릭 → aria-pressed true, getFavorites() contains '꽈리고추간장닭갈비' */ })
it('takeout shows three zones with pick counts', async () => { /* 테이크아웃 탭 → '그린존','2가지 골라 담기','오렌지존','3가지 골라 담기','퍼플존','4가지 골라 담기' */ })
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현(`npx shadcn@latest docs tabs toggle-group empty` 확인) → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 메뉴 화면`

---

### Task 11: 지도·운영시간 화면

**Files:**
- Create: `app/src/pages/Map.tsx`, `app/src/components/map/CampusMap.tsx`, `app/src/components/map/HoursTable.tsx`
- Test: `app/src/pages/Map.test.tsx`

**Interfaces:**
- Consumes: `VENUES`, `SERVICE_WINDOWS`, `TAKEOUT_HOURS`, `getServiceStatus`, `useClock`, `BuildingTile`
- Produces: `CampusMap({ selected: VenueId | null; onSelect(id: VenueId): void })`

구성: `CampusMap`은 인라인 SVG 모식도(viewBox 0 0 360 220). 건물 사각형 서관·신관·동관·별관을 사인물 톤(테두리 primary, 이름 글자)으로, 실제 배치를 단순화해 서관–신관이 서쪽, 동관이 동쪽, 별관이 남쪽. `VENUES[*].map` 좌표에 핀(버튼, `aria-label="{식당 이름} 위치"`). `artifact-diagramming`이 아닌 일반 SVG지만 다크 모드에서 토큰 색만 사용. 핀 선택 시 아래에 건물·층·찾아가는 법, `estimated`면 "추정 위치예요. 현장 안내와 다를 수 있어요". `HoursTable`: 식당마다 `<table>` 하나(`<caption>{식당 이름} 운영시간</caption>`), `SERVICE_WINDOWS`를 끼니별 행·(평일/토/일·공휴일) 열로, `displayNote` 반영, 현재 열린 행은 굵게 + "운영 중".

- [ ] **Step 1: 실패하는 테스트**

```tsx
it('selecting westNew pin shows estimated notice', async () => { renderAt('2026-10-14T12:20', <MapPage />); await user.click(screen.getByRole('button', { name: '서관·신관 직원식당 위치' })); expect(screen.getByText('추정 위치예요. 현장 안내와 다를 수 있어요')).toBeInTheDocument() })
it('hours table lists east lunch weekday and holiday hours', () => { renderAt('2026-10-14T12:20', <MapPage />); const east = within(screen.getByRole('table', { name: '동관 직원식당 운영시간' })); expect(east.getAllByText('11:00–15:00').length).toBeGreaterThan(0); expect(east.getByText('11:00–14:00')).toBeInTheDocument() })
it('marks open row', () => { renderAt('2026-10-14T12:20', <MapPage />); expect(screen.getAllByText('운영 중').length).toBeGreaterThan(0) })
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현 → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 지도와 운영시간 화면`

---

### Task 12: 알림 화면과 만족도 입력

**Files:**
- Create: `app/src/pages/Alerts.tsx`
- Test: `app/src/pages/Alerts.test.tsx`

**Interfaces:**
- Consumes: `getSubscriptions/setSubscriptions`, `requestPermission`, `rateMeal/getRating`, `useClock`, `getActiveMeal`
- Produces: 화면만.

구성: `FieldGroup` 안 `Field` + `Switch` 4종 — "동관 대기가 줄면 알려주기", "서관·신관 대기가 줄면 알려주기", "즐겨찾는 메뉴가 나오는 날"(설명: 전날 18:00, 당일 10:30), "도시락 예약 마감 전"(설명: 목요일 16:30), "배식 마감 30분 전". 스위치를 처음 켤 때 `requestPermission()`; 거부·미지원이면 `Alert`로 "브라우저 알림이 꺼져 있어 앱 안에서만 알려드려요. 브라우저 설정 > 사이트 권한 > 알림에서 허용할 수 있어요". 저장소가 비영속이면 "이 브라우저에서는 설정이 저장되지 않아요". 아래 "오늘 식사 어땠나요?": 가장 최근 끝난/진행 중 끼니 기준, 별 1–5 `ToggleGroup`, 남김 `ToggleGroup`(남김없이 먹었어요/조금 남겼어요/많이 남겼어요), 버튼 "평가 보내기" → 토스트 "평가를 보냈어요".

- [ ] **Step 1: 실패하는 테스트**

```tsx
it('switch persists subscription', async () => { render(<Alerts />); await user.click(screen.getByRole('switch', { name: '동관 대기가 줄면 알려주기' })); expect(getSubscriptions().queueCleared).toContain('east') })
it('denied permission shows in-app notice', async () => { mockRequestPermission('denied'); /* 스위치 켜기 */ expect(await screen.findByText(/앱 안에서만 알려드려요/)).toBeInTheDocument() })
it('rating saves', async () => { /* 별 4, 조금 남겼어요, 평가 보내기 → getRating(key) toEqual({stars:4, leftover:'some'}) */ })
```

- [ ] **Step 2:** FAIL → **Step 3:** 구현(`npx shadcn@latest docs field switch alert`) → **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): 알림 구독과 만족도 입력`

---

### Task 13: 검수 직원 화면과 탭 간 반영

**Files:**
- Create: `app/src/pages/Staff.tsx`, `app/e2e/staff.spec.ts`
- Test: `app/e2e/staff.spec.ts`

**Interfaces:**
- Consumes: `setOverride/getActiveOverride`, `setSoldOut/isSoldOut`, `useClock`, `useVenueStatus`
- Produces: 화면만.

구성: 머리 "검수 직원 화면" + 설명 "입구 상황을 누르면 직원들 화면에 바로 반영돼요. 15분 동안 유지돼요". 식당 `ToggleGroup`(동관 / 서관·신관). 큰 버튼 두 개 "줄 있음"(누르면 `setOverride(hall,'queue')`), "여유"(`'clear'`) — 현재 유효한 입력은 `aria-pressed`와 "{HH:MM}에 입력, {n}분 남음". 동관 선택 시 끼니·코스별 품절 `Switch`(석식 B 등 현재 날짜 코스 목록).

- [ ] **Step 1: 실패하는 E2E**

```ts
test('staff input reflects on home in another tab', async ({ context }) => {
  const home = await context.newPage(); const staff = await context.newPage()
  await home.goto('/'); /* 시연 시간 수요일 12:20 설정은 두 탭 모두 같은 데모 시각을 쓰도록 URL 쿼리 ?at=2026-10-14T12:20 지원 */
  await staff.goto('/staff?at=2026-10-14T12:20'); await staff.getByRole('radio', { name: '서관·신관' }).click(); await staff.getByRole('button', { name: '줄 있음' }).click()
  await expect(home.getByRole('listitem', { name: /서관·신관 직원식당/ })).toContainText('줄 있음')
})
```

- [ ] **Step 2:** `?at=YYYY-MM-DDTHH:MM` 쿼리를 `ClockProvider` 초기화에 추가(서울 시각으로 해석, 이후 쿼리 제거 없이 유지). 테스트 FAIL 확인.
- [ ] **Step 3:** 구현 → **Step 4:** `npm run e2e` PASS.
- [ ] **Step 5: Commit** — `feat(app): 검수 직원 화면과 탭 간 동기화`

---

### Task 14: 마무리 검증과 배포

**Files:**
- Modify: 필요 시 각 화면, `app/index.html`(title "아산 밥때", `lang="ko"`, theme-color 메타 = deep 라이트/다크)
- Create: `app/README.md`(실행·테스트·시연 방법 5줄)

- [ ] **Step 1:** `design:accessibility-review` 관점으로 점검: 키보드 포커스 보임, 터치 대상 ≥ 44px, 아이콘 버튼 라벨, 색 대비(토큰은 검증됨, 새 조합만 확인).
- [ ] **Step 2:** `npm test && npm run e2e && npx tsc -p tsconfig.app.json --noEmit && npm run build` 모두 성공, 브라우저 콘솔 오류 0.
- [ ] **Step 3:** 390px·1280px × 라이트·다크 × 홈·메뉴·지도·알림·직원 스크린샷을 찍어 금지 목록(Global Constraints) 위반을 찾아 고친다. 오렌지가 허용된 곳 외에 쓰였는지 `grep -rn "brand-orange" app/src`로 확인.
- [ ] **Step 4: Commit** — `chore(app): 접근성·반응형 마무리`
- [ ] **Step 5: 배포 전 사용자 확인** — 외부 공개이므로 사용자에게 Vercel 배포 여부와 프로젝트 이름을 확인받는다. 승인 후 `vercel:deploy` 스킬로 `app/`을 프로덕션 배포하고 URL을 보고한다.
