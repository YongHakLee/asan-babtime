import { HOLIDAYS, SERVICE_WINDOWS } from '@/data/restaurants'
import type { DayKind, MealKey, ServiceStatus, ServiceWindow, VenueId } from '@/domain/types'

const seoulFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Asia/Seoul calendar date as YYYY-MM-DD, independent of machine TZ. */
export function seoulYmd(d: Date): string {
  const p = Object.fromEntries(seoulFmt.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function kindOfYmd(ymd: string): DayKind {
  if (HOLIDAYS.includes(ymd)) return 'sundayOrHoliday'
  const [y, m, d] = ymd.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  if (dow === 0) return 'sundayOrHoliday'
  if (dow === 6) return 'saturday'
  return 'weekday'
}

export function dayKind(d: Date): DayKind {
  return kindOfYmd(seoulYmd(d))
}

const at = (ymd: string, hm: string) => new Date(`${ymd}T${hm}:00+09:00`)

/** Concrete start/end instants of a window that starts on the given Seoul date. */
function span(w: ServiceWindow, startYmd: string): { start: Date; end: Date } {
  const start = at(startYmd, w.start)
  const end = at(w.end < w.start ? addDays(startYmd, 1) : startYmd, w.end)
  return { start, end }
}

function windowsFor(venue: VenueId, startYmd: string, meal?: MealKey): ServiceWindow[] {
  const kind = kindOfYmd(startYmd)
  return SERVICE_WINDOWS.filter(
    (w) => w.venue === venue && (meal === undefined || w.meal === meal) && w.days.includes(kind),
  )
}

const minutes = (ms: number) => Math.ceil(ms / 60000)

export function getServiceStatus(venue: VenueId, meal: MealKey, now: Date): ServiceStatus {
  const today = seoulYmd(now)
  // 어제 시작해 자정을 넘기는 창도 검사
  for (const ymd of [addDays(today, -1), today]) {
    for (const w of windowsFor(venue, ymd, meal)) {
      const { start, end } = span(w, ymd)
      if (now >= start && now < end) {
        return { kind: 'open', opensAt: start, closesAt: end, minutesLeft: minutes(end.getTime() - now.getTime()) }
      }
    }
  }
  const todays = windowsFor(venue, today, meal)
  if (todays.length === 0) return { kind: 'notToday' }
  for (const w of todays) {
    const { start } = span(w, today)
    if (now < start) return { kind: 'before', opensAt: start, minutesUntil: minutes(start.getTime() - now.getTime()) }
  }
  return { kind: 'ended' }
}

export function getActiveMeal(venue: VenueId, now: Date): MealKey | null {
  const today = seoulYmd(now)
  for (const ymd of [addDays(today, -1), today]) {
    for (const w of windowsFor(venue, ymd)) {
      const { start, end } = span(w, ymd)
      if (now >= start && now < end) return w.meal
    }
  }
  return null
}

export function getNextService(venue: VenueId, now: Date): { meal: MealKey; opensAt: Date } | null {
  const today = seoulYmd(now)
  const limit = now.getTime() + 48 * 3600 * 1000
  let best: { meal: MealKey; opensAt: Date } | null = null
  for (let i = 0; i <= 2; i++) {
    const ymd = addDays(today, i)
    for (const w of windowsFor(venue, ymd)) {
      const { start } = span(w, ymd)
      if (start > now && start.getTime() <= limit && (!best || start < best.opensAt)) {
        best = { meal: w.meal, opensAt: start }
      }
    }
  }
  return best
}
