import type { DiningHallId, MealKey } from '@/domain/types'
import { getServiceStatus, seoulYmd } from '@/lib/hours'

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
  'westNew.lunch': { peak: '12:00', sigma: 25, base: 11, service: 12 },
}

/** FNV-1a 32-bit string hash. */
function fnv1a(s: string): number {
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

  const start = status.opensAt.getTime()
  const ymd = seoulYmd(status.opensAt) // 자정을 넘겨도 시작 날짜 기준
  const peak = new Date(`${ymd}T${model.peak}:00+09:00`).getTime()

  let q = 0
  for (let ms = start; ms < at.getTime(); ms += MIN) {
    const dm = (ms - peak) / MIN
    const noise = mulberry32(fnv1a(`${hall}|${ymd}|${Math.round((ms - start) / MIN)}`))
    const arrivals =
      model.base * popularity * Math.exp(-(dm * dm) / (2 * model.sigma * model.sigma)) * (0.9 + 0.2 * noise)
    q = Math.max(0, q + arrivals - model.service)
  }
  const waitMinutes = Math.round((q / model.service) * 10) / 10
  return { waitingPeople: Math.round(q), waitMinutes, level: levelForWait(waitMinutes) }
}
