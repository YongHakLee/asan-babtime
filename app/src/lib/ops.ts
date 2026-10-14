import { DINING_HALLS as HALLS, VENUES } from '@/data/restaurants'
import type { DiningHallId, MealKey } from '@/domain/types'
import { formatMinutes, seoulMinutes } from '@/lib/format'
import { getActiveMeal, getServiceStatus, seoulYmd, windowOn } from '@/lib/hours'
import { dayPopularity, getCourses } from '@/lib/menu'
import { soldOutOn } from '@/lib/override'
import { getRating, mockLeftover, mockRating, type Rating } from '@/lib/prefs'
import { arrivalsSeries, simulateQueue } from '@/lib/queue'
import { MEAL_LABEL } from '@/lib/recommend'

/** 운영자 화면 계산. 모두 모의 데이터(시드 고정 모델 + 이 브라우저 입력)다. */

const MIN = 60_000
const DAY_MS = 86_400_000
const STEP_MIN = 10
const MEALS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'mobile', 'lateNight']
/** 예상 대기가 이 이상인 구간은 배식 라인 추가를 제안한다(상태 '혼잡' 경계와 같다). */
const LINE_WAIT_MIN = 10
/** 주메뉴 인기도가 이 이상이면 준비량 상향을 제안한다. */
const POPULAR = 1.2

const hm = (d: Date) => formatMinutes(seoulMinutes(d))

export interface ArrivalSlot {
  /** 구간 시작 HH:MM */
  time: string
  count: number
  /** `at`이 들어 있는 구간 */
  now?: true
  /** `at` 이후 구간(예측값) */
  future?: true
}

/**
 * 입장 추정을 보여 줄 끼니와 그 배식이 시작한 날: 지금 배식 중이고 모델이 있는 끼니,
 * 아니면 오늘 중식. 자정을 넘긴 야식은 시작한 날 기준이다.
 */
export function opsMeal(hall: DiningHallId, at: Date): { meal: MealKey; day: Date } {
  const active = getActiveMeal(hall, at)
  if (active) {
    const s = getServiceStatus(hall, active, at)
    if (s.kind === 'open' && arrivalsSeries(hall, active, s.opensAt, 1).length > 0) {
      return { meal: active, day: s.opensAt }
    }
  }
  return { meal: 'lunch', day: at }
}

/** 오늘 식당별 10분 단위 입장 추정(모델의 도착 인원 합). */
export function todayArrivals(at: Date): Record<DiningHallId, ArrivalSlot[]> {
  const step = STEP_MIN * MIN
  return Object.fromEntries(
    HALLS.map((hall) => {
      const { meal, day } = opsMeal(hall, at)
      const series = arrivalsSeries(hall, meal, day, dayPopularity(day, hall, meal), STEP_MIN)
      const slots = series.map(({ time, arrivals }): ArrivalSlot => {
        const t = time.getTime()
        const slot: ArrivalSlot = { time: hm(time), count: arrivals }
        if (t <= at.getTime() && at.getTime() < t + step) slot.now = true
        else if (t > at.getTime()) slot.future = true
        return slot
      })
      return [hall, slots]
    }),
  ) as Record<DiningHallId, ArrivalSlot[]>
}

export interface SoldOutEntry {
  hall: DiningHallId
  meal: MealKey
  course?: string
  /** "동관 석식 B" */
  label: string
  /** 입력한 화면 시각 HH:MM. 예전 형식으로 저장돼 시각이 없으면 비운다. */
  time?: string
}

/** 오늘 품절 입력. 최근 입력이 먼저. 자정을 넘긴 야식 배식 중이면 그 배식이 시작한 날 입력도 함께. */
export function soldOutLog(at: Date): SoldOutEntry[] {
  const dates = new Set([seoulYmd(at)])
  for (const hall of HALLS) {
    const meal = getActiveMeal(hall, at)
    const s = meal ? getServiceStatus(hall, meal, at) : null
    if (s?.kind === 'open') dates.add(seoulYmd(s.opensAt))
  }
  return [...dates]
    .flatMap((d) => soldOutOn(d))
    .reverse()
    .map(({ hall, meal, course, at: inputAt }) => ({
      hall,
      meal,
      course,
      label: [VENUES[hall].label, MEAL_LABEL[meal], course].filter(Boolean).join(' '),
      time: typeof inputAt === 'number' ? hm(new Date(inputAt)) : undefined,
    }))
}

type Leftover = Record<Rating['leftover'], number>

/** 합이 100이 되도록 정수 백분율로 나눈다(큰 나머지 순). */
function percentages(counts: Leftover): Leftover {
  const keys = ['none', 'some', 'much'] as const
  const total = keys.reduce((s, k) => s + counts[k], 0)
  if (total === 0) return { none: 0, some: 0, much: 0 }
  const raw = keys.map((k) => (counts[k] / total) * 100)
  const out = raw.map(Math.floor)
  const order = raw.map((r, i) => [r - out[i], i] as const).sort((a, b) => b[0] - a[0])
  for (let i = 0; i < 100 - out.reduce((s, x) => s + x, 0); i++) out[order[i][1]]++
  return { none: out[0], some: out[1], much: out[2] }
}

/**
 * 오늘 지금까지 시작한 배식의 별점 평균·건수와 남김 정도 비율(%).
 * 코스별 주메뉴의 시드 고정 모의값(mockRating·mockLeftover, 메뉴 화면과 같은 값)에
 * 이 브라우저에서 오늘 보낸 평가를 더한다. 서관·신관은 같은 메뉴라 한 번만 센다.
 */
export function satisfaction(at: Date): { avg: number; count: number; leftover: Leftover } {
  const ymd = seoulYmd(at)
  const mains = new Set<string>()
  for (const hall of HALLS) {
    for (const meal of MEALS) {
      const w = windowOn(hall, meal, ymd)
      if (!w || w.start > at) continue
      for (const c of getCourses(w.start, hall, meal)) if (c.items[0]) mains.add(c.items[0].name)
    }
  }

  let stars = 0
  let count = 0
  const left: Leftover = { none: 0, some: 0, much: 0 }
  for (const name of mains) {
    const r = mockRating(name)
    const share = mockLeftover(name)
    stars += r.avg * r.count
    count += r.count
    for (const k of ['none', 'some', 'much'] as const) left[k] += share[k] * r.count
  }
  for (const hall of HALLS) {
    for (const meal of MEALS) {
      const mine = getRating(`${ymd}:${hall}:${meal}`)
      // 형식이 다른 저장값(별점이 숫자가 아니거나 모르는 남김 정도)은 건너뛴다
      if (!mine || typeof mine.stars !== 'number' || !Number.isFinite(mine.stars)) continue
      if (!Object.hasOwn(left, mine.leftover)) continue
      stars += mine.stars
      count += 1
      left[mine.leftover] += 1
    }
  }

  return {
    avg: count === 0 ? 0 : Math.round((stars / count) * 10) / 10,
    count,
    leftover: percentages(left),
  }
}

/** 서울 기준 다음 날 0시. */
export function nextSeoulDay(at: Date): Date {
  const today = new Date(`${seoulYmd(at)}T12:00:00+09:00`)
  return new Date(`${seoulYmd(new Date(today.getTime() + DAY_MS))}T00:00:00+09:00`)
}

export interface PrepSuggestion {
  hall: DiningHallId
  /** 내일 중식을 운영하는지 */
  open: boolean
  /** 입장이 가장 많은 10분 구간의 시작 HH:MM. 운영하지 않으면 '' */
  peak: string
  /** 배식 창 전체 예상 이용 인원 */
  expected: number
  notes: string[]
}

/**
 * 내일 중식 준비 제안. 메뉴는 저장 주간의 같은 요일, 모델은 내일 날짜로 돌린다.
 * - 예상 대기 ≥ 10분인 10분 구간이 이어지면 한 줄: "{HH:MM}~{HH:MM} {식당} 배식 라인 추가 검토"
 *   (끝 시각은 마지막 구간의 끝)
 * - 첫 코스 첫 품목(주메뉴) 인기도 ≥ 1.2: "{식당} {품목} 준비량 상향 검토"
 */
export function tomorrowPrep(at: Date): PrepSuggestion[] {
  const day = nextSeoulDay(at)
  const step = STEP_MIN * MIN
  return HALLS.map((hall) => {
    const meal: MealKey = 'lunch'
    const label = VENUES[hall].label
    const popularity = dayPopularity(day, hall, meal)
    const series = arrivalsSeries(hall, meal, day, popularity, STEP_MIN)
    if (series.length === 0) return { hall, open: false, peak: '', expected: 0, notes: [] }

    const peak = series.reduce((a, b) => (b.arrivals > a.arrivals ? b : a))
    const expected = series.reduce((s, x) => s + x.arrivals, 0)

    const notes: string[] = []
    let runStart: Date | null = null
    series.forEach(({ time }, i) => {
      const busy = simulateQueue(hall, meal, time, popularity).waitMinutes >= LINE_WAIT_MIN
      if (busy && !runStart) runStart = time
      const last = i === series.length - 1
      if (runStart && (!busy || last)) {
        const end = busy ? new Date(time.getTime() + step) : time
        notes.push(`${hm(runStart)}~${hm(end)} ${label} 배식 라인 추가 검토`)
        runStart = null
      }
    })

    const main = getCourses(day, hall, meal)[0]?.items[0]
    if (main && (main.popularity ?? 1) >= POPULAR) notes.push(`${label} ${main.name} 준비량 상향 검토`)

    return { hall, open: true, peak: hm(peak.time), expected, notes }
  })
}
