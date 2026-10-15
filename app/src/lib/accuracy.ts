import { DINING_HALLS } from '@/data/restaurants'
import type { DiningHallId } from '@/domain/types'
import { dayKind, getServiceStatus, seoulYmd, windowOn } from '@/lib/hours'
import { modelWait } from '@/lib/model'
import { allStaffEntries } from '@/lib/override'
import { WEEK } from '@/lib/pattern'
import { fnv1a, peakOf, type CongestionLevel } from '@/lib/queue'

export type AccuracyHall = DiningHallId | 'all'

export interface Judged {
  hall: DiningHallId
  at: number
  staff: CongestionLevel
  model: CongestionLevel
  source: 'mock' | 'real'
}

const MIN = 60_000
const ORDER: CongestionLevel[] = ['ok', 'mid', 'queue', 'busy']

const weekdays = WEEK.map((w) => w.date).filter((ymd) => dayKind(new Date(`${ymd}T12:00:00+09:00`)) === 'weekday')

function hhmm(ms: number): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  )
  return `${p.hour}:${p.minute}`
}

/** 모델 등급에서 한 단계 어긋난 직원 등급(범위를 벗어나면 모델 그대로). */
function staffLevel(hall: DiningHallId, ymd: string, at: number, model: CongestionLevel): CongestionLevel {
  const u = fnv1a(`${hall}|${ymd}|${hhmm(at)}`) / 2 ** 32
  const peak = peakOf(hall, 'lunch')
  const nearPeak = peak !== null && Math.abs(at - new Date(`${ymd}T${peak}:00+09:00`).getTime()) <= 20 * MIN
  // 피크 부근에서는 모델이 낮게 보는 경우(직원이 더 혼잡하게 봄)가 많다
  const [upBelow, downBelow] = nearPeak ? [0.35, 0.4] : [0.08, 0.16]
  const i = ORDER.indexOf(model)
  const j = u < upBelow ? i + 1 : u < downBelow ? i - 1 : i
  return ORDER[j] ?? model
}

/** 저장 주간 평일 점심에 20분 간격(창 시작 +10분부터)으로 만든 모의 직원 입력. now 이후는 만들지 않는다. */
export function mockEntries(now: Date): Judged[] {
  const out: Judged[] = []
  for (const ymd of weekdays) {
    for (const hall of DINING_HALLS) {
      const w = windowOn(hall, 'lunch', ymd)
      if (!w) continue
      for (let ms = w.start.getTime() + 10 * MIN; ms < w.end.getTime() && ms <= now.getTime(); ms += 20 * MIN) {
        const model = modelWait(hall, 'lunch', new Date(ms)).level
        out.push({ hall, at: ms, staff: staffLevel(hall, ymd, ms, model), model, source: 'mock' })
      }
    }
  }
  return out
}

/** 모의 + 실제 입력(취소 제외, 저장 주간 평일 점심, now 이전), at 오름차순. */
export function judgedEntries(now: Date): Judged[] {
  const real: Judged[] = allStaffEntries()
    .filter(
      (e) =>
        e.cancelledAt === undefined &&
        e.at <= now.getTime() &&
        weekdays.includes(seoulYmd(new Date(e.at))) &&
        getServiceStatus(e.hall, 'lunch', new Date(e.at)).kind === 'open',
    )
    .map((e) => ({ hall: e.hall, at: e.at, staff: e.level, model: e.model.level, source: 'real' as const }))
  return [...mockEntries(now), ...real].sort((a, b) => a.at - b.at)
}

export interface AccuracySummary {
  total: number
  match: number
  under: number
  over: number
  matchPct: number
  underPct: number
  overPct: number
}

const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100))

/** under: 직원이 모델보다 더 혼잡하게 봄(모델이 낮게 예측), over: 반대. */
function tally(entries: Judged[]) {
  let match = 0
  let under = 0
  let over = 0
  for (const e of entries) {
    const d = ORDER.indexOf(e.staff) - ORDER.indexOf(e.model)
    if (d === 0) match++
    else if (d > 0) under++
    else over++
  }
  return { total: entries.length, match, under, over }
}

const forHall = (entries: Judged[], hall: AccuracyHall) =>
  hall === 'all' ? entries : entries.filter((e) => e.hall === hall)

export function accuracySummary(entries: Judged[], hall: AccuracyHall): AccuracySummary {
  const s = tally(forHall(entries, hall))
  return { ...s, matchPct: pct(s.match, s.total), underPct: pct(s.under, s.total), overPct: pct(s.over, s.total) }
}

export interface AccuracyBin {
  start: string
  end: string
  total: number
  match: number
  under: number
  over: number
  matchPct: number | null
  lowSample: boolean
}

const BIN_START = 11 * 60
const BIN_COUNT = 8
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** 11:00~15:00을 30분 8칸으로 나눈 일치율. 표본이 5건 미만이면 lowSample. */
export function accuracyBins(entries: Judged[], hall: AccuracyHall): AccuracyBin[] {
  const list = forHall(entries, hall)
  return Array.from({ length: BIN_COUNT }, (_, i) => {
    const from = BIN_START + i * 30
    const inBin = list.filter((e) => {
      const [h, m] = hhmm(e.at).split(':').map(Number)
      const min = h * 60 + m
      return min >= from && min < from + 30
    })
    const s = tally(inBin)
    return {
      start: fmt(from),
      end: fmt(from + 30),
      ...s,
      matchPct: s.total === 0 ? null : pct(s.match, s.total),
      lowSample: s.total > 0 && s.total < 5,
    }
  })
}
