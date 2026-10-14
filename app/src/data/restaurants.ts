import type { DiningHallId, MenuGroupId, ServiceWindow, Venue, VenueId } from '@/domain/types'

/** 직원식당 순서. 동률일 때도 이 순서를 따른다. */
export const DINING_HALLS: DiningHallId[] = ['east', 'west', 'new']

export const VENUES: Record<VenueId, Venue> = {
  east: {
    id: 'east',
    name: '동관 직원식당',
    label: '동관',
    short: '동',
    menuGroup: 'east',
    building: '동관',
    floor: 'B1F',
    location: 'official',
    directions: '동관 지하 1층, 보호자식당과 같은 공간',
    map: { x: 280, y: 110 },
  },
  west: {
    id: 'west',
    name: '서관 직원식당',
    label: '서관',
    short: '서',
    menuGroup: 'westNew',
    building: '서관',
    floor: 'B1F',
    location: 'estimated',
    directions: '서관 지하 1층(추정)',
    // 임시 좌표(지도는 Task 3에서 다시 그린다)
    map: { x: 110, y: 155 },
  },
  new: {
    id: 'new',
    name: '신관 직원식당',
    label: '신관',
    short: '신',
    menuGroup: 'westNew',
    building: '신관',
    floor: 'B1F',
    location: 'estimated',
    directions: '신관 지하 1층(추정)',
    // 임시 좌표(지도는 Task 3에서 다시 그린다)
    map: { x: 110, y: 42 },
  },
  boxLunch: {
    id: 'boxLunch',
    name: '간편식 도시락',
    label: '도시락',
    short: '도',
    menuGroup: 'boxLunch',
    building: '동관',
    floor: 'B1F',
    location: 'estimated',
    directions: '동관 B1F 직원식당 앞',
    map: { x: 246, y: 160 },
  },
}

const ALL: ServiceWindow['days'] = ['weekday', 'saturday', 'sundayOrHoliday']

export const SERVICE_WINDOWS: ServiceWindow[] = [
  { venue: 'east', meal: 'breakfast', days: ALL, start: '06:00', end: '09:00', displayNote: '조식 A·B' },
  { venue: 'east', meal: 'lunch', days: ['weekday', 'saturday'], start: '11:00', end: '15:00' },
  { venue: 'east', meal: 'lunch', days: ['sundayOrHoliday'], start: '11:00', end: '14:00' },
  { venue: 'east', meal: 'dinner', days: ALL, start: '17:30', end: '20:30', displayNote: 'A 17:30–19:40, B 17:30–품절 시' },
  { venue: 'east', meal: 'mobile', days: ALL, start: '21:30', end: '22:30', displayNote: '이동식' },
  { venue: 'east', meal: 'lateNight', days: ALL, start: '23:30', end: '01:00' },
  { venue: 'west', meal: 'lunch', days: ['weekday'], start: '11:00', end: '14:00', displayNote: '주말·공휴일 운영하지 않음' },
  { venue: 'new', meal: 'lunch', days: ['weekday'], start: '11:00', end: '14:00', displayNote: '주말·공휴일 운영하지 않음' },
  { venue: 'boxLunch', meal: 'lunch', days: ['weekday'], start: '11:00', end: '13:00', displayNote: '간편식 도시락 수령' },
]

/** 메뉴 묶음 이름과 그 메뉴를 내는 곳. 메뉴 비교 열·테이크아웃 매장에 쓴다. */
export const MENU_GROUPS: Record<MenuGroupId, { label: string; venues: VenueId[] }> = {
  east: { label: '동관', venues: ['east'] },
  westNew: { label: '서관·신관', venues: ['west', 'new'] },
  boxLunch: { label: '도시락', venues: ['boxLunch'] },
}

/** 테이크아웃 매장(원본 메뉴표대로 동관 / 서관·신관 두 곳) */
export const TAKEOUT_HOURS = {
  east: '매일 06:00–19:40',
  westNew: '평일 조식 07:00–08:30, 중식 11:00–14:00',
} satisfies Partial<Record<MenuGroupId, string>>

/** YYYY-MM-DD. 10/5는 개천절 대체공휴일. */
export const HOLIDAYS: string[] = ['2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25']
