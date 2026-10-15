import type { DiningHallId, MealKey } from '@/domain/types'
import { getServiceStatus } from '@/lib/hours'
import { dayPopularity } from '@/lib/menu'
import { simulateQueue, type CongestionLevel } from '@/lib/queue'

/** 직원 입력을 덧씌우기 전의 모델 예측. 배식 중이 아니면 여유 0분. */
export function modelWait(
  hall: DiningHallId,
  meal: MealKey,
  at: Date,
): { waitMinutes: number; level: CongestionLevel } {
  // 자정을 넘긴 야식은 시작한 날의 메뉴(인기도)를 쓴다
  const s = getServiceStatus(hall, meal, at)
  const day = s.kind === 'open' ? s.opensAt : at
  const sim = simulateQueue(hall, meal, at, dayPopularity(day, hall, meal))
  return { waitMinutes: sim.waitMinutes, level: sim.level }
}
