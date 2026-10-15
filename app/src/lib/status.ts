import type { DiningHallId, MealKey } from '@/domain/types'
import { modelWait } from '@/lib/model'
import { getActiveEntry } from '@/lib/override'
import type { CongestionLevel } from '@/lib/queue'

/** 모델 예측에 직원 입력(staffLog)을 덧씌운 현재 대기. 훅과 홈 문장이 공유한다. */
export function effectiveWait(
  hall: DiningHallId,
  meal: MealKey,
  at: Date,
): { waitMinutes: number; level: CongestionLevel; source: 'model' | 'staff' } {
  const m = modelWait(hall, meal, at)
  const e = getActiveEntry(hall)
  if (!e) return { ...m, source: 'model' }
  // 모델 대기를 직원이 고른 등급 범위로 맞춘다. 위끝 4.4·9.4는 반올림해도 다음 등급 숫자가 되지 않게 한 값.
  const w = m.waitMinutes
  const waitMinutes =
    e.level === 'ok'
      ? 0
      : e.level === 'mid'
        ? Math.min(Math.max(w, 2), 4.4)
        : e.level === 'queue'
          ? Math.min(Math.max(w, 5), 9.4)
          : Math.max(w, 10)
  return { waitMinutes, level: e.level, source: 'staff' }
}
