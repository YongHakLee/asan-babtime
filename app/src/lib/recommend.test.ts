import { beforeEach, describe, expect, it } from 'vitest'

import { getServiceStatus } from '@/lib/hours'
import { setOverride } from '@/lib/override'

import { t } from '@/test/time'

import { forecast, homeHeadline, koreanTime, recommendTime } from './recommend'

describe('recommend', () => {
  beforeEach(() => localStorage.clear())
  it('Wednesday 12:20 headline', () => {
    const h = homeHeadline(t('2026-10-14T12:20'))
    expect(h.title).toBe('지금은 서관·신관이 바로 드실 수 있어요')
    expect(h.detail).toBe('동관은 13시 15분부터 한산해질 것으로 보여요')
    expect(h.tiles).toEqual(['서', '신'])
  })
  it('15:30 shows next service', () =>
    expect(homeHeadline(t('2026-10-14T15:30')).title).toBe('다음 배식은 석식 17:30부터예요'))
  it('03:00 shows breakfast', () =>
    expect(homeHeadline(t('2026-10-15T03:00')).title).toBe('다음 배식은 조식 06:00부터예요'))
  it('Saturday lunch mentions east only', () =>
    expect(homeHeadline(t('2026-10-17T12:20')).detail).toBe('주말과 공휴일에는 동관만 운영해요'))
  it('recommendTime is before closing and under 3 min', () => {
    const r = recommendTime('east', 'lunch', t('2026-10-14T12:20'))!
    expect(r.getTime()).toBeLessThan(t('2026-10-14T15:00').getTime())
  })
  it('forecast marks exactly one now bucket', () =>
    expect(forecast('east', 'lunch', t('2026-10-14T12:20')).filter((p) => p.isNow)).toHaveLength(1))

  it('queue override on east pushes the recommendation past its expiry', () => {
    const at = t('2026-10-14T12:20')
    setOverride('east', 'queue', at)
    const h = homeHeadline(at)
    expect(h.title).toBe('지금은 서관·신관이 바로 드실 수 있어요')
    const r = recommendTime('east', 'lunch', at)!
    expect(r.getTime()).toBeGreaterThanOrEqual(at.getTime() + 15 * 60_000)
    expect(h.detail).toMatch(/^동관은 .+부터 한산해질 것으로 보여요$/)
  })
  it('clear override on east: east wins the tie, no clearing detail', () => {
    const at = t('2026-10-14T12:20')
    setOverride('east', 'clear', at)
    const h = homeHeadline(at)
    expect(h.title).toBe('지금은 동관이 바로 드실 수 있어요')
    expect(h.detail).toBeNull()
  })
  it('fastest-wait branch', () =>
    expect(homeHeadline(t('2026-10-17T12:20')).title).toBe('지금은 동관이 가장 빨라요, 약 6분 기다려요'))
  it('recommendTime returns exactly at when already quiet', () => {
    const at = t('2026-10-14T12:20')
    expect(recommendTime('westNew', 'lunch', at)!.getTime()).toBe(at.getTime())
  })
  it('forecast covers the window in 10 minute buckets', () => {
    const at = t('2026-10-14T12:20')
    const f = forecast('east', 'lunch', at)
    const s = getServiceStatus('east', 'lunch', at)
    if (s.kind !== 'open') throw new Error('expected open')
    expect(f[0].time.getTime()).toBe(s.opensAt.getTime())
    f.slice(1).forEach((p, i) => expect(p.time.getTime() - f[i].time.getTime()).toBe(10 * 60_000))
    expect(f[f.length - 1].time.getTime()).toBeLessThan(s.closesAt.getTime())
  })
  it('formats whole hours without minutes', () => {
    expect(koreanTime(t('2026-10-14T13:00'))).toBe('13시')
    expect(koreanTime(t('2026-10-14T13:05'))).toBe('13시 5분')
  })
})
