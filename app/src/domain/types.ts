export type VenueId = 'east' | 'westNew' | 'boxLunch'
export type DiningHallId = 'east' | 'westNew'
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
  short: '동' | '서' | '도'
  building: string
  floor: string
  location: 'official' | 'estimated'
  directions: string
  map: { x: number; y: number }
}
