import { WALK_MINUTES } from '@/data/buildings'
import { DINING_HALLS } from '@/data/restaurants'
import type { BuildingId, DiningHallId, MealKey } from '@/domain/types'
import { getActiveMeal, getNextService, getServiceStatus, seoulYmd } from '@/lib/hours'
import { effectiveWait } from '@/lib/status'

const MIN = 60_000
/** 도착하고 이만큼(분) 안에 배식을 시작하면 기다렸다 먹는 선택지로 넣는다(V2-R9) */
const OPENS_SOON_MINUTES = 30

export interface HallOption {
  hall: DiningHallId
  walk: number
  arriveAt: Date
  /** 줄을 서기 시작하는 시각. 배식 중이면 도착 시각, 곧 시작하면 배식 시작 시각 */
  ready: Date
  /** 도착해서 배식 시작까지 남은 시간(분). 도착 때 이미 배식 중이면 0 */
  untilOpen: number
  /** 줄을 서기 시작할 때(ready)의 예상 대기(분). 곧 시작하면 배식 시작 직후의 대기 */
  queueWait: number
  /** 도착한 뒤 먹기까지의 기다림(분): untilOpen + queueWait */
  waitOnArrival: number
  total: number
}

/** 근무 건물에서 직원식당까지 걸어서 걸리는 시간(분, 추정) */
export function walkMinutes(from: BuildingId, hall: DiningHallId): number {
  return WALK_MINUTES[from][hall]
}

/** 도착 시각에 먹을 수 있는 끼니와 줄을 서기 시작하는 시각. 배식 중이거나 같은 날 곧 시작할 때만. */
function servingOnArrival(hall: DiningHallId, arriveAt: Date): { meal: MealKey; ready: Date } | null {
  const active = getActiveMeal(hall, arriveAt)
  if (active && getServiceStatus(hall, active, arriveAt).kind === 'open') return { meal: active, ready: arriveAt }
  const next = getNextService(hall, arriveAt)
  if (!next || seoulYmd(next.opensAt) !== seoulYmd(arriveAt)) return null
  const s = getServiceStatus(hall, next.meal, arriveAt)
  if (s.kind !== 'before' || s.opensAt.getTime() - arriveAt.getTime() > OPENS_SOON_MINUTES * MIN) return null
  return { meal: next.meal, ready: s.opensAt }
}

/**
 * 지금 출발했을 때 식당별 총 소요(도보 + 도착 뒤 기다림).
 * 도착 시각에 배식 중이거나 30분 안에 배식을 시작하는 식당만 넣는다. 곧 시작하면
 * 시작까지 남은 시간에 시작 시각의 예상 대기를 더한다.
 * 총 소요(분, 반올림)가 짧은 순, 같으면 덜 걷는 순, 그래도 같으면 동관→서관→신관.
 */
export function hallOptions(at: Date, from: BuildingId): HallOption[] {
  const opts = DINING_HALLS.flatMap((hall) => {
    const walk = walkMinutes(from, hall)
    const arriveAt = new Date(at.getTime() + walk * MIN)
    const serving = servingOnArrival(hall, arriveAt)
    if (!serving) return []
    const { meal, ready } = serving
    const untilOpen = (ready.getTime() - arriveAt.getTime()) / MIN
    const queueWait = effectiveWait(hall, meal, ready).waitMinutes
    const waitOnArrival = untilOpen + queueWait
    return [{ hall, walk, arriveAt, ready, untilOpen, queueWait, waitOnArrival, total: walk + waitOnArrival }]
  })
  // 화면에 보이는 분 단위(반올림)로 비교한다: 초 단위 차이로 순위가 흔들리지 않게.
  // 같으면 덜 걷는 쪽, 그래도 같으면 안정 정렬이라 식당 순서를 지킨다
  return opts.sort((a, b) => Math.round(a.total) - Math.round(b.total) || a.walk - b.walk)
}

export function fastestHall(at: Date, from: BuildingId): HallOption | null {
  return hallOptions(at, from)[0] ?? null
}
