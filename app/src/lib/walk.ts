import { WALK_MINUTES } from '@/data/buildings'
import { DINING_HALLS } from '@/data/restaurants'
import type { BuildingId, DiningHallId } from '@/domain/types'
import { getActiveMeal, getServiceStatus } from '@/lib/hours'
import { effectiveWait } from '@/lib/status'

const MIN = 60_000

export interface HallOption {
  hall: DiningHallId
  walk: number
  arriveAt: Date
  waitOnArrival: number
  total: number
}

/** 근무 건물에서 직원식당까지 걸어서 걸리는 시간(분, 추정) */
export function walkMinutes(from: BuildingId, hall: DiningHallId): number {
  return WALK_MINUTES[from][hall]
}

/**
 * 지금 출발했을 때 식당별 총 소요(도보 + 도착 시각의 예상 대기).
 * 도착 시각에 배식 중인 식당만 넣고, 총 소요가 짧은 순(같으면 동관→서관→신관)으로 돌려준다.
 */
export function hallOptions(at: Date, from: BuildingId): HallOption[] {
  const opts = DINING_HALLS.flatMap((hall) => {
    const walk = walkMinutes(from, hall)
    const arriveAt = new Date(at.getTime() + walk * MIN)
    const meal = getActiveMeal(hall, arriveAt)
    if (!meal || getServiceStatus(hall, meal, arriveAt).kind !== 'open') return []
    const waitOnArrival = effectiveWait(hall, meal, arriveAt).waitMinutes
    return [{ hall, walk, arriveAt, waitOnArrival, total: walk + waitOnArrival }]
  })
  // Array.prototype.sort는 안정 정렬이라 동률이면 식당 순서를 지킨다
  return opts.sort((a, b) => a.total - b.total)
}

export function fastestHall(at: Date, from: BuildingId): HallOption | null {
  return hallOptions(at, from)[0] ?? null
}
