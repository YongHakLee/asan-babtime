import type { DiningHallId, MealKey } from '@/domain/types'
import { dayPopularity } from '@/lib/menu'
import { getActiveOverride } from '@/lib/override'
import { simulateQueue, type CongestionLevel } from '@/lib/queue'

/** 모델 예측에 직원 입력(override)을 덧씌운 현재 대기. 훅과 홈 문장이 공유한다. */
export function effectiveWait(
  hall: DiningHallId,
  meal: MealKey,
  at: Date,
): { waitMinutes: number; level: CongestionLevel; source: 'model' | 'staff' } {
  const sim = simulateQueue(hall, meal, at, dayPopularity(at, hall, meal))
  const o = getActiveOverride(hall)
  if (o?.kind === 'queue') return { waitMinutes: Math.max(sim.waitMinutes, 5), level: 'queue', source: 'staff' }
  if (o?.kind === 'clear') return { waitMinutes: 0, level: 'ok', source: 'staff' }
  return { waitMinutes: sim.waitMinutes, level: sim.level, source: 'model' }
}
