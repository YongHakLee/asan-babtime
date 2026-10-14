import { WEEK_MENU } from '@/data/menus/week-2026-10-12'
import { VENUES } from '@/data/restaurants'
import type { Course, DayMenu, MealKey, VenueId } from '@/domain/types'
import { seoulYmd } from '@/lib/hours'

export const MENU_WEEK_LABEL = '10월 3주차 메뉴 기준'

/** 서울 기준 요일 → 저장 주의 같은 요일 (월=0 … 일=6). */
export function getMenuForDate(at: Date): DayMenu {
  const [y, m, d] = seoulYmd(at).split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=일
  return WEEK_MENU[(dow + 6) % 7]
}

/** 식당의 메뉴. 서관·신관은 같은 메뉴 묶음(westNew)을 함께 쓴다. */
export function getCourses(at: Date, venue: VenueId, meal: MealKey): Course[] {
  return getMenuForDate(at).meals[VENUES[venue].menuGroup]?.[meal] ?? []
}

/** 첫 코스 첫 품목(주메뉴)의 인기도. 지정이 없거나 메뉴가 없으면 1.0. */
export function dayPopularity(at: Date, venue: VenueId, meal: MealKey): number {
  return getCourses(at, venue, meal)[0]?.items[0]?.popularity ?? 1
}

/** 앞 n개 품목명을 ", "로 잇는다. */
export function summary(courses: Course[], n = 2): string {
  return courses.flatMap((c) => c.items)
    .slice(0, n)
    .map((i) => i.name)
    .join(', ')
}
