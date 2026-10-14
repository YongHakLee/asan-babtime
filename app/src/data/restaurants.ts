import type { ServiceWindow, Venue, VenueId } from '@/domain/types'

export const VENUES: Record<VenueId, Venue> = {
  east: {
    id: 'east',
    name: '동관 직원식당',
    label: '동관',
    short: '동',
    building: '동관',
    floor: 'B1F',
    location: 'official',
    directions: '동관 지하 1층, 보호자식당과 같은 공간',
    map: { x: 280, y: 110 },
  },
  westNew: {
    id: 'westNew',
    name: '서관·신관 직원식당',
    label: '서관·신관',
    short: '서',
    building: '서관',
    floor: 'B1F',
    location: 'estimated',
    directions: '서관·신관 연결 통로 쪽(추정)',
    map: { x: 90, y: 100 },
  },
  boxLunch: {
    id: 'boxLunch',
    name: '간편식 도시락',
    label: '도시락',
    short: '도',
    building: '동관',
    floor: 'B1F',
    location: 'estimated',
    directions: '동관 B1F 직원식당 앞',
    map: { x: 260, y: 140 },
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
  { venue: 'westNew', meal: 'lunch', days: ['weekday'], start: '11:00', end: '14:00', displayNote: '주말·공휴일 운영하지 않음' },
  { venue: 'boxLunch', meal: 'lunch', days: ['weekday'], start: '11:00', end: '13:00', displayNote: '간편식 도시락 수령' },
]

export const TAKEOUT_HOURS = {
  east: '매일 06:00–19:40',
  westNew: '평일 조식 07:00–08:30, 중식 11:00–14:00',
}

/** YYYY-MM-DD. 10/5는 개천절 대체공휴일. */
export const HOLIDAYS: string[] = ['2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25']
