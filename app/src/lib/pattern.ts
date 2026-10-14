import type { DiningHallId, MealKey } from '@/domain/types'
import { formatMinutes, seoulMinutes } from '@/lib/format'
import { windowOn } from '@/lib/hours'
import { dayPopularity } from '@/lib/menu'
import { simulateQueue, type CongestionLevel } from '@/lib/queue'

export type DayLabel = '월' | '화' | '수' | '목' | '금' | '토' | '일'

export interface PatternSlot {
  /** 그 날 서울 시각 HH:MM */
  time: string
  waitMinutes: number
  level: CongestionLevel
}

export interface PatternRow {
  /** YYYY-MM-DD */
  date: string
  dayLabel: DayLabel
  slots: PatternSlot[]
}

/** 메뉴를 저장해 둔 주(월~일). 패턴은 이 주의 요일별 메뉴 인기도로 모델을 돌린 결과다. */
const WEEK: { date: string; dayLabel: DayLabel }[] = (
  ['월', '화', '수', '목', '금', '토', '일'] as const
).map((dayLabel, i) => ({ date: `2026-10-${String(12 + i).padStart(2, '0')}`, dayLabel }))

const MIN = 60_000

/**
 * 평소 혼잡 패턴: 저장 주간(2026-10-12~18) 중 그 식당·끼니가 운영되는 요일마다
 * 배식 창 전체를 stepMin 간격으로 나눠 예상 대기와 단계를 구한다. 모의 데이터라 결정적이다.
 */
export function weeklyPattern(hall: DiningHallId, meal: MealKey = 'lunch', stepMin = 10): PatternRow[] {
  return WEEK.flatMap(({ date, dayLabel }) => {
    const w = windowOn(hall, meal, date)
    if (!w) return []
    const popularity = dayPopularity(w.start, hall, meal)
    const slots: PatternSlot[] = []
    for (let ms = w.start.getTime(); ms < w.end.getTime(); ms += stepMin * MIN) {
      const at = new Date(ms)
      const { waitMinutes, level } = simulateQueue(hall, meal, at, popularity)
      slots.push({ time: formatMinutes(seoulMinutes(at)), waitMinutes, level })
    }
    return [{ date, dayLabel, slots }]
  })
}
