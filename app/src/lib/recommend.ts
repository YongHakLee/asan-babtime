import { VENUES } from '@/data/restaurants'
import type { DiningHallId, MealKey } from '@/domain/types'
import { getActiveMeal, getNextService, getServiceStatus } from '@/lib/hours'
import { dayPopularity, getCourses, summary } from '@/lib/menu'
import { simulateQueue } from '@/lib/queue'
import { effectiveWait } from '@/lib/status'

const MIN = 60_000
const HALLS: DiningHallId[] = ['east', 'westNew']
const MEAL_LABEL: Record<MealKey, string> = {
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
  for (let ms = Math.max(at.getTime(), w.start.getTime()); ms < w.end.getTime(); ms += 5 * MIN) {
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

function koreanTime(d: Date): string {
  const { h, m } = hmParts(d)
  return m === 0 ? `${h}시` : `${h}시 ${m}분`
}

function clock(d: Date): string {
  const { h, m } = hmParts(d)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type Tile = '동' | '서' | '신'
const TILES: Record<DiningHallId, Tile[]> = { east: ['동'], westNew: ['서', '신'] }

export function homeHeadline(at: Date): { title: string; detail: string | null; tiles: Tile[] } {
  const open = HALLS.flatMap((hall) => {
    const meal = getActiveMeal(hall, at)
    if (!meal || getServiceStatus(hall, meal, at).kind !== 'open') return []
    return [{ hall, meal, wait: effectiveWait(hall, meal, at).waitMinutes }]
  })

  if (open.length === 0) {
    const nexts = HALLS.flatMap((h) => {
      const n = getNextService(h, at)
      return n ? [n] : []
    })
    nexts.sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())
    const next = nexts[0]
    if (!next) return { title: '오늘은 배식 정보가 없어요', detail: null, tiles: ['동'] }
    const detail = summary(getCourses(next.opensAt, 'east', next.meal)) || null
    return {
      title: `다음 배식은 ${MEAL_LABEL[next.meal]} ${clock(next.opensAt)}부터예요`,
      detail,
      tiles: ['동'],
    }
  }

  const best = open.reduce((a, b) => (b.wait < a.wait ? b : a))
  const name = VENUES[best.hall].label
  const title =
    best.wait < 2
      ? `지금은 ${name}이 바로 드실 수 있어요`
      : `지금은 ${name}이 가장 빨라요, 약 ${Math.round(best.wait)}분 기다려요`

  let detail: string | null = null
  const other = open.find((o) => o.hall !== best.hall && o.wait >= 3)
  const rec = other ? recommendTime(other.hall, other.meal, at) : null
  if (other && rec) {
    detail = `${VENUES[other.hall].label}은 ${koreanTime(rec)}부터 한산해질 것으로 보여요`
  } else if (open.length === 1 && best.hall === 'east' && getServiceStatus('westNew', 'lunch', at).kind === 'notToday') {
    detail = '주말과 공휴일에는 동관만 운영해요'
  }
  return { title, detail, tiles: TILES[best.hall] }
}
