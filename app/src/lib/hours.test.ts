import { describe, expect, it } from 'vitest'
import { t } from '@/test/time'
import { dayKind, getActiveMeal, getNextService, getServiceStatus } from './hours'

describe('hours', () => {
  it('east lunch open at Wed 12:20', () => expect(getServiceStatus('east', 'lunch', t('2026-10-14T12:20'))).toMatchObject({ kind: 'open', minutesLeft: 160 }))
  it('late night spans midnight', () => expect(getServiceStatus('east', 'lateNight', t('2026-10-15T00:30')).kind).toBe('open'))
  it('uses Asia/Seoul for UTC-boundary instant', () => {
    expect(getServiceStatus('east', 'lateNight', new Date('2026-10-14T15:30:00Z')).kind).toBe('open')
    expect(dayKind(new Date('2026-10-16T15:30:00Z'))).toBe('saturday')
  })
  it('west and new lunch not served on Saturday', () => {
    expect(getServiceStatus('west', 'lunch', t('2026-10-17T12:00')).kind).toBe('notToday')
    expect(getServiceStatus('new', 'lunch', t('2026-10-17T12:00')).kind).toBe('notToday')
  })
  it('west and new both serve weekday lunch 11:00–14:00', () => {
    for (const hall of ['west', 'new'] as const) {
      expect(getServiceStatus(hall, 'lunch', t('2026-10-14T12:20'))).toMatchObject({
        kind: 'open',
        opensAt: t('2026-10-14T11:00'),
        closesAt: t('2026-10-14T14:00'),
      })
    }
  })
  it('weekday holiday: west/new closed, east until 14:00', () => {
    expect(getServiceStatus('west', 'lunch', t('2026-10-09T12:00')).kind).toBe('notToday')
    expect(getServiceStatus('new', 'lunch', t('2026-10-09T12:00')).kind).toBe('notToday')
    expect(getServiceStatus('east', 'lunch', t('2026-10-09T14:30')).kind).toBe('ended')
  })
  it('before opening reports minutes until', () => expect(getServiceStatus('east', 'lunch', t('2026-10-14T10:30'))).toMatchObject({ kind: 'before', minutesUntil: 30 }))
  it('active meal at 15:30 is null; next is dinner 17:30', () => {
    expect(getActiveMeal('east', t('2026-10-14T15:30'))).toBeNull()
    expect(getNextService('east', t('2026-10-14T15:30'))).toMatchObject({ meal: 'dinner' })
  })
  it('active meal at lunch', () => expect(getActiveMeal('east', t('2026-10-14T12:00'))).toBe('lunch'))
  it('next service crosses to next day', () => {
    expect(getNextService('new', t('2026-10-15T15:00'))).toMatchObject({ meal: 'lunch', opensAt: t('2026-10-16T11:00') })
  })
  it('dayKind', () => {
    expect(dayKind(t('2026-10-18T09:00'))).toBe('sundayOrHoliday')
    expect(dayKind(t('2026-10-17T09:00'))).toBe('saturday')
    expect(dayKind(t('2026-10-05T09:00'))).toBe('sundayOrHoliday')
  })
})
