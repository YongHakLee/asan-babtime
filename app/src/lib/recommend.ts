import { DINING_HALLS as HALLS, VENUES } from '@/data/restaurants'
import type { DiningHallId, MealKey, Venue } from '@/domain/types'
import { getActiveMeal, getNextService, getServiceStatus } from '@/lib/hours'
import { dayPopularity, getCourses, summary } from '@/lib/menu'
import { entryRemainingMs, getActiveEntry } from '@/lib/override'
import { simulateQueue } from '@/lib/queue'
import { effectiveWait } from '@/lib/status'

const MIN = 60_000
export const MEAL_LABEL: Record<MealKey, string> = {
  breakfast: '조식',
  lunch: '중식',
  dinner: '석식',
  lateNight: '야식',
  mobile: '이동식',
}

/** 그 끼니의 배식 창. 진행 중이거나 곧 시작하는 경우만. */
function windowOf(hall: DiningHallId, meal: MealKey, at: Date): { start: Date; end: Date } | null {
  const s = getServiceStatus(hall, meal, at)
  if (s.kind === 'open') return { start: s.opensAt, end: s.closesAt }
  if (s.kind === 'before') {
    const o = getServiceStatus(hall, meal, s.opensAt)
    return o.kind === 'open' ? { start: o.opensAt, end: o.closesAt } : null
  }
  return null
}

const waitAt = (hall: DiningHallId, meal: MealKey, day: Date, at: Date) =>
  simulateQueue(hall, meal, at, dayPopularity(day, hall, meal)).waitMinutes

/** 모델 예측만 반영한다(직원 입력 제외). 화면에서는 시뮬레이션으로 표기한다. */
export function forecast(
  hall: DiningHallId,
  meal: MealKey,
  at: Date,
  stepMin = 10,
): { time: Date; waitMinutes: number; isNow: boolean }[] {
  const w = windowOf(hall, meal, at)
  if (!w) return []
  const step = stepMin * MIN
  const nowIdx = Math.floor((at.getTime() - w.start.getTime()) / step)
  const out: { time: Date; waitMinutes: number; isNow: boolean }[] = []
  for (let i = 0; w.start.getTime() + i * step < w.end.getTime(); i++) {
    const time = new Date(w.start.getTime() + i * step)
    out.push({ time, waitMinutes: waitAt(hall, meal, w.start, time), isNow: i === nowIdx })
  }
  return out
}

export function recommendTime(hall: DiningHallId, meal: MealKey, at: Date): Date | null {
  const w = windowOf(hall, meal, at)
  if (!w) return null
  const e = getActiveEntry(hall)
  // 직원 입력이 있으면 지금은 범위에 맞춘 대기로 판단한다. 3분 미만이면 지금, 아니면 입력이 만료된 뒤부터 모델로 찾는다.
  // 유효 시간은 실제 시계로 재므로, 시연 시각으로는 at + (TTL - 실제 경과)에 끝난다.
  if (e && effectiveWait(hall, meal, at).waitMinutes < 3) return at
  const earliest = e ? at.getTime() + entryRemainingMs(e) : 0
  for (let ms = Math.max(at.getTime(), w.start.getTime(), earliest); ms < w.end.getTime(); ms += 5 * MIN) {
    if (waitAt(hall, meal, w.start, new Date(ms)) < 3) return new Date(ms)
  }
  return null
}

const seoulHm = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function hmParts(d: Date): { h: number; m: number } {
  const p = Object.fromEntries(seoulHm.formatToParts(d).map((x) => [x.type, x.value]))
  return { h: Number(p.hour), m: Number(p.minute) }
}

export function koreanTime(d: Date): string {
  const { h, m } = hmParts(d)
  return m === 0 ? `${h}시` : `${h}시 ${m}분`
}

function clock(d: Date): string {
  const { h, m } = hmParts(d)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 서관·신관은 주말·공휴일에 쉰다(평일에만 중식 운영). */
const isWestNewClosedToday = (at: Date) =>
  (['west', 'new'] as const).every((h) => getServiceStatus(h, 'lunch', at).kind === 'notToday')

type Tile = Venue['short']

/** 지금 이후 가장 먼저 시작하는 직원식당 배식 */
function nextService(at: Date): { meal: MealKey; opensAt: Date } | null {
  const nexts = HALLS.flatMap((h) => {
    const n = getNextService(h, at)
    return n ? [n] : []
  })
  nexts.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())
  return nexts[0] ?? null
}

const nextServiceLine = (n: { meal: MealKey; opensAt: Date }) =>
  `다음 배식은 ${MEAL_LABEL[n.meal]} ${clock(n.opensAt)}부터예요`

export function homeHeadline(at: Date): { title: string; detail: string | null; tiles: Tile[] } {
  const open = HALLS.flatMap((hall) => {
    const meal = getActiveMeal(hall, at)
    if (!meal || getServiceStatus(hall, meal, at).kind !== 'open') return []
    return [{ hall, meal, wait: effectiveWait(hall, meal, at).waitMinutes }]
  })

  if (open.length === 0) {
    const next = nextService(at)
    if (!next) return { title: '오늘은 배식 정보가 없어요', detail: null, tiles: ['동'] }
    const dishes = summary(getCourses(next.opensAt, 'east', next.meal))
    const detail = dishes ? `${MEAL_LABEL[next.meal]} 메뉴: ${dishes}` : null
    return { title: nextServiceLine(next), detail, tiles: ['동'] }
  }

  const best = open.reduce((a, b) => (b.wait < a.wait ? b : a))
  const name = VENUES[best.hall].label
  const title =
    best.wait < 2
      ? `지금은 ${name}이 바로 드실 수 있어요`
      : `지금은 ${name}이 가장 빨라요, 약 ${Math.round(best.wait)}분 기다려요`

  // 나머지 중 기다림이 있고 곧 한산해질 식당들을 식당 순서대로 잇는다
  const later = open.flatMap((o) => {
    if (o.hall === best.hall || o.wait < 3) return []
    const rec = recommendTime(o.hall, o.meal, at)
    return rec && rec.getTime() > at.getTime() ? [`${VENUES[o.hall].label}은 ${koreanTime(rec)}`] : []
  })
  let detail: string | null = null
  if (later.length > 0) {
    detail = `${later.join(', ')}부터 한산해질 것으로 보여요`
  } else if (open.length === 1 && best.hall === 'east' && isWestNewClosedToday(at)) {
    detail = '주말과 공휴일에는 동관만 운영해요'
  }
  return { title, detail, tiles: [VENUES[best.hall].short] }
}
