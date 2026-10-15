import type { DiningHallId, MealKey } from '@/domain/types'
import { getServiceStatus, seoulYmd, windowOn } from '@/lib/hours'

export type CongestionLevel = 'ok' | 'mid' | 'queue' | 'busy'

export const LEVEL_LABEL: Record<CongestionLevel, string> = {
  ok: '여유',
  mid: '보통',
  queue: '줄 있음',
  busy: '혼잡',
}

export function levelForWait(minutes: number): CongestionLevel {
  if (minutes >= 10) return 'busy'
  if (minutes >= 5) return 'queue'
  if (minutes >= 2) return 'mid'
  return 'ok'
}

interface Model {
  /** HH:MM */
  peak: string
  sigma: number
  base: number
  service: number
}

const MODEL: Record<string, Model> = {
  'east.breakfast': { peak: '07:30', sigma: 35, base: 7, service: 12 },
  'east.lunch': { peak: '12:10', sigma: 28, base: 18, service: 14 },
  'east.dinner': { peak: '18:10', sigma: 25, base: 10, service: 12 },
  'east.lateNight': { peak: '23:50', sigma: 15, base: 5, service: 10 },
  'west.lunch': { peak: '12:05', sigma: 25, base: 9, service: 7 },
  'new.lunch': { peak: '12:00', sigma: 25, base: 6, service: 7 },
}

/** FNV-1a 32-bit string hash. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32: one draw from a 32-bit seed, in [0, 1). */
function mulberry32(seed: number): number {
  const a = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const MIN = 60_000

export function simulateQueue(
  hall: DiningHallId,
  meal: MealKey,
  at: Date,
  popularity: number,
): { waitingPeople: number; waitMinutes: number; level: CongestionLevel } {
  const none = { waitingPeople: 0, waitMinutes: 0, level: 'ok' as const }
  const model = MODEL[`${hall}.${meal}`]
  if (!model) return none
  const status = getServiceStatus(hall, meal, at)
  if (status.kind !== 'open') return none

  const arrivals = arrivalsFn(hall, model, status.opensAt, popularity)
  const start = status.opensAt.getTime()
  let q = 0
  for (let ms = start; ms < at.getTime(); ms += MIN) {
    q = Math.max(0, q + arrivals(ms) - model.service)
  }
  const waitMinutes = Math.round((q / model.service) * 10) / 10
  return { waitingPeople: Math.round(q), waitMinutes, level: levelForWait(waitMinutes) }
}

/**
 * 배식 창 안의 1분당 도착 인원(모의). 피크 중심 정규분포 × 인기도 × 시드 고정 잡음.
 * 시드는 식당·배식 시작 날짜·시작 후 경과 분이라 같은 날 같은 분은 늘 같은 값이다.
 */
function arrivalsFn(hall: DiningHallId, model: Model, opensAt: Date, popularity: number): (ms: number) => number {
  const start = opensAt.getTime()
  const ymd = seoulYmd(opensAt) // 자정을 넘겨도 시작 날짜 기준
  const peak = new Date(`${ymd}T${model.peak}:00+09:00`).getTime()
  return (ms) => {
    const dm = (ms - peak) / MIN
    const noise = mulberry32(fnv1a(`${hall}|${ymd}|${Math.round((ms - start) / MIN)}`))
    return model.base * popularity * Math.exp(-(dm * dm) / (2 * model.sigma * model.sigma)) * (0.9 + 0.2 * noise)
  }
}

/**
 * 그 날(서울) 시작하는 배식 창 전체를 stepMin 간격으로 나눈 구간별 도착 인원 합(반올림).
 * simulateQueue와 같은 공식·같은 시드라 대기 예측과 맞물린다. 그 날 운영하지 않으면 [].
 */
export function arrivalsSeries(
  hall: DiningHallId,
  meal: MealKey,
  day: Date,
  popularity: number,
  stepMin = 10,
): { time: Date; arrivals: number }[] {
  const model = MODEL[`${hall}.${meal}`]
  const w = windowOn(hall, meal, seoulYmd(day))
  if (!model || !w) return []
  const arrivals = arrivalsFn(hall, model, w.start, popularity)
  const out: { time: Date; arrivals: number }[] = []
  for (let from = w.start.getTime(); from < w.end.getTime(); from += stepMin * MIN) {
    let sum = 0
    for (let ms = from; ms < Math.min(from + stepMin * MIN, w.end.getTime()); ms += MIN) sum += arrivals(ms)
    out.push({ time: new Date(from), arrivals: Math.round(sum) })
  }
  return out
}

/** 그 식당·끼니의 모델 피크 시각 "HH:MM". 모델이 없으면 null. */
export function peakOf(hall: DiningHallId, meal: MealKey): string | null {
  return MODEL[`${hall}.${meal}`]?.peak ?? null
}
