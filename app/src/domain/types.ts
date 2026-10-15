export type DiningHallId = 'east' | 'west' | 'new'
export type VenueId = DiningHallId | 'boxLunch'
/** 지도에 블록으로 그리는 건물 */
export type BuildingId = 'east' | 'west' | 'new' | 'eduResearch' | 'asanLife'
/** 메뉴 묶음. 서관·신관은 같은 메뉴(westNew)를 함께 쓴다. */
export type MenuGroupId = 'east' | 'westNew' | 'boxLunch'
export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'lateNight' | 'mobile'
export type DayKind = 'weekday' | 'saturday' | 'sundayOrHoliday'

export interface ServiceWindow {
  venue: VenueId
  meal: MealKey
  days: DayKind[]
  /** HH:MM */
  start: string
  /** HH:MM, start보다 작으면 다음날 */
  end: string
  displayNote?: string
}

export type ServiceStatus =
  | { kind: 'open'; opensAt: Date; closesAt: Date; minutesLeft: number }
  | { kind: 'before'; opensAt: Date; minutesUntil: number }
  | { kind: 'ended' }
  | { kind: 'notToday' }

export interface Venue {
  id: VenueId
  name: string
  label: string
  short: '동' | '서' | '신' | '도'
  menuGroup: MenuGroupId
  building: string
  floor: string
  location: 'official' | 'estimated'
  directions: string
  map: { x: number; y: number }
}

export type Allergen = 'egg' | 'milk' | 'wheat' | 'soy' | 'peanut' | 'shellfish' | 'fish' | 'pork' | 'beef' | 'chicken'

export interface MenuItem {
  name: string
  /** 기본 1.0 (모의) */
  popularity?: number
  /** 화면에서 "예시"로 표기 */
  allergens?: Allergen[]
  /** 화면에서 "예시"로 표기 */
  kcal?: number
}

export interface Course {
  /** 'A' | 'B' | '라이브코너(서관)' */
  label?: string
  items: MenuItem[]
}

export type ZoneId = 'green' | 'orange' | 'purple'

export interface TakeoutZone {
  zone: ZoneId
  /** '그린존' */
  name: string
  pick: 2 | 3 | 4
  groups: { label: string; items: string[]; eastOnly?: boolean }[]
}

export interface TakeoutDay {
  zones: TakeoutZone[]
}

export interface DayMenu {
  /** YYYY-MM-DD (저장된 날짜) */
  date: string
  meals: Partial<Record<MenuGroupId, Partial<Record<MealKey, Course[]>>>>
  takeout: TakeoutDay
}
